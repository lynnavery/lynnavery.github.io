#!/bin/bash

# Kill any existing gunicorn processes
pkill gunicorn

# Create log directory if it doesn't exist
mkdir -p ~/logs/admin

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install/update requirements
pip install -r requirements.txt

# Start gunicorn with the new paths
cd /media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/public_html/event-admin
gunicorn --bind 127.0.0.1:5001 \
         --access-logfile ~/logs/admin/access.log \
         --error-logfile ~/logs/admin/error.log \
         --capture-output \
         --daemon \
         server:app 