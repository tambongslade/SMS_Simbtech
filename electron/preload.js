const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // File operations (for future use - exports, etc.)
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  
  // System info
  platform: process.platform,
  isElectron: true
});

// Handle errors
window.addEventListener('DOMContentLoaded', () => {
  console.log('SMS Simbtech Desktop App loaded');
});

// Expose some useful properties
contextBridge.exposeInMainWorld('app', {
  name: 'SMS Simbtech',
  version: process.env.npm_package_version || '1.0.0',
  platform: process.platform
});