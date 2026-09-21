#!/bin/bash
# Deployment script for SMS Simbtech

echo "🚀 Starting SMS Simbtech deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart ssic-sms-ui

# Check PM2 status
pm2 status ssic-sms-ui

# Reload nginx
echo "🌐 Reloading nginx..."
sudo systemctl reload nginx

# Check nginx status
sudo systemctl status nginx --no-pager -l

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 status ssic-sms-ui
