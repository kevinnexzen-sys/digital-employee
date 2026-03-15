const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// Map frontend field names to .env variable names
const FIELD_TO_ENV_MAP = {
  // AI Providers
  'anthropicApiKey': 'ANTHROPIC_API_KEY',
  'openaiApiKey': 'OPENAI_API_KEY',
  'geminiApiKey': 'GEMINI_API_KEY',
  'ollamaUrl': 'OLLAMA_URL',
  
  // Search
  'tavilyApiKey': 'TAVILY_API_KEY',
  'serpApiKey': 'SERP_API_KEY',
  'bingApiKey': 'BING_API_KEY',
  
  // Integrations
  'telegramBotToken': 'TELEGRAM_BOT_TOKEN',
  'telegramChatId': 'TELEGRAM_CHAT_ID',
  'elevenlabsApiKey': 'ELEVENLABS_API_KEY',
  
  // Email
  'emailHost': 'EMAIL_HOST',
  'emailPort': 'EMAIL_PORT',
  'emailUser': 'EMAIL_USER',
  'emailPassword': 'EMAIL_PASSWORD',
  'emailFrom': 'EMAIL_FROM',
  
  // Server
  'port': 'PORT',
  'host': 'HOST',
  'logLevel': 'LOG_LEVEL',
  
  // Features
  'llmProvider': 'LLM_PROVIDER',
  'searchProvider': 'SEARCH_PROVIDER',
  'screenWatchEnabled': 'SCREEN_WATCH_ENABLED',
  'browserHeadless': 'BROWSER_HEADLESS'
};

// Reverse map for loading
const ENV_TO_FIELD_MAP = Object.fromEntries(
  Object.entries(FIELD_TO_ENV_MAP).map(([k, v]) => [v, k])
);

function setupSettingsIPC() {
  // Load settings from .env
  ipcMain.handle('loadSettings', async () => {
    try {
      if (!fs.existsSync(envPath)) {
        return { success: true, settings: {} };
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};

      // Parse .env file
      envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      // Convert ENV names to field names
      const settings = {};
      Object.entries(envVars).forEach(([envKey, value]) => {
        const fieldName = ENV_TO_FIELD_MAP[envKey] || envKey;
        settings[fieldName] = value;
      });

      return { success: true, settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Save settings to .env
  ipcMain.handle('saveSettings', async (event, settings) => {
    try {
      const envLines = [];

      // Convert field names to ENV names
      Object.entries(settings).forEach(([fieldName, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          const envKey = FIELD_TO_ENV_MAP[fieldName] || fieldName;
          envLines.push(`${envKey}=${value}`);
        }
      });

      fs.writeFileSync(envPath, envLines.join('\n') + '\n', 'utf8');

      return { 
        success: true, 
        message: '✅ Settings saved successfully! Restart the app to apply changes.' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: '❌ Failed to save settings: ' + error.message 
      };
    }
  });

  // Test API key
  ipcMain.handle('testApiKey', async (event, { provider, apiKey }) => {
    try {
      // Simple validation
      if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        return { 
          success: false, 
          message: '❌ Invalid Anthropic API key format (should start with sk-ant-)' 
        };
      }
      
      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return { 
          success: false, 
          message: '❌ Invalid OpenAI API key format (should start with sk-)' 
        };
      }

      // TODO: Add actual API test calls here
      return { 
        success: true, 
        message: '✅ API key format looks valid! (Full test not implemented yet)' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: '❌ Test failed: ' + error.message 
      };
    }
  });
}

module.exports = { setupSettingsIPC };
