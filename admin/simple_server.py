#!/usr/bin/env python3

from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Set the base directory for the application
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EVENTS_DIR = BASE_DIR / 'events'

@app.route('/test')
def test():
    return jsonify({'message': 'Server is running!'})

@app.route('/events', methods=['GET'])
def list_events():
    try:
        events = []
        if EVENTS_DIR.exists():
            for event_file in EVENTS_DIR.glob('*.json'):
                try:
                    with open(event_file, 'r') as f:
                        event_data = json.load(f)
                        event_data['filename'] = event_file.name
                        events.append(event_data)
                except Exception as e:
                    print(f"Error reading {event_file}: {e}")
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print(f"Starting server...")
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"EVENTS_DIR: {EVENTS_DIR}")
    print(f"EVENTS_DIR exists: {EVENTS_DIR.exists()}")
    app.run(port=5001, debug=True) 