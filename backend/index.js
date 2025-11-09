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
const OVERLAYS_DIR = './overlays'; // Defined for use in functions

/**
 * Utility: Sync user-mapping.xml with currently active nodes
 * @param {Object} db - In-memory database of nodes
 */
function updateUserMapping(db) {
    const header = `<user-mapping>\n  <authorize username="user" password="password">\n`;
    const footer = `  </authorize>\n</user-mapping>\n`;

    let connections = '';
    for (const [nodeId, node] of Object.entries(db)) {
        // --- FIX ---
        // Only map nodes that are RUNNING and have a port.
        if (node.status === "RUNNING" && node.port) {
            connections += `
    <connection name="${nodeId}">
        <protocol>vnc</protocol>
        <param name="hostname">localhost</param>
        <param name="port">${node.port}</param>
    </connection>\n`; // Removed empty <password> param
        }
    }

    fs.writeFileSync(USER_MAPPING_PATH, header + connections + footer, 'utf8');
    console.log('✅ user-mapping.xml synced.');

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

    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${stderr}`);
            return res.status(500).send("Failed to create overlay.");
        }

        database[newNodeId] = { port: null, status: "STOPPED", pid: null };
        console.log(database);

        res.status(201).json({
            message: "Node created successfully!",
            nodeId: newNodeId
        });
    });
});

/**
 * Runs a bash script to run the qemu-system-x86_64 .. command to start running the headless vm
 * @returns {Promise<void>} Returns a JSON of nodeID with status as Running
 */
// --- THIS IS THE CORRECTED RUN FUNCTION ---
app.post("/nodes/:id/run", (req, res) => {
    const nodeId = req.params.id;
    const node = database[nodeId];
    const { type, socketPort } = req.body; // Read from body

    if (!node) return res.status(404).json({ error: `Node with ID ${nodeId} not found.` });
    if (node.status === "RUNNING") return res.status(409).json({ error: "Node is already running." });

    // Find an available VNC port
    const existingNodes = Object.values(database);
    let new_port = 0;
    for (let i = 5901; i < 7900; i++) {
        if (!existingNodes.some(n => n.port === i)) {
            new_port = i;
            break;
        }
    }
    if (new_port === 0) return res.status(503).send("Error: No available ports.");

    if (type === undefined) {
         return res.status(400).json({ error: "Missing 'type' in body." });
    }
    
    let command = `./run-vm.sh ${nodeId} ${new_port} ${type}`;
    if (type === 0 || type === "0") { // If it's a PC, it needs the 4th argument
        if (socketPort === undefined) { // Check for undefined, 0 is valid
            return res.status(400).json({ error: "Missing 'socketPort' in body for PC node." });
        }
        command += ` ${socketPort}`;
    }

    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${stderr}`);
            return res.status(500).send("Failed to run VM.");
        }

        try {
            const pid = fs.readFileSync(path.join(OVERLAYS_DIR, `${nodeId}.pid`), 'utf8').trim();
            node.port = new_port;
            node.status = "RUNNING";
            node.pid = pid;

            console.log("Updated Database:", database);
            updateUserMapping(database);

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

/** Get list of all nodes */
app.get("/nodes", (req, res) => res.json(database));

/**
 * --- THIS IS THE FIXED STOP FUNCTION ---
 * It now ONLY stops the VM and removes the .pid file.
 * It NO LONGER deletes the overlay, preserving your settings.
 * @returns {Promise<void>} Returns a json with status of the VM having nodeId as Stopped
 */
app.post("/nodes/:id/stop", (req, res) => {
    const id = req.params.id;
    const node = database[id];

    if (!node) return res.status(404).json({ message: "No node with that ID exists!" });
    if (node.status === "STOPPED") return res.status(409).json({ message: "This node is already stopped." });

    console.log(`Stopping node ${id} (PID ${node.pid})...`);

    exec(`kill ${node.pid}`, (error, stdout, stderr) => {
        if (error) console.error("Kill error (continuing anyway):", stderr);

        const pidPath = path.join(OVERLAYS_DIR, `${id}.pid`);
        if (fs.existsSync(pidPath)) {
            fs.unlinkSync(pidPath); // Clean up the pid file
        }

        node.status = "STOPPED";
        node.port = null;
        node.pid = null;

        updateUserMapping(database); // Update Guacamole to remove the connection
        res.status(200).json({
            message: `Node ${id} stopped. Settings are preserved.`
        });
    });
});

/**
 * --- THIS IS THE FIXED WIPE FUNCTION ---
 * This is now the only destructive action. It stops the VM,
 * deletes the node from the database, and deletes its files.
 * @returns {Promise<void>} Returns JSON with msg indicating that VM has been wiped fully
 */
app.post("/nodes/:id/wipe", (req, res) => {
    const id = req.params.id;
    const node = database[id];

    if (!node) {
        return res.status(404).json({ message: "No node with that ID exists!" });
    }

    console.log(`Wiping node ${id}...`);
    const overlayPath = path.join(OVERLAYS_DIR, `${id}.qcow2`);
    const pidPath = path.join(OVERLAYS_DIR, `${id}.pid`);

    const finishWipe = () => {
        delete database[id]; // Delete from in-memory database
        exec(`rm -f ${overlayPath} ${pidPath}`, (err) => {
            if (err) console.error("Failed to delete overlay:", err);
            updateUserMapping(database);
            res.status(200).json({ message: `Node ${id} fully wiped and removed.` });
        });
    };

    if (node.status === "RUNNING" && node.pid) {
        exec(`kill ${node.pid}`, (error) => {
            if (error) console.error("Error stopping node before wipe:", error);
            finishWipe(); // Wipe it even if kill fails
        });
    } else {
        finishWipe(); // It's already stopped, just wipe it
    }
});

/** Starts listening on port 3000 */
app.listen(3000, () => console.log("LISTENING ON PORT 3000!"));