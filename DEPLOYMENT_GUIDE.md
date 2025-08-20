# SMS Simbtech Deployment Guide

## Prerequisites on VPS
- Node.js 18+ installed
- nginx installed
- PM2 installed globally (`npm install -g pm2`)
- Git installed

## Step 1: Build and Transfer Files

### On Local Machine:
```bash
# Build the application
npm run build

# Create a production tarball (excluding node_modules)
tar -czf sms-simbtech.tar.gz --exclude=node_modules --exclude=.git .
```

### Transfer to VPS:
```bash
# Upload to your VPS (replace with your server details)
scp sms-simbtech.tar.gz user@your-server-ip:/var/www/
```

## Step 2: Setup on VPS

### Extract and Install Dependencies:
```bash
# SSH into your VPS
ssh user@your-server-ip

# Navigate to web directory
cd /var/www

# Extract files
sudo tar -xzf sms-simbtech.tar.gz -C SMS_Simbtech/

# Set proper ownership
sudo chown -R $USER:$USER /var/www/SMS_Simbtech

# Navigate to project directory
cd SMS_Simbtech

# Install production dependencies
npm ci --only=production

# Build if not already built
npm run build
```

## Step 3: PM2 Configuration

Create PM2 ecosystem file:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'sms-simbtech',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/SMS_Simbtech',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3060
    }
  }]
}
```

### Start with PM2:
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 4: nginx Configuration

Create nginx server block:

```nginx
# /etc/nginx/sites-available/sms-simbtech
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    # Redirect HTTP to HTTPS (optional but recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    # SSL Configuration (you'll need to obtain SSL certificates)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;
    
    # For now, comment out SSL and use HTTP only:
    listen 80;
    # Comment out the SSL lines above for initial setup
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Main location block - proxy to Next.js
    location / {
        proxy_pass http://localhost:3060;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location /_next/static {
        alias /var/www/SMS_Simbtech/.next/static;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
    
    # Public files
    location /public {
        alias /var/www/SMS_Simbtech/public;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Favicon
    location /favicon.ico {
        alias /var/www/SMS_Simbtech/public/favicon.ico;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### Enable the site:
```bash
# Create symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/sms-simbtech /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Step 5: Environment Variables

Create production environment file:
```bash
# Create .env.local for production
cat > /var/www/SMS_Simbtech/.env.local << EOF
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
# Add other environment variables as needed
EOF
```

## Step 6: Firewall Configuration

```bash
# Allow HTTP and HTTPS traffic
sudo ufw allow 80
sudo ufw allow 443

# Optionally, if you want direct access to the app (not recommended for production)
# sudo ufw allow 3060
```

## Step 7: SSL Certificate (Recommended)

### Using Let's Encrypt (Certbot):
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 8: Monitoring and Maintenance

### PM2 Commands:
```bash
# Check application status
pm2 status

# View logs
pm2 logs sms-simbtech

# Restart application
pm2 restart sms-simbtech

# Stop application
pm2 stop sms-simbtech

# Monitor in real-time
pm2 monit
```

### nginx Commands:
```bash
# Check nginx status
sudo systemctl status nginx

# Restart nginx
sudo systemctl restart nginx

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Step 9: Deployment Script (Optional)

Create a deployment script for future updates:

```bash
#!/bin/bash
# deploy.sh

echo "Starting deployment..."

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Restart PM2 process
pm2 restart sms-simbtech

# Reload nginx
sudo systemctl reload nginx

echo "Deployment completed!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

## Troubleshooting

### Common Issues:

1. **Port 3060 already in use:**
   ```bash
   sudo lsof -i :3060
   sudo kill -9 <PID>
   ```

2. **nginx 502 Bad Gateway:**
   - Check if Next.js app is running: `pm2 status`
   - Check nginx error logs: `sudo tail -f /var/log/nginx/error.log`

3. **Permission issues:**
   ```bash
   sudo chown -R $USER:$USER /var/www/SMS_Simbtech
   ```

4. **Build errors:**
   - Ensure all dependencies are installed
   - Check Node.js version compatibility
   - Review build logs: `npm run build`

## Security Considerations

1. **Keep software updated:**
   ```bash
   sudo apt update && sudo apt upgrade
   npm audit fix
   ```

2. **Configure firewall properly**
3. **Use HTTPS in production**
4. **Regular backups**
5. **Monitor logs for suspicious activity**

## Performance Optimization

1. **Enable gzip compression** (included in nginx config)
2. **Set up proper caching headers** (included in nginx config)
3. **Use CDN for static assets** (optional)
4. **Monitor resource usage:** `pm2 monit`

Your SMS Simbtech application should now be accessible via your domain/IP address!
