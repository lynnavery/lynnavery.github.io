#!/bin/bash

# Kill any existing Flask processes on port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null

# Navigate to admin directory
cd admin

# Install requirements if needed
pip3 install flask flask-cors python-dotenv GitPython

# Start the server
echo "Starting admin server on http://localhost:5001"
python3 server.py 