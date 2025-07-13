#!/bin/bash

echo "=== Admin Server Diagnostic ==="
echo

# Check if we're in the right directory
if [ ! -f "admin/server.py" ]; then
    echo "❌ Error: admin/server.py not found. Make sure you're in the project root directory."
    exit 1
fi

echo "✅ Found admin/server.py"

# Check Python availability
if command -v python3 &> /dev/null; then
    echo "✅ Python3 is available"
else
    echo "❌ Python3 is not available"
    exit 1
fi

# Check Flask availability
if python3 -c "import flask" 2>/dev/null; then
    echo "✅ Flask is available"
else
    echo "❌ Flask is not available. Install with: pip3 install flask"
fi

# Check other dependencies
for dep in flask_cors python-dotenv GitPython; do
    if python3 -c "import $dep" 2>/dev/null; then
        echo "✅ $dep is available"
    else
        echo "❌ $dep is not available. Install with: pip3 install $dep"
    fi
done

# Check if port 5001 is in use
if lsof -i :5001 >/dev/null 2>&1; then
    echo "⚠️  Port 5001 is in use. You may need to kill existing processes:"
    echo "   lsof -ti:5001 | xargs kill -9"
else
    echo "✅ Port 5001 is available"
fi

# Test events loading
echo
echo "=== Testing Events Loading ==="
if python3 test-events.py; then
    echo "✅ Events can be loaded successfully"
else
    echo "❌ Events cannot be loaded"
fi

echo
echo "=== Next Steps ==="
echo "1. If all checks pass, start the server with: ./start-admin.sh"
echo "2. Open http://localhost:5001 in your browser"
echo "3. The admin interface should now load events without errors" 