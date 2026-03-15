const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Setup wizard
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  skipSetup: () => ipcRenderer.invoke('skip-setup'),
  startApp: () => ipcRenderer.invoke('start-app'),
  
  // Settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
  loadSettings: () => ipcRenderer.invoke('loadSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
  
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
