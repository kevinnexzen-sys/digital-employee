const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Setup wizard
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  skipSetup: () => ipcRenderer.invoke('skip-setup'),
  startApp: () => ipcRenderer.invoke('start-app'),
  
  // Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
  
  // Gateway communication
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  onMessage: (callback) => ipcRenderer.on('message', (event, data) => callback(data)),
  
  // System
  minimize: () => ipcRenderer.invoke('minimize'),
  maximize: () => ipcRenderer.invoke('maximize'),
  close: () => ipcRenderer.invoke('close'),
  
  // Notifications
  onNotification: (callback) => ipcRenderer.on('notification', (event, data) => callback(data))
});
