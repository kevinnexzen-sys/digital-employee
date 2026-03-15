const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

function setupSettingsIPC() {
  // Load settings
  ipcMain.handle('loadSettings', async () => {
    try {
      if (!fs.existsSync(envPath)) {
        return { success: true, settings: {} };
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const settings = {};

      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key) {
            settings[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      return { success: true, settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Save settings
  ipcMain.handle('saveSettings', async (event, settings) => {
    try {
      const envContent = Object.entries(settings)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      fs.writeFileSync(envPath, envContent, 'utf8');

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupSettingsIPC };
