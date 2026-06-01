const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting SMS Simbtech Desktop App in Development Mode...');

// Set environment for development
process.env.NODE_ENV = 'development';
process.env.ELECTRON_IS_DEV = 'true';

// Start Next.js dev server and Electron concurrently
const devProcess = spawn('npm', ['run', 'electron-dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

devProcess.on('close', (code) => {
  console.log(`Development server exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  devProcess.kill('SIGTERM');
});