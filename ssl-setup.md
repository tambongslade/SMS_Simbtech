# SSL Certificate Setup with Certbot for ssiccmr.com

## Step 1: Install Certbot

```bash
# Update package list
sudo apt update

# Install Certbot and nginx plugin
sudo apt install certbot python3-certbot-nginx

# Verify installation
certbot --version
```

## Step 2: Deploy nginx Configuration

```bash
# Copy the nginx configuration to sites-available
sudo cp nginx-sms-simbtech.conf /etc/nginx/sites-available/ssiccmr.com

# Enable the site
sudo ln -s /etc/nginx/sites-available/ssiccmr.com /etc/nginx/sites-enabled/

# Remove default nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Step 3: Obtain SSL Certificate

**Important**: Make sure your domain (ssiccmr.com) is pointing to your VPS IP address before running this command.

```bash
# Obtain SSL certificate for both domain and www subdomain
sudo certbot --nginx -d ssiccmr.com -d www.ssiccmr.com

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to terms of service (Y)
# 3. Choose whether to share email with EFF (Y/N)
# 4. Certbot will automatically configure nginx
```

## Step 4: Verify SSL Configuration

```bash
# Check certificate status
sudo certbot certificates

# Test nginx configuration after SSL setup
sudo nginx -t

# Reload nginx to apply changes
sudo systemctl reload nginx
```

## Step 5: Test Your SSL Setup

1. **Browser Test**: Visit https://ssiccmr.com - should show secure connection
2. **HTTP Redirect**: Visit http://ssiccmr.com - should redirect to HTTPS
3. **SSL Labs Test**: https://www.ssllabs.com/ssltest/analyze.html?d=ssiccmr.com

## Step 6: Set Up Auto-Renewal

```bash
# Test automatic renewal
sudo certbot renew --dry-run

# Check renewal timer status
sudo systemctl status certbot.timer

# Enable auto-renewal (usually enabled by default)
sudo systemctl enable certbot.timer
```

## Troubleshooting

### Common Issues:

1. **Domain not pointing to server**:
   ```bash
   # Check DNS resolution
   nslookup ssiccmr.com
   dig ssiccmr.com
   ```

2. **Port 80/443 not accessible**:
   ```bash
   # Check firewall
   sudo ufw status
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **nginx configuration errors**:
   ```bash
   # Check nginx error logs
   sudo tail -f /var/log/nginx/error.log
   
   # Test configuration
   sudo nginx -t
   ```

4. **Certificate renewal fails**:
   ```bash
   # Check certbot logs
   sudo tail -f /var/log/letsencrypt/letsencrypt.log
   
   # Manual renewal
   sudo certbot renew --force-renewal
   ```

## Manual nginx Configuration (if Certbot doesn't auto-configure)

If Certbot doesn't automatically update your nginx config, you can manually verify the SSL block includes:

```nginx
# HTTPS server block should have:
server {
    listen 443 ssl http2;
    server_name ssiccmr.com www.ssiccmr.com;
    
    ssl_certificate /etc/letsencrypt/live/ssiccmr.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ssiccmr.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Your existing configuration...
}
```

## Security Best Practices

1. **HSTS Header**: Already included in config (`Strict-Transport-Security`)
2. **Security Headers**: All major security headers are configured
3. **Strong SSL Configuration**: Certbot provides modern SSL settings
4. **Regular Updates**: Keep certbot and nginx updated

## Certificate Information

- **Issuer**: Let's Encrypt
- **Validity**: 90 days (auto-renewed every 60 days)
- **Certificate Path**: `/etc/letsencrypt/live/ssiccmr.com/`
- **Renewal**: Automatic via systemd timer

Your SMS Simbtech application will be accessible securely at https://ssiccmr.com!
