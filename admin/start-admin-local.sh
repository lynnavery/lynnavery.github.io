#!/bin/bash

# Kill any existing Flask processes on port 5001
lsof -ti:5001 | xargs kill -9 2>/dev/null

# Create log directory if it doesn't exist
mkdir -p logs/admin

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install/update requirements
pip install -r requirements.txt

# Start Flask with SSL
export FLASK_APP=server.py
export FLASK_ENV=development
export FLASK_DEBUG=1
python3 server.py 