// SECURE PRELOAD SCRIPT - Electron Security Best Practice
const { contextBridge, ipcRenderer } = require('electron');

// Expose ONLY safe, specific APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  toggleOverlay: () => ipcRenderer.send('toggle-overlay'),
  
  // Notifications
  sendNotification: (title, body) => ipcRenderer.send('send-notification', { title, body }),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // Event listeners (one-way, safe)
  onToggleScreenWatch: (callback) => {
    ipcRenderer.on('toggle-screen-watch', (event, enabled) => callback(enabled));
  },
  onPauseAgent: (callback) => {
    ipcRenderer.on('pause-agent', (event, duration) => callback(duration));
  },
  onShowSettings: (callback) => {
    ipcRenderer.on('show-settings', () => callback());
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Log that preload is loaded
console.log('✅ Secure preload script loaded');
