const express = require('express');
const { exec } = require('node:child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

let database = {};

app.get("/database", (req, res) => {
    res.json(database);
});

app.post("/nodes", function(req, res) {
    const newNodeId = uuidv4();
    const command = `./create-vm.sh ${newNodeId}`;

    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send("Failed to create overlay.");
        }
        console.log(`stdout:\n${stdout}`);
        console.error(`stderr:\n${stderr}`);

        database[newNodeId] = { "port": null, "status": "STOPPED", "pid": null };
        console.log(database);

        res.status(201).json({
            message: "Node created successfully!",
            nodeId: newNodeId
        });
    });
});

const USER_MAPPING_PATH = path.join(__dirname, '..', 'config', 'user-mapping.xml');


app.post("/nodes/:id/run", function(req, res) {
    const nodeId = req.params.id;
    const node = database[nodeId];

    if (!node) return res.status(404).json({ error: `Node with ID ${nodeId} not found.` });
    if (node.status === "RUNNING") return res.status(409).json({ error: "Node is already running." });

    const existingNodes = Object.values(database);
    let new_port = 0;

    for (let i = 5901; i < 7900; i++) {
        const isPortInUse = existingNodes.some(n => n.port === i);
        if (!isPortInUse) {
            new_port = i;
            break;
        }
    }

    if (new_port === 0) return res.status(503).send("Error: No available ports.");

    const command = `./run-vm.sh ${nodeId} ${new_port}`;
    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send("Failed to run VM.");
        }
        console.log(`stdout:\n${stdout}`);
        console.error(`stderr:\n${stderr}`);

        try {
            const pid = fs.readFileSync(`./overlays/${nodeId}.pid`, 'utf8').trim();
            
            node.port = new_port;
            node.status = "RUNNING";
            node.pid = pid;

            console.log("Updated Database:", database);

            // --- UPDATE user-mapping.xml ---
            let xmlData = fs.readFileSync(USER_MAPPING_PATH, 'utf8');

            // Remove any existing connection for this node
            xmlData = xmlData.replace(
                new RegExp(`<connection name="${nodeId}">[\\s\\S]*?</connection>`, 'g'),
                ''
            );

            // Insert new connection before </authorize>
            const connectionEntry = `
    <connection name="${nodeId}">
        <protocol>vnc</protocol>
        <param name="hostname">localhost</param>
        <param name="port">${new_port}</param>
        <param name="password"></param>
    </connection>`;
            
            xmlData = xmlData.replace('</authorize>', `${connectionEntry}\n</authorize>`);

            fs.writeFileSync(USER_MAPPING_PATH, xmlData, 'utf8');
            console.log(`user-mapping.xml updated for node ${nodeId}`);

            // Optional: Restart Guacamole container to pick up new connection
            exec('sudo docker-compose restart guacamole', (err, out, serr) => {
                if (err) console.error('Failed to restart Guacamole:', serr);
            });

            res.status(200).json({
                message: `Node ${nodeId} is now running.`,
                database_entry: node
            });

        } catch (readError) {
             console.error("Error reading PID file:", readError);
             res.status(500).send("VM started, but failed to read PID file.");
        }
    });
});

app.get("/nodes" , function(req , res){
    res.json(database);
});

app.post("/nodes/:id/stop" , function(req , res){
    const id = req.params.id;
    if(!id){
        return res.status(404).json(
            {
                "message" : "NO NODE WITH THAT ID EXISTS!"
            }
        );
    }
    if(id && database[id].status === "STOPPED"){
        return res.status(409).json(
            {
                "message" : "THIS NODE IS ALREADY STOPPED"
            }
        );
    }

    const pid = database[id].pid;

    const command = `kill ${pid}`;

    exec(command , function(error , stdout , stderr){
        if(error){
            return res.status(500).json(
                {
                    "message" : "UNABLE TO EXECUTE COMMAND TO KILL NODE!",
                    "error" : stderr
                }
            );
        }
        database[id].status = "STOPPED";
        database[id].port = null;
        database[id].pid = null;
        return res.status(200).json(
            {
                "message" : "THE NODE HAS BEEN STOPPED SUCCESSFULLY!",
                "stdout" : stdout
            }
        );
    });
});

app.post("/nodes/:id/wipe", function(req, res) {
    const id = req.params.id;
    const node = database[id];

    if (!node) {
        return res.status(404).json({
            "message": "NO NODE WITH THAT ID EXISTS!"
        });
    }

    const wipeNode = () => {
        const overlayPath = `./overlays/${id}.qcow2`;
        const pidPath = `./overlays/${id}.pid`;
        const command = `rm -f ${overlayPath} ${pidPath} && ./create-vm.sh ${id}`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    "message": "Failed to wipe and recreate overlay.",
                    "error": stderr
                });
            }

            node.status = "STOPPED";
            node.port = null;
            node.pid = null;

            return res.status(200).json({
                "message": `Node ${id} has been wiped successfully!`
            });
        });
    };

    if (node.status === "RUNNING") {
        const pid = node.pid;
        const command = `kill ${pid}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error stopping node during wipe: ${stderr}`);
            }
            wipeNode();
        });
    } else {
        wipeNode();
    }
});

app.listen(3000, function() {
    console.log("LISTENING ON PORT 3000!");
});

