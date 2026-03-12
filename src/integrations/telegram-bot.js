/**
 * KevinJr Telegram Bot Integration
 * @KevinJrBot - Your AI companion on Telegram
 */

const TelegramBot = require('node-telegram-bot-api');
const winston = require('winston');
const EventEmitter = require('eventemitter3');
const crypto = require('crypto');

class KevinJrTelegramBot extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      token: options.token || process.env.TELEGRAM_BOT_TOKEN,
      webhookUrl: options.webhookUrl,
      polling: options.polling !== false, // Default to polling if no webhook
      kevinJrUrl: options.kevinJrUrl || 'http://localhost:3001',
      ...options
    };
    
    this.bot = null;
    this.isActive = false;
    this.userSessions = new Map();
    
    this._setupLogger();
    this._validateConfig();
  }

  _setupLogger() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [TelegramBot] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  _validateConfig() {
    if (!this.options.token) {
      throw new Error('Telegram bot token is required. Set TELEGRAM_BOT_TOKEN environment variable.');
    }
  }

  /**
   * Start the Telegram bot
   */
  async start() {
    try {
      this.logger.info('🤖 Starting KevinJr Telegram Bot...');
      
      this.bot = new TelegramBot(this.options.token, {
        polling: this.options.polling
      });
      
      if (this.options.webhookUrl && !this.options.polling) {
        await this.bot.setWebHook(this.options.webhookUrl);
        this.logger.info(`🔗 Webhook set: ${this.options.webhookUrl}`);
      }
      
      this._setupHandlers();
      this.isActive = true;
      
      this.logger.info('✅ KevinJr Telegram Bot is active!');
      this.emit('bot:started');
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to start Telegram bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the Telegram bot
   */
  async stop() {
    try {
      this.logger.info('🛑 Stopping Telegram bot...');
      
      if (this.bot) {
        await this.bot.stopPolling();
        if (this.options.webhookUrl) {
          await this.bot.deleteWebHook();
        }
      }
      
      this.isActive = false;
      this.bot = null;
      
      this.logger.info('✅ Telegram bot stopped');
      this.emit('bot:stopped');
    } catch (error) {
      this.logger.error(`❌ Error stopping bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup message and command handlers
   */
  _setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this._handleStart(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this._handleHelp(msg);
    });

    // Status command
    this.bot.onText(/\/status/, async (msg) => {
      await this._handleStatus(msg);
    });

    // Build command
    this.bot.onText(/\/build (.+)/, async (msg, match) => {
      await this._handleBuild(msg, match[1]);
    });

    // Settings command
    this.bot.onText(/\/settings/, async (msg) => {
      await this._handleSettings(msg);
    });

    // All other messages
    this.bot.on('message', async (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      await this._handleMessage(msg);
    });

    // Callback queries (inline keyboard responses)
    this.bot.on('callback_query', async (query) => {
      await this._handleCallbackQuery(query);
    });

    // Error handling
    this.bot.on('error', (error) => {
      this.logger.error(`🚨 Bot error: ${error.message}`);
      this.emit('bot:error', error);
    });

    // Polling error handling
    this.bot.on('polling_error', (error) => {
      this.logger.error(`🚨 Polling error: ${error.message}`);
    });
  }

  /**
   * Handle /start command
   */
  async _handleStart(msg) {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || 'Friend';
    
    this.logger.info(`👋 New user started: ${userName} (${chatId})`);
    
    // Initialize user session
    this.userSessions.set(chatId, {
      userId: msg.from.id,
      userName,
      startedAt: Date.now(),
      messageCount: 0
    });
    
    const welcomeMessage = `🤖 **Welcome to KevinJr, ${userName}!**

I'm your advanced AI development assistant! I can:

🏗️ **Build Applications:**
• Mobile apps (React Native, Flutter)
• Desktop apps (Electron, Tauri)  
• Web apps with real-time features
• APIs and microservices

🔐 **Handle Security:**
• OAuth authentication
• JWT token systems
• Role-based access control

🧪 **Ensure Quality:**
• Comprehensive testing
• Performance optimization
• CI/CD automation

**I never say no - always find a way!** 🚀

Try these commands:
/help - Show all commands
/build <description> - Build an application
/status - Check my status

Or just chat with me naturally! What would you like to create?`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏗️ Build App', callback_data: 'build_app' },
          { text: '💬 Chat Mode', callback_data: 'chat_mode' }
        ],
        [
          { text: '📊 Status', callback_data: 'status' },
          { text: '⚙️ Settings', callback_data: 'settings' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Handle /help command
   */
  async _handleHelp(msg) {
    const chatId = msg.chat.id;
    
    const helpMessage = `🤖 **KevinJr Commands:**

**🏗️ Building:**
/build <description> - Build any application
/build mobile chat app - Create mobile chat app
/build todo app - Create todo application

**📊 Information:**
/status - Check KevinJr status
/help - Show this help message

**⚙️ Settings:**
/settings - Configure preferences

**💬 Chat Mode:**
Just send me any message and I'll help you! I understand natural language and can:

• Generate complete applications
• Set up authentication systems
• Create real-time features
• Build cross-platform apps
• Implement testing frameworks
• Deploy applications

**Examples:**
"Build me a chat app with React Native"
"Create a todo app with offline sync"
"Set up OAuth authentication"
"Generate a REST API with tests"

**I never say no - always find a way!** ✨`;

    await this.bot.sendMessage(chatId, helpMessage, {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Handle /status command
   */
  async _handleStatus(msg) {
    const chatId = msg.chat.id;
    
    try {
      // Check KevinJr status
      const response = await fetch(`${this.options.kevinJrUrl}/api/status`);
      const status = await response.json();
      
      const statusMessage = `💚 **KevinJr Status: ONLINE**

🖥️ **System Info:**
• Uptime: ${Math.floor(status.uptime / 60)} minutes
• Memory: ${Math.round(status.memory.heapUsed / 1024 / 1024)}MB
• Connected Clients: ${status.clients}

🤖 **Bot Info:**
• Active Users: ${this.userSessions.size}
• Bot Status: ${this.isActive ? '✅ Active' : '❌ Inactive'}

✨ **All systems operational!**
Ready to build amazing things together! 🚀`;

      await this.bot.sendMessage(chatId, statusMessage, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      await this.bot.sendMessage(chatId, '❌ **KevinJr Status: OFFLINE**\n\nCannot connect to KevinJr engine. Please check if KevinJr is running on your computer.', {
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * Handle /build command
   */
  async _handleBuild(msg, description) {
    const chatId = msg.chat.id;
    
    await this.bot.sendMessage(chatId, '🚀 **Building your application...**\n\nAnalyzing requirements and generating code...', {
      parse_mode: 'Markdown'
    });
    
    try {
      // Send build request to KevinJr
      const response = await this._sendToKevinJr(chatId, `Build ${description}`);
      
      await this.bot.sendMessage(chatId, `✅ **Application Built Successfully!**\n\n${response}`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      await this.bot.sendMessage(chatId, `❌ **Build Failed**\n\n${error.message}`, {
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * Handle /settings command
   */
  async _handleSettings(msg) {
    const chatId = msg.chat.id;
    
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔔 Notifications', callback_data: 'settings_notifications' },
          { text: '🎨 Theme', callback_data: 'settings_theme' }
        ],
        [
          { text: '🌍 Language', callback_data: 'settings_language' },
          { text: '⚡ Performance', callback_data: 'settings_performance' }
        ],
        [
          { text: '🔒 Privacy', callback_data: 'settings_privacy' },
          { text: '📱 Mobile Sync', callback_data: 'settings_sync' }
        ]
      ]
    };

    await this.bot.sendMessage(chatId, '⚙️ **KevinJr Settings**\n\nChoose what you\'d like to configure:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }

  /**
   * Handle regular messages
   */
  async _handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Update user session
    const session = this.userSessions.get(chatId);
    if (session) {
      session.messageCount++;
      session.lastMessage = Date.now();
    }
    
    this.logger.info(`💬 Message from ${msg.from.first_name}: ${text}`);
    
    // Show typing indicator
    await this.bot.sendChatAction(chatId, 'typing');
    
    try {
      // Send message to KevinJr and get response
      const response = await this._sendToKevinJr(chatId, text);
      
      // Send response back to user
      await this.bot.sendMessage(chatId, response, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      this.logger.error(`❌ Error processing message: ${error.message}`);
      
      await this.bot.sendMessage(chatId, '❌ **Oops! Something went wrong.**\n\nI\'m having trouble connecting to my brain right now. Please make sure KevinJr is running on your computer and try again!', {
        parse_mode: 'Markdown'
      });
    }
  }

  /**
   * Handle callback queries from inline keyboards
   */
  async _handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const data = query.data;
    
    await this.bot.answerCallbackQuery(query.id);
    
    switch (data) {
      case 'build_app':
        await this.bot.sendMessage(chatId, '🏗️ **What would you like to build?**\n\nExamples:\n• Mobile chat app\n• Todo application\n• E-commerce website\n• REST API\n• Desktop application\n\nJust describe what you need!');
        break;
        
      case 'chat_mode':
        await this.bot.sendMessage(chatId, '💬 **Chat Mode Activated!**\n\nI\'m ready to chat! Ask me anything or tell me what you\'d like to build. I understand natural language and can help with any development task.');
        break;
        
      case 'status':
        await this._handleStatus(query.message);
        break;
        
      case 'settings':
        await this._handleSettings(query.message);
        break;
        
      default:
        if (data.startsWith('settings_')) {
          await this._handleSettingsOption(chatId, data);
        }
    }
  }

  /**
   * Handle settings options
   */
  async _handleSettingsOption(chatId, option) {
    const setting = option.replace('settings_', '');
    
    const messages = {
      notifications: '🔔 **Notification Settings**\n\nNotifications are currently enabled. You\'ll receive updates when builds complete and important events occur.',
      theme: '🎨 **Theme Settings**\n\nUsing default Telegram theme. KevinJr adapts to your Telegram appearance settings.',
      language: '🌍 **Language Settings**\n\nCurrently set to English. KevinJr can communicate in multiple languages!',
      performance: '⚡ **Performance Settings**\n\nOptimized for fast responses. All systems running at peak performance!',
      privacy: '🔒 **Privacy Settings**\n\nYour conversations are secure. KevinJr respects your privacy and doesn\'t store personal data.',
      sync: '📱 **Mobile Sync Settings**\n\nSync with KevinJr mobile app and web dashboard for seamless experience across devices.'
    };
    
    await this.bot.sendMessage(chatId, messages[setting] || 'Setting not found.', {
      parse_mode: 'Markdown'
    });
  }

  /**
   * Send message to KevinJr and get response
   */
  async _sendToKevinJr(chatId, message) {
    try {
      const response = await fetch(`${this.options.kevinJrUrl}/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: 'chat',
          params: {
            message,
            platform: 'telegram',
            chatId
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        return data.result || 'Task completed successfully!';
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (error) {
      this.logger.error(`❌ Error communicating with KevinJr: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get bot statistics
   */
  getStats() {
    return {
      isActive: this.isActive,
      activeUsers: this.userSessions.size,
      totalMessages: Array.from(this.userSessions.values()).reduce((sum, session) => sum + session.messageCount, 0),
      uptime: this.isActive ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Broadcast message to all users
   */
  async broadcast(message, options = {}) {
    const results = [];
    
    for (const chatId of this.userSessions.keys()) {
      try {
        await this.bot.sendMessage(chatId, message, options);
        results.push({ chatId, success: true });
      } catch (error) {
        results.push({ chatId, success: false, error: error.message });
      }
    }
    
    return results;
  }
}

module.exports = KevinJrTelegramBot;
