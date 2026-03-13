const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let overlayWindow = null;
let gatewayProcess = null;

const isDev = process.env.NODE_ENV === 'development';

const config = {
  port: process.env.PORT || 18789,
  host: process.env.HOST || '127.0.0.1'
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      // SECURITY: Enable context isolation
      contextIsolation: true,
      // SECURITY: Disable node integration
      nodeIntegration: false,
      // SECURITY: Disable remote module
      enableRemoteModule: false,
      // SECURITY: Use preload script
      preload: path.join(__dirname, 'preload.js'),
      // SECURITY: Disable web security in dev only
      webSecurity: !isDev,
      // SECURITY: Sandbox
      sandbox: true
    },
    show: false,
    frame: true,
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // SECURITY: Prevent navigation to external sites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  // SECURITY: Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 300,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    },
    show: false
  });

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  overlayWindow.setPosition(width - 320, height - 420);

  return overlayWindow;
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: '🦞 PersonalClaw', enabled: false },
    { type: 'separator' },
    { label: '🟢 Status: Active', enabled: false },
    { type: 'separator' },
    {
      label: '💬 Open Chat',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      }
    },
    {
      label: '📺 Screen Watch',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        if (mainWindow) {
          mainWindow.webContents.send('toggle-screen-watch', menuItem.checked);
        }
      }
    },
    {
      label: '🔕 Pause for 1 hour',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('pause-agent', 3600000);
        }
      }
    },
    { type: 'separator' },
    {
      label: '📊 Dashboard',
      click: () => {
        require('electron').shell.openExternal(`http://${config.host}:${config.port}`);
      }
    },
    {
      label: '⚙️ Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('show-settings');
        }
      }
    },
    {
      label: '📖 View Logs',
      click: () => {
        const logsPath = path.join(__dirname, '..', 'logs');
        require('electron').shell.openPath(logsPath);
      }
    },
    { type: 'separator' },
    {
      label: '🚪 Exit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('PersonalClaw - Your AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });

  return tray;
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Alt+C', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });

  globalShortcut.register('CommandOrControl+Alt+P', () => {
    if (mainWindow) {
      mainWindow.webContents.send('toggle-pause');
    }
  });

  globalShortcut.register('CommandOrControl+Alt+O', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        overlayWindow.hide();
      } else {
        overlayWindow.show();
      }
    } else {
      createOverlayWindow();
      overlayWindow.show();
    }
  });
}

function startGatewayServer() {
  const serverPath = path.join(__dirname, '..', 'src', 'gateway', 'server.js');
  
  gatewayProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, NODE_ENV: 'production' }
  });

  gatewayProcess.stdout.on('data', (data) => {
    console.log(`Gateway: ${data}`);
  });

  gatewayProcess.stderr.on('data', (data) => {
    console.error(`Gateway Error: ${data}`);
  });

  gatewayProcess.on('close', (code) => {
    console.log(`Gateway process exited with code ${code}`);
  });
}

// IPC Handlers
ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('toggle-overlay', () => {
  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow.show();
    }
  } else {
    createOverlayWindow();
    overlayWindow.show();
  }
});

ipcMain.on('send-notification', (event, { title, body }) => {
  const { Notification } = require('electron');
  new Notification({ title, body }).show();
});

ipcMain.handle('get-config', () => {
  return config;
});

// App lifecycle
app.whenReady().then(() => {
  console.log('🦞 PersonalClaw Desktop starting (SECURE MODE)...');

  startGatewayServer();
  createMainWindow();
  createOverlayWindow();
  createTray();
  registerGlobalShortcuts();

  console.log('✅ PersonalClaw Desktop ready (SECURE)!');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
