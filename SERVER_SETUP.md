# Server Setup Guide

## Starting the Server

1. Make sure you're in the project directory:
   ```bash
   cd lynnavery.github.io
   ```

2. Run the start script:
   ```bash
   ./start-server.sh
   ```

The server will start and be available at:
- https://127.0.0.1:8080 (localhost)
- https://192.168.1.242:8080 (local network)

## If You Need to Generate New SSL Certificates

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

## Troubleshooting

If you get a certificate error in your browser:
1. The certificates are self-signed, so you'll need to accept the security warning
2. Make sure the certificates exist in `~/ssl-certs/`
3. Check that the `start-server.sh` script has execute permissions (`chmod +x start-server.sh`)

## Notes
- The server uses HTTPS for secure connections
- Certificates are stored in `~/ssl-certs/` to keep them out of Git
- The server runs on port 8080
- CORS is disabled by default
- Directory listings are enabled 