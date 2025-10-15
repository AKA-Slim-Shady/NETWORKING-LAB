const express = require('express');
const { exec } = require('node:child_process');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let database = {}; 
const USER_MAPPING_PATH = path.join(__dirname, '..', 'config', 'user-mapping.xml');

function updateUserMapping(db) {
    const header = `<user-mapping>\n  <authorize username="user" password="password">\n`;
    const footer = `  </authorize>\n</user-mapping>\n`;

    let connections = '';

    for (const [nodeId, node] of Object.entries(db)) {
        if (!node.port) continue; // only include running nodes
        connections += `
    <connection name="${nodeId}">
      <protocol>vnc</protocol>
      <param name="hostname">localhost</param>
      <param name="port">${node.port}</param>
      <param name="password"></param>
    </connection>\n`;
    }

    const xml = header + connections + footer;
    fs.writeFileSync(USER_MAPPING_PATH, xml, 'utf8');
    console.log('user-mapping.xml synced with current database.');

    // Restart Guacamole so it reloads connections
    exec('sudo docker-compose restart guacamole', (err, out, serr) => {
        if (err) console.error('Failed to restart Guacamole:', serr);
    });
}


/**
 * @returns {Promise<void>} Returns the In-Memory Database Object
 */
app.get("/database", (req, res) => res.json(database));


/**
 * Creates the overlay image named after a unique ID.
 * @returns {Promise<void>} Returns the uniqueID as JSON upon success!
 */
app.post("/nodes", (req, res) => {
    const newNodeId = uuidv4();
    const command = `./create-vm.sh ${newNodeId}`;
    console.log(`Executing: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error creating overlay: ${stderr}`);
            return res.status(500).send("Failed to create overlay.");
        }

        database[newNodeId] = { port: null, status: "STOPPED", pid: null };
        console.log("Node created:", newNodeId);
        res.status(201).json({ message: "Node created successfully!", nodeId: newNodeId });
    });
});


/**
 * Runs a bash script to run the qemu-system-x86_64 .. command to start running the headless vm
 * @returns {Promise<void>} Returns a JSON of nodeID with status as Running
 */
app.post("/nodes/:id/run", (req, res) => {
    const nodeId = req.params.id;
    const node = database[nodeId];
    if (!node) return res.status(404).send("Node not found.");
    if (node.status === "RUNNING") return res.status(409).send("Already running.");

    const usedPorts = Object.values(database).map(n => n.port);
    let port = 5901;
    while (usedPorts.includes(port)) port++;

    const command = `./run-vm.sh ${nodeId} ${port}`;
    console.log(`Running: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Run error: ${stderr}`);
            return res.status(500).send("Failed to start VM.");
        }

        try {
            const pid = fs.readFileSync(`./overlays/${nodeId}.pid`, 'utf8').trim();
            node.port = port;
            node.pid = pid;
            node.status = "RUNNING";

            updateUserMapping(database);

            res.json({ message: `Node ${nodeId} is now running.`, node });
        } catch (err) {
            console.error("Error reading PID:", err);
            res.status(500).send("Started, but PID read failed.");
        }
    });
});


/**
 * Stopping the VM here means that the old overlay file is deleted and a new one is recreated for a fresh start
 * @returns {Promise<void>} Returns a json with status of the VM having nodeId as Stopped
 */
app.post("/nodes/:id/stop", (req, res) => {
    const nodeId = req.params.id;
    const node = database[nodeId];
    if (!node) return res.status(404).send("Node not found.");
    if (node.status === "STOPPED") return res.status(409).send("Already stopped.");

    console.log(`Stopping node ${nodeId}...`);
    exec(`kill ${node.pid}`, (error) => {
        if (error) console.error("Kill error:", error);

        // Delete old overlay and recreate new one
        const overlay = `./overlays/${nodeId}.qcow2`;
        const pidPath = `./overlays/${nodeId}.pid`;

        exec(`rm -f ${overlay} ${pidPath} && ./create-vm.sh ${nodeId}`, (err) => {
            if (err) console.error("Overlay recreation failed:", err);

            node.status = "STOPPED";
            node.port = null;
            node.pid = null;

            updateUserMapping(database);
            res.json({ message: `Node ${nodeId} stopped and overlay recreated.` });
        });
    });
});


/**
 * Completely removes the overlay image and updates the in memory database and the XML file (this is done to ensure that the user-mapping.xml file is updated properly and doesnt have old VM information present in it)
 * @returns {Promise<void>} Returns JSON with msg indicating that VM has been wiped fully
 */
app.post("/nodes/:id/wipe", (req, res) => {
    const nodeId = req.params.id;
    const node = database[nodeId];
    if (!node) return res.status(404).send("Node not found.");

    console.log(`Wiping node ${nodeId}...`);
    const overlay = `./overlays/${nodeId}.qcow2`;
    const pidPath = `./overlays/${nodeId}.pid`;

    const finishWipe = () => {
        delete database[nodeId];
        exec(`rm -f ${overlay} ${pidPath}`, (err) => {
            if (err) console.error("Failed to delete overlay:", err);
            updateUserMapping(database);
            res.json({ message: `Node ${nodeId} wiped completely.` });
        });
    };

    if (node.status === "RUNNING" && node.pid) {
        exec(`kill ${node.pid}`, (error) => {
            if (error) console.error("Kill before wipe failed:", error);
            finishWipe();
        });
    } else {
        finishWipe();
    }
});

/**
 * Starts listening on port 3000
 */
app.listen(3000, () => console.log("Backend running on port 3000"));
