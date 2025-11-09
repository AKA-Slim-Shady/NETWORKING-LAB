#!/bin/bash
export USER=$(whoami)

# --- Network 1 (Router Gi0/0 and PC1) ---
sudo ip link add name br1 type bridge
sudo ip link set br1 up
sudo ip tuntap add dev tap-r1 mode tap user $USER
sudo ip link set tap-r1 master br1
sudo ip link set tap-r1 up
sudo ip tuntap add dev tap-p1 mode tap user $USER
sudo ip link set tap-p1 master br1
sudo ip link set tap-p1 up

# --- Network 2 (Router Gi0/1 and PC2) ---
sudo ip link add name br2 type bridge
sudo ip link set br2 up
sudo ip tuntap add dev tap-r2 mode tap user $USER
sudo ip link set tap-r2 master br2
sudo ip link set tap-r2 up
sudo ip tuntap add dev tap-p2 mode tap user $USER
sudo ip link set tap-p2 master br2
sudo ip link set tap-p2 up

echo "--- Bridges Ready ---"
brctl show