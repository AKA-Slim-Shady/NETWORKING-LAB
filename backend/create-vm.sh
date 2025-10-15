#!/bin/bash
# This script's only job is to create a new overlay file.

# --- CONFIGURATION ---
BASE_IMAGE_PATH="/home/surya/Downloads/tinycore-base.qcow2"
OVERLAYS_DIR="./overlays"
# --- END CONFIGURATION ---

if [ -z "$1" ]; then
  echo "Error: No unique ID provided for overlay creation."
  exit 1
fi

NODE_ID=$1
OVERLAY_PATH="${OVERLAYS_DIR}/${NODE_ID}.qcow2"

echo "Creating new overlay at: ${OVERLAY_PATH}"
mkdir -p ${OVERLAYS_DIR}
qemu-img create -f qcow2 -o backing_fmt=qcow2 -b ${BASE_IMAGE_PATH} ${OVERLAY_PATH}

if [ $? -eq 0 ]; then
    echo "Overlay for ${NODE_ID} created successfully."
else
    echo "Error: Failed to create overlay for ${NODE_ID}."
    exit 1
fi