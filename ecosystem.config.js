module.exports = {
  apps: [{
    name: 'ssic-sms-ui',
    script: './node_modules/.bin/next',
    args: 'start -p 3060',
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
