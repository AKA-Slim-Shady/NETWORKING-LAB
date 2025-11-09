#!/bin/bash
# This script's only job is to run an existing VM.

# --- CONFIGURATION ---
OVERLAYS_DIR="./overlays"
# --- END CONFIGURATION ---

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
  echo "Error: Node ID, Port, or Type (0/1) not provided."
  exit 1
fi

NODE_ID=$1
FULL_PORT=$2
NODE_TYPE=$3 
OVERLAY_PATH="${OVERLAYS_DIR}/${NODE_ID}.qcow2"

# Calculate the VNC display number from the full port
DISPLAY_NUM=$((FULL_PORT - 5900))

# Explicitly tell QEMU to listen on address 0.0.0.0 (all interfaces)
VNC_CONFIG="0.0.0.0:${DISPLAY_NUM}"

echo "Attempting to launch VM for ${NODE_ID} (Type ${NODE_TYPE}) on VNC config ${VNC_CONFIG}..."

# --- START OF CORRECTED IF BLOCK ---

if [ "$NODE_TYPE" -eq 0 ]; then
    # This is the "PC" command (Type 0)
    
    # Check for the 4th argument (socket port)
    CONNECT_PORT=$4
    if [ -z "$CONNECT_PORT" ]; then
        echo "Error: PC (Type 0) needs a 4th argument: the socket port to connect to (e.g., 12345)."
        exit 1
    fi
    
    echo "Launching as PC (Type 0) -> connecting to 127.0.0.1:${CONNECT_PORT}..."
    qemu-system-x86_64 \
        -enable-kvm \
        -m 512M \
        -drive file=${OVERLAY_PATH},format=qcow2 \
        -vnc ${VNC_CONFIG} \
        -device e1000,netdev=net0 \
        -netdev socket,id=net0,connect=127.0.0.1:${CONNECT_PORT} \
        -daemonize \
        -pidfile "${OVERLAYS_DIR}/${NODE_ID}.pid"

elif [ "$NODE_TYPE" -eq 1 ]; then
    # This is the "Router" command (Type 1)
    echo "Launching as Router (Type 1) -> listening on :12345 and :12346..."
    qemu-system-x86_64 \
        -enable-kvm \
        -m 1G \
        -drive file="/home/surya/Desktop/NEW PROJ/router-vm.qcow2",format=qcow2 \
        -vnc ${VNC_CONFIG} \
        -device e1000,netdev=net0 \
        -netdev socket,id=net0,listen=:12345 \
        -device e1000,netdev=net1 \
        -netdev socket,id=net1,listen=:12346 \
        -daemonize \
        -pidfile "${OVERLAYS_DIR}/${NODE_ID}.pid"
else
    echo "Error: Unknown node type '$NODE_TYPE'. Must be 0 or 1."
    exit 1
fi

# --- END OF CORRECTED IF BLOCK ---


if [ $? -eq 0 ]; then
    echo "VM for ${NODE_ID} launched successfully."
else
    echo "Error: Failed to launch VM for ${NODE_ID}."
    exit 1
fi