const { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { setupSettingsIPC } = require('./settings-ipc.js');

let mainWindow = null;
let setupWindow = null;
let tray = null;
let overlayWindow = null;
let gatewayProcess = null;

const isDev = process.env.NODE_ENV === 'development';
const envPath = path.join(__dirname, '..', '.env');

function checkEnvExists() {
  return fs.existsSync(envPath);
}

function createSetupWindow() {
  setupWindow = new BrowserWindow({
    width: 800,
    height: 900,
    resizable: false,
    frame: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#667eea'
  });

  setupWindow.loadFile(path.join(__dirname, 'renderer', 'setup.html'));

  setupWindow.on('closed', () => {
    setupWindow = null;
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev,
      sandbox: true
    },
    show: false,
    frame: true,
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startGatewayServer();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show PersonalClaw',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      }
    },
    {
      label: 'Settings',
      click: () => {
        // TODO: Open settings page
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('PersonalClaw AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function startGatewayServer() {
  if (gatewayProcess) return;

  const serverPath = path.join(__dirname, '..', 'src', 'index.js');
  
  gatewayProcess = spawn('node', [serverPath], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env }
  });

  gatewayProcess.stdout.on('data', (data) => {
    console.log(`Gateway: ${data}`);
  });

  gatewayProcess.stderr.on('data', (data) => {
    console.error(`Gateway Error: ${data}`);
  });

  gatewayProcess.on('close', (code) => {
    console.log(`Gateway process exited with code ${code}`);
    gatewayProcess = null;
  });
}

// IPC Handlers
ipcMain.handle('save-config', async (event, config) => {
  try {
    // Convert config object to .env format
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, envContent, 'utf8');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('skip-setup', async () => {
  // Create empty .env file
  fs.writeFileSync(envPath, '# PersonalClaw Configuration\n# Add your API keys here\n', 'utf8');
  
  if (setupWindow) {
    setupWindow.close();
  }
  createMainWindow();
  return { success: true };
});

ipcMain.handle('start-app', async () => {
  if (setupWindow) {
    setupWindow.close();
  }
  createMainWindow();
  return { success: true };
});

ipcMain.handle('get-config', async () => {
  try {
    if (!fs.existsSync(envPath)) {
      return { success: true, config: {} };
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const config = {};

    envContent.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key) {
          config[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return { success: true, config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-config', async (event, newConfig) => {
  try {
    const envContent = Object.entries(newConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, envContent, 'utf8');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close', () => {
  if (mainWindow) mainWindow.close();
});

// App lifecycle
app.whenReady().then(() => {
  setupSettingsIPC();
  // Check if .env exists
  if (checkEnvExists()) {
    createMainWindow();
  } else {
    createSetupWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (checkEnvExists()) {
        createMainWindow();
      } else {
        createSetupWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  
  // Kill gateway process
  if (gatewayProcess) {
    gatewayProcess.kill();
  }
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});
