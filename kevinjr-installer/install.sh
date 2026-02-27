#!/bin/bash

echo ""
echo "========================================"
echo "   KEVINJR INSTALLATION FOR MAC/LINUX"
echo "========================================"
echo ""
echo "Installing KevinJr - Your AI Companion"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "1. Go to https://nodejs.org"
    echo "2. Download and install the LTS version"
    echo "3. Restart your terminal"
    echo "4. Run this installer again"
    echo ""
    exit 1
fi

echo "[INFO] Node.js found! Proceeding with installation..."
echo ""

# Create KevinJr directory
INSTALL_DIR="$HOME/KevinJr"
if [ ! -d "$INSTALL_DIR" ]; then
    echo "[INFO] Creating KevinJr directory..."
    mkdir -p "$INSTALL_DIR"
fi

# Copy files
echo "[INFO] Copying KevinJr files..."
cp -r kevinjr-package/* "$INSTALL_DIR/"

# Install dependencies
echo "[INFO] Installing dependencies..."
cd "$INSTALL_DIR"
npm install

# Make start script executable
chmod +x "$INSTALL_DIR/start-kevinjr.sh"

# Create desktop shortcut (Linux)
if command -v xdg-user-dir &> /dev/null; then
    DESKTOP_DIR=$(xdg-user-dir DESKTOP)
    if [ -d "$DESKTOP_DIR" ]; then
        echo "[INFO] Creating desktop shortcut..."
        cat > "$DESKTOP_DIR/KevinJr Dashboard.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=KevinJr Dashboard
Comment=KevinJr AI Assistant Dashboard
Exec=$INSTALL_DIR/start-kevinjr.sh
Icon=$INSTALL_DIR/assets/kevinjr-icon.png
Terminal=false
Categories=Development;Utility;
EOF
        chmod +x "$DESKTOP_DIR/KevinJr Dashboard.desktop"
    fi
fi

# Create Applications menu entry (Linux)
if [ -d "$HOME/.local/share/applications" ]; then
    echo "[INFO] Creating applications menu entry..."
    cat > "$HOME/.local/share/applications/kevinjr-dashboard.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=KevinJr Dashboard
Comment=KevinJr AI Assistant Dashboard
Exec=$INSTALL_DIR/start-kevinjr.sh
Icon=$INSTALL_DIR/assets/kevinjr-icon.png
Terminal=false
Categories=Development;Utility;
EOF
fi

echo ""
echo "========================================"
echo "    INSTALLATION COMPLETE!"
echo "========================================"
echo ""
echo "KevinJr has been installed successfully!"
echo ""
echo "To start KevinJr:"
echo "1. Double-click the 'KevinJr Dashboard' shortcut on your desktop"
echo "2. Or run: $INSTALL_DIR/start-kevinjr.sh"
echo "3. Your browser will open automatically to the dashboard"
echo ""
echo "KevinJr will be available at: http://localhost:3001"
echo ""

