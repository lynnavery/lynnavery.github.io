from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import subprocess
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime
import git

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='..', static_url_path='')

# Configure CORS for local development
CORS(app, resources={
    r"/*": {
        "origins": ["http://127.0.0.1:5001", "http://localhost:5001", "http://127.0.0.1:8080", "http://localhost:8080"],
        "supports_credentials": True,
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Set the base directory for the application (local development)
BASE_DIR = Path(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EVENTS_DIR = BASE_DIR / 'events'

def commit_and_push_changes(message):
    """Commit and push changes to GitHub using SSH."""
    try:
        # Initialize git repository
        repo = git.Repo(BASE_DIR)
        
        # Configure Git to use SSH
        with repo.git.custom_environment(GIT_SSH_COMMAND='ssh -i ~/.ssh/id_ed25519'):
            # Check if we have changes
            if not repo.is_dirty():
                return True, "No changes to commit"
            
            # Get the current branch
            current_branch = repo.active_branch.name
            
            # Add all changes
            repo.index.add(['events/*', '*.html'])
            
            # Create commit
            try:
                commit = repo.index.commit(message)
                print(f"Created commit: {commit.hexsha}")
            except git.exc.GitCommandError as e:
                if "nothing to commit" in str(e):
                    return True, "No changes to commit"
                raise
            
            # Push changes
            try:
                origin = repo.remote(name='origin')
                push_info = origin.push(current_branch)
                print(f"Push info: {push_info}")
                
                # Check if push was successful
                for info in push_info:
                    if info.flags & git.PushInfo.ERROR:
                        return False, f"Error pushing to {current_branch}: {info.summary}"
                
                return True, f"Changes committed and pushed to {current_branch}"
            except git.exc.GitCommandError as e:
                return False, f"Error pushing changes: {str(e)}"
                
    except git.exc.InvalidGitRepositoryError:
        return False, "Not a valid Git repository"
    except git.exc.NoSuchPathError:
        return False, "Repository path does not exist"
    except Exception as e:
        return False, f"Error committing changes: {str(e)}"

@app.route('/')
def serve_editor():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'editor.html')

@app.route('/editor.html')
def serve_editor_html():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'editor.html')

@app.route('/style.css')
def serve_style():
    return send_from_directory(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'style.css')

@app.route('/admin/admin.css')
def serve_admin_style():
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), 'admin.css')

@app.route('/<path:path>')
def serve_static(path):
    if path == 'editor.html':
        return send_from_directory(os.path.dirname(os.path.abspath(__file__)), path)
    return send_from_directory(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), path)

@app.route('/events', methods=['GET'])
def list_events():
    try:
        events = []
        for event_file in EVENTS_DIR.glob('*.json'):
            with open(event_file, 'r') as f:
                event_data = json.load(f)
                # Add filename to the event data
                event_data['filename'] = event_file.name
                # Add formatted date for sorting
                try:
                    date_obj = datetime.strptime(event_data['date'], '%A %B %d, %Y')
                    event_data['sort_date'] = date_obj.strftime('%Y-%m-%d')
                except:
                    event_data['sort_date'] = '0000-00-00'  # Invalid dates sort last
                events.append(event_data)
        
        # Sort events by date
        events.sort(key=lambda x: x['sort_date'])
        return jsonify(events)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events/<filename>', methods=['DELETE'])
def delete_event(filename):
    try:
        if not filename.endswith('.json'):
            return jsonify({'error': 'Invalid filename format'}), 400
        
        event_path = EVENTS_DIR / filename
        if not event_path.exists():
            return jsonify({'error': 'Event not found'}), 404
        
        # Delete the JSON file
        event_path.unlink()
        
        # Delete the corresponding HTML file if it exists
        html_path = EVENTS_DIR / filename.replace('.json', '.html')
        if html_path.exists():
            html_path.unlink()
        
        # Regenerate the main page
        subprocess.run(['python3', 'generate_events.py'], 
                      capture_output=True, text=True, cwd=str(BASE_DIR))
        
        # Commit and push changes
        success, message = commit_and_push_changes(f"Delete event: {filename}")
        if not success:
            return jsonify({'warning': message}), 200  # Still return 200 since the delete was successful
        
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/events/<filename>', methods=['GET'])
def get_event(filename):
    try:
        # Handle both .json and .html extensions
        if not (filename.endswith('.json') or filename.endswith('.html')):
            return jsonify({'error': 'Invalid filename format'}), 400
        
        # For HTML files, serve them directly
        if filename.endswith('.html'):
            return send_from_directory(EVENTS_DIR, filename)
        
        # For JSON files, return the data
        event_path = EVENTS_DIR / filename
        if not event_path.exists():
            return jsonify({'error': 'Event not found'}), 404
        
        with open(event_path, 'r') as f:
            event_data = json.load(f)
        
        return jsonify(event_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save', methods=['POST'])
def save_event():
    try:
        data = request.json
        filename = data['filename']
        event_data = data['data']
        
        # Validate the event data
        required_fields = ['date', 'artists', 'venue']
        for field in required_fields:
            if field not in event_data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate filename format (YYYY-MM-DD.json)
        if not filename.endswith('.json'):
            return jsonify({'error': 'Invalid filename format'}), 400
        
        # Save the event data
        EVENTS_DIR.mkdir(exist_ok=True)
        
        with open(EVENTS_DIR / filename, 'w') as f:
            json.dump(event_data, f, indent=4)
        
        # Generate pages
        result = subprocess.run(['python3', 'generate_events.py'], 
                              capture_output=True, text=True, cwd=str(BASE_DIR))
        
        if result.returncode != 0:
            return jsonify({'error': f'Generator script failed: {result.stderr}'}), 500
        
        # Commit and push changes
        success, message = commit_and_push_changes(f"Update event: {filename}")
        if not success:
            return jsonify({'warning': message}), 200  # Still return 200 since the save was successful
        
        return jsonify({'success': True, 'message': message})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate_pages():
    try:
        # Run the generator script from the correct directory
        result = subprocess.run(['python3', 'generate_events.py'], 
                              capture_output=True, text=True, cwd=str(BASE_DIR))
        
        if result.returncode != 0:
            return jsonify({'error': f'Generator script failed: {result.stderr}'}), 500
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # In development, run without SSL
    app.run(port=5001, debug=True) 