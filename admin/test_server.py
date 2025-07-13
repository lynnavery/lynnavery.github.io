#!/usr/bin/env python3

try:
    import flask
    print("Flask imported successfully")
except ImportError as e:
    print(f"Flask import error: {e}")
    exit(1)

try:
    import flask_cors
    print("Flask-CORS imported successfully")
except ImportError as e:
    print(f"Flask-CORS import error: {e}")
    exit(1)

try:
    import git
    print("GitPython imported successfully")
except ImportError as e:
    print(f"GitPython import error: {e}")
    exit(1)

try:
    from dotenv import load_dotenv
    print("python-dotenv imported successfully")
except ImportError as e:
    print(f"python-dotenv import error: {e}")
    exit(1)

print("All imports successful!")

# Try to import the server
try:
    import server
    print("Server module imported successfully")
except Exception as e:
    print(f"Server import error: {e}")
    exit(1)

print("Test completed successfully!") 