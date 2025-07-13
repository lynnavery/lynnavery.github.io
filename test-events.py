#!/usr/bin/env python3

import json
import os
from pathlib import Path

def test_events_loading():
    """Test if events can be loaded from the events directory"""
    
    # Set the base directory
    BASE_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
    EVENTS_DIR = BASE_DIR / 'events'
    
    print(f"BASE_DIR: {BASE_DIR}")
    print(f"EVENTS_DIR: {EVENTS_DIR}")
    print(f"EVENTS_DIR exists: {EVENTS_DIR.exists()}")
    
    if not EVENTS_DIR.exists():
        print("ERROR: Events directory does not exist!")
        return False
    
    events = []
    json_files = list(EVENTS_DIR.glob('*.json'))
    print(f"Found {len(json_files)} JSON files")
    
    for event_file in json_files:
        try:
            with open(event_file, 'r') as f:
                event_data = json.load(f)
                event_data['filename'] = event_file.name
                events.append(event_data)
                print(f"✓ Loaded {event_file.name}")
        except Exception as e:
            print(f"✗ Error loading {event_file.name}: {e}")
    
    print(f"\nTotal events loaded: {len(events)}")
    
    if events:
        print("\nSample event data:")
        print(json.dumps(events[0], indent=2))
    
    return len(events) > 0

if __name__ == '__main__':
    success = test_events_loading()
    if success:
        print("\n✓ Events loading test passed!")
    else:
        print("\n✗ Events loading test failed!")
        exit(1) 