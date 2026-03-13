import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const config = {
  // LLM Provider
  llm: {
    provider: process.env.LLM_PROVIDER || 'anthropic',
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview',
      maxTokens: 4096
    }
  },

  // Search Provider
  search: {
    provider: process.env.SEARCH_PROVIDER || 'tavily',
    apiKey: process.env.TAVILY_API_KEY || process.env.SERPAPI_API_KEY || process.env.BING_SEARCH_API_KEY
  },

  // Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    confirmationTimeout: parseInt(process.env.TELEGRAM_CONFIRMATION_TIMEOUT) || 300000
  },

  // Voice
  voice: {
    elevenlabs: {
      apiKey: process.env.ELEVENLABS_API_KEY
    },
    whisper: {
      apiKey: process.env.WHISPER_API_KEY
    }
  },

  // Server
  server: {
    port: parseInt(process.env.PORT) || 18789,
    host: process.env.HOST || '127.0.0.1'
  },

  // Database
  database: {
    path: process.env.DATABASE_PATH || './data/personalclaw.db'
  },

  // Browser
  browser: {
    headless: process.env.BROWSER_HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000
  },

  // Screen Watch
  screenWatch: {
    enabled: process.env.SCREEN_WATCH_ENABLED === 'true',
    interval: parseInt(process.env.SCREEN_WATCH_INTERVAL) || 5000
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/combined.log'
  },

  // Memory
  memory: {
    maxContextMessages: parseInt(process.env.MAX_CONTEXT_MESSAGES) || 50
  },

  // Security
  security: {
    enableFinancialBlocker: process.env.ENABLE_FINANCIAL_BLOCKER !== 'false'
  }
};

export default config;
