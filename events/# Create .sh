# Create .env file in the admin directory
cat > /media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/public_html/event-admin/.env << 'EOL'
# Admin password for the event editor
ADMIN_PASSWORD=radio

# Flask secret key for session security
FLASK_SECRET_KEY=$(openssl rand -hex 32)

# Set Flask to production mode
FLASK_ENV=production
EOL

# Make sure the .env file is not readable by others
chmod 600 /media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/public_html/event-admin/.env

# Add .env to .gitignore if it's not already there
echo ".env" >> /media/sdi1/ephemera/www/ephemera.steropes.feralhosting.com/public_html/event-admin/.gitignore