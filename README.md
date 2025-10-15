# Virtual Network Lab — QEMU + Guacamole Prototype

### **Objective**
A minimal prototype to **create, manage, and access virtual nodes** using **QEMU disk overlays** and **Apache Guacamole**.

Frontend built with **React (Vite)** · Backend with **Node.js + Express** · Remote access via **Guacamole (Docker)**.

---

## Features

- **Add Node** — Creates a QEMU overlay image
- **Run Node** — Boots a VM with VNC enabled
- **Stop Node** — Gracefully shuts down the VM
- **Wipe Node** — Deletes overlay + PID file
- **Guacamole Integration** — Open VM console directly in browser
- **Docker Compose Setup** — One-command startup for Guacamole stack

---

## Architecture Overview

```
Frontend (React)
     ↓
Backend (Node.js/Express)
     ↓
QEMU (VMs with VNC)
     ↓
Guacamole (Docker → Web Console)
```

Each node has:
- An overlay image (`node_<id>.qcow2`)
- A PID file for process tracking
- A corresponding Guacamole VNC connection

---

## Prerequisites

Make sure you have the following installed:

| Tool | Version | Purpose |
|------|----------|----------|
| Docker & Docker Compose | latest | Run Guacamole |
| Node.js | v18+ | Run backend & frontend |
| QEMU / QEMU-KVM | latest | Run virtual nodes |
| qemu-img | latest | Manage overlay disks |

Install QEMU if not present:

```bash
sudo apt update
sudo apt install qemu qemu-kvm qemu-utils
```

---

## Setup Instructions

### **Clone the Repository**
```bash
git clone https://github.com/AKA-Slim-Shady/NETWORKING-LAB.git
cd NETWORKING-LAB
```

---

### **Guacamole User Mapping**

The backend requires a `user-mapping.xml` file for Guacamole to map nodes to VNC connections.  
Please run this below snippet correctly in order for the User-Mapping to happen (This is mandatory for Guacamole Login).

```bash
mkdir config
cd config
sudo bash -c "echo '<user-mapping>
  <authorize username=\"user\" password=\"password\">
  </authorize>
</user-mapping>' > user-mapping.xml"
```
Ensure the backend can read and write this file:

```bash
chmod 664 config/user-mapping.xml
```

This file is automatically updated by the backend when nodes are run.

---

### **Start Guacamole Stack (Docker)**
Run Guacamole:

```bash
sudo docker compose up -d
```

This will:
- Start **Guacamole web UI** → [http://localhost:8080/guacamole](http://localhost:8080/guacamole)
- Launch **guacd**
- Auto-provision default user ("user") with password : "password"

---

### **Start the Backend**
```bash
cd backend
npm install
npm start
```

This starts the **Node.js API** (default port: `3000`)  
Responsible for overlay creation, VM lifecycle, and Guacamole linking.

---

### **Start the Frontend**
```bash
cd Frontend
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)  
You’ll see the dashboard with all node controls.

---

## How to Use

| Action | Description |
|--------|--------------|
| **Add Node** | Creates a new overlay from `/images/base.qcow2` |
| **Run Node** | Starts VM with QEMU + VNC |
| **Stop Node** | Stops the VM process and keeps overlay |
| **Wipe Node** | Deletes overlay + PID file |
| **Click Running Node** | Opens browser console via Guacamole |

---

## File Structure

```
NETWORKING-LAB/
├── backend/
│   ├── overlays/          ← QEMU overlay images
│   ├── run-vm.sh          ← Script to launch QEMU
│   ├── create-vm.sh       ← Script to create overlay
│   ├── index.js           ← Express backend
│   ├── package.json
│   └── ...
│
├── Frontend/
│   ├── src/               ← React frontend
│   ├── package.json
│   └── vite.config.js
│
├── config/
│   └── user-mapping.xml   ← Guacamole user mapping
│
├── docker-compose.yml     ← Guacamole + MySQL stack
└── install_guacamole.sh   ← Optional setup script
```

---

## Cleanup & Reset

Stop and remove all containers:
```bash
sudo docker compose down
```

Remove all overlays and PIDs:
```bash
cd backend
rm -rf overlays/*.qcow2 pids/*.pid
```
Note : It is strongly recommended that you wipe all the running nodes before you close or reset the back-end server otherwise you will run into issues while assigning ports for the VMs. 
---

## Common Issues

| Problem | Fix |
|----------|------|
| **“Internal Error” on Guacamole** | Check if `guacd` container is running |
| **Port 5901 unavailable** | Run `sudo netstat -tulnp | grep 5901` and kill stale process |
| **Permission denied on overlays** | Ensure backend runs with correct user or `sudo` |
| **Black screen in Guacamole** | Confirm QEMU started with `-vnc :1` and correct IP/port mapping |

---
