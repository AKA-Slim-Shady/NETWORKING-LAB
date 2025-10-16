#!/bin/bash
# setup-permissions.sh
# This script fixes permissions for the NETWORKING-LAB project so Node can read/write config files.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Config directory and file
CONFIG_DIR="$REPO_DIR/config"
USER_MAPPING_FILE="$CONFIG_DIR/user-mapping.xml"

echo "Setting ownership to current user: $USER"
sudo chown -R "$USER":"$USER" "$CONFIG_DIR"

echo "Setting permissions for config directory and user-mapping.xml..."
chmod 755 "$CONFIG_DIR"
chmod 644 "$USER_MAPPING_FILE"

echo "Permissions and ownership updated successfully!"
