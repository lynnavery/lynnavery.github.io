# please call to book

A website for managing and displaying events.

## Setup

### Running the Main Site
```bash
# Start the main site server
./start-server.sh
```

### Running the Admin Interface

The admin interface requires a Flask server to be running. If you see "error loading events", follow these steps:

1. **Start the Admin Server:**
   ```bash
   # Option 1: Use the startup script
   ./start-admin.sh
   
   # Option 2: Manual startup
   cd admin
   pip3 install flask flask-cors python-dotenv GitPython
   python3 server.py
   ```

2. **Access the Admin Interface:**
   - Open http://localhost:5001 in your browser
   - The admin interface should now load events successfully

3. **Troubleshooting:**
   - If the server won't start, check that all dependencies are installed
   - Make sure port 5001 is not in use by another process
   - Check the console for any error messages

### File Structure
- `index.html` - Main site
- `events/` - Event data and pages
- `admin/` - Admin interface and server
- `generate_events.py` - Script to generate event pages

## Common Issues

### "Error loading events"
This error occurs when the Flask admin server is not running. The admin interface tries to fetch events from `http://localhost:5001/events`, but if the server isn't running, this request fails.

**Solution:** Start the admin server using the steps above.

### Server won't start
If the Flask server won't start, try:
1. Install dependencies: `pip3 install flask flask-cors python-dotenv GitPython`
2. Check for port conflicts: `lsof -i :5001`
3. Kill any existing processes: `lsof -ti:5001 | xargs kill -9`

## Development

The admin interface allows you to:
- Create new events
- Edit existing events
- Delete events
- Generate event pages
- Automatically commit changes to Git

Events are stored as JSON files in the `events/` directory and automatically generate HTML pages.