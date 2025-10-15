#!/bin/bash
# -------------------------------------------------------------------
# Apache Guacamole Native Installer (Ubuntu 24.04 Noble)
# -------------------------------------------------------------------
#  • Handles FreeRDP 3 + Tomcat 10 package updates
#  • Avoids build failures when run from a directory containing spaces
#  • Builds guacd + installs webapp (WAR)
#
# Usage:  sudo ./install_guacamole.sh
# -------------------------------------------------------------------

set -e

echo "=== Starting Apache Guacamole 1.5.3 Installation ==="

# -------------------------------------------------------------------
# [1/5] Update system & install dependencies
# -------------------------------------------------------------------
echo "[1/5] Installing build dependencies..."
apt-get update -y
apt-get install -y \
  build-essential dpkg-dev wget curl \
  freerdp3-dev libvncserver-dev libssh2-1-dev libtelnet-dev \
  libpango1.0-dev libossp-uuid-dev \
  libavcodec-dev libavutil-dev libavformat-dev \
  libcairo2-dev libjpeg-turbo8-dev libpng-dev \
  ghostscript libwebp-dev libwebsockets-dev libpulse-dev

# -------------------------------------------------------------------
# [2/5] Install Tomcat 10
# -------------------------------------------------------------------
echo "[2/5] Installing Tomcat 10 web server..."
apt-get install -y tomcat10 tomcat10-admin tomcat10-common

# -------------------------------------------------------------------
# [3/5] Download & build guacd
# -------------------------------------------------------------------
GUAC_VERSION="1.5.3"
BUILD_DIR="$(pwd)"
if [[ "$BUILD_DIR" == *" "* ]]; then
  echo "⚠️  Detected spaces in current path."
  echo "    Moving build to /tmp/guac-build to avoid libtool issues."
  BUILD_DIR="/tmp/guac-build"
  mkdir -p "$BUILD_DIR"
fi
cd "$BUILD_DIR"

echo "[3/5] Downloading Guacamole Server source..."
wget -q "https://dlcdn.apache.org/guacamole/${GUAC_VERSION}/source/guacamole-server-${GUAC_VERSION}.tar.gz" -O guacamole-server.tar.gz
tar -xzf guacamole-server.tar.gz
cd "guacamole-server-${GUAC_VERSION}"

echo "Configuring build..."
./configure --with-systemd-dir=/etc/systemd/system

echo "Compiling..."
make -j"$(nproc)"

echo "Installing..."
make install
ldconfig
cd ..
rm -rf "guacamole-server-${GUAC_VERSION}" guacamole-server.tar.gz
echo "✅ guacd build complete."

# -------------------------------------------------------------------
# [4/5] Install web application (WAR)
# -------------------------------------------------------------------
echo "[4/5] Installing Guacamole Web App..."
GUAC_WAR="guacamole-${GUAC_VERSION}.war"
wget -q "https://dlcdn.apache.org/guacamole/${GUAC_VERSION}/binary/${GUAC_WAR}" -O "$GUAC_WAR"
mkdir -p /etc/guacamole
mv "$GUAC_WAR" /etc/guacamole/guacamole.war

ln -sf /etc/guacamole/guacamole.war /var/lib/tomcat10/webapps/

# -------------------------------------------------------------------
# [5/5] Enable & start services
# -------------------------------------------------------------------
echo "[5/5] Starting services..."
systemctl daemon-reload
systemctl enable --now guacd
systemctl enable --now tomcat10

echo "=== Installation Complete! ==="
echo "Access Guacamole at:  http://localhost:8080/guacamole"
echo "Default login:  guacadmin / guacadmin"
echo "You’ll be prompted to change it on first login."
