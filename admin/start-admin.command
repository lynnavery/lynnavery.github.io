#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Kill any existing server processes
pkill -f "python3.*server.py" || true

# Start the server in the background
./start-admin-local.sh &

# Wait a moment for the server to start
sleep 2

# Open the browser
open "http://localhost:5001/editor.html"

# Keep the terminal window open
echo "Admin server is running at http://localhost:5001/editor.html"
echo "Press Ctrl+C to stop the server"
wait 