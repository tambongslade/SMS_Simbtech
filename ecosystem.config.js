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
