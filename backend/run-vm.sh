#!/bin/bash
# This script's only job is to run an existing VM.

# --- CONFIGURATION ---
OVERLAYS_DIR="./overlays"
# --- END CONFIGURATION ---

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Error: Node ID or Port not provided."
  exit 1
fi

NODE_ID=$1
FULL_PORT=$2
OVERLAY_PATH="${OVERLAYS_DIR}/${NODE_ID}.qcow2"

# Calculate the VNC display number from the full port
DISPLAY_NUM=$((FULL_PORT - 5900))

# Explicitly tell QEMU to listen on address 0.0.0.0 (all interfaces)
VNC_CONFIG="0.0.0.0:${DISPLAY_NUM}"

echo "Attempting to launch VM for ${NODE_ID} on VNC config ${VNC_CONFIG}..."

qemu-system-x86_64 \
    -enable-kvm \
    -m 1G \
    -drive file=${OVERLAY_PATH},format=qcow2 \
    -net nic -net user \
    -vnc ${VNC_CONFIG} \
    -daemonize \
    -pidfile "${OVERLAYS_DIR}/${NODE_ID}.pid"

if [ $? -eq 0 ]; then
    echo "VM for ${NODE_ID} launched successfully."
else
    echo "Error: Failed to launch VM for ${NODE_ID}."
    exit 1
fi