# Server Configuration Guide

This document describes the server configurations for both local development and production environments.

## Local Development Server

The local development server runs on your machine for testing and development.

### Starting the Local Server

1. Make sure you're in the project directory:
   ```bash
   cd lynnavery.github.io
   ```

2. Run the start script:
   ```bash
   ./start-server.sh
   ```

The server will be available at:
- https://127.0.0.1:8080 (localhost)
- https://192.168.1.242:8080 (local network)

### SSL Certificates for Local Development

1. Create the SSL certificates directory (if it doesn't exist):
   ```bash
   mkdir -p ~/ssl-certs
   ```

2. Generate new certificates:
   ```bash
   openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 \
     -keyout ~/ssl-certs/key.pem \
     -out ~/ssl-certs/cert.pem \
     -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
   ```

3. Set proper permissions:
   ```bash
   chmod 600 ~/ssl-certs/*.pem
   ```

## Production Server (Feral Hosting)

The production server is hosted on Feral Hosting at `ephemera.steropes.feralhosting.com`.

### Server Structure

```
/media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/
├── public_html/           # Web root directory
│   ├── event-admin/      # Admin interface
│   │   ├── server.py     # Flask application
│   │   ├── editor.html   # Admin interface
│   │   └── venv/         # Python virtual environment
│   └── video/            # Video storage
└── logs/                 # Log files
    ├── admin/            # Admin interface logs
    └── nginx/            # Nginx logs
```

### Admin Interface Setup

1. **Virtual Environment**:
   ```bash
   cd ~/www/ephemera.steropes.feralhosting.com/public_html/event-admin
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Variables**:
   Create a `.env` file in the admin directory with:
   ```
   ADMIN_PASSWORD=your_secure_password
   FLASK_SECRET_KEY=your_secret_key
   FLASK_ENV=production
   ```

3. **Starting the Admin Server**:
   ```bash
   ./start-admin.sh
   ```
   This will:
   - Kill any existing Gunicorn processes
   - Create log directories
   - Activate the virtual environment
   - Install/update requirements
   - Start Gunicorn on port 5001

### Nginx Configuration

The Nginx configuration should include:

```nginx
# Admin interface
location /ephemera/event-admin {
    proxy_pass http://127.0.0.1:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Script-Name /ephemera/event-admin;
}

# Video serving
location /video {
    alias /media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/public_html/video;
    autoindex off;
    add_header Cache-Control "public, max-age=31536000";
}
```

### Log Files

- Admin access logs: `~/logs/admin/access.log`
- Admin error logs: `~/logs/admin/error.log`
- Nginx access logs: `~/logs/nginx/admin_access.log`
- Nginx error logs: `~/logs/nginx/admin_error.log`

### Troubleshooting

1. **Check Nginx Status**:
   ```bash
   nginx -t  # Test configuration
   nginx -s status  # Check status
   ```

2. **Check Gunicorn**:
   ```bash
   ps aux | grep gunicorn  # Check if running
   tail -f ~/logs/admin/error.log  # Monitor errors
   ```

3. **Common Issues**:
   - If the admin interface isn't accessible, check:
     - Nginx is running
     - Gunicorn is running on port 5001
     - Environment variables are set
     - Log files for specific errors

### Security Notes

1. The admin interface is protected by:
   - HTTPS only
   - Session-based authentication
   - Secure cookie settings
   - CORS restrictions to the main domain

2. Video files are:
   - Served via HTTP
   - Publicly accessible
   - Cached for performance

### Maintenance

1. **Updating the Application**:
   ```bash
   cd ~/www/ephemera.steropes.feralhosting.com/public_html/event-admin
   git pull
   source venv/bin/activate
   pip install -r requirements.txt
   ./start-admin.sh
   ```

2. **Log Rotation**:
   - Logs are automatically rotated by the system
   - Check log sizes periodically
   - Clear old logs if needed

3. **Backup**:
   - Regular backups of the application code
   - Backup of environment variables
   - Backup of video files 