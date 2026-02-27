/**
 * KevinJr WhatsApp Bot Integration
 * Chat with KevinJr via WhatsApp Business API
 */

const winston = require('winston');
const EventEmitter = require('eventemitter3');
const crypto = require('crypto');

class KevinJrWhatsAppBot extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      accessToken: options.accessToken || process.env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: options.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID,
      webhookVerifyToken: options.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      apiVersion: options.apiVersion || 'v18.0',
      kevinJrUrl: options.kevinJrUrl || 'http://localhost:3001',
      ...options
    };
    
    this.isActive = false;
    this.userSessions = new Map();
    this.messageQueue = new Map();
    
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
          return `${timestamp} [WhatsAppBot] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  _validateConfig() {
    const required = ['accessToken', 'phoneNumberId', 'webhookVerifyToken'];
    const missing = required.filter(key => !this.options[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required WhatsApp configuration: ${missing.join(', ')}`);
    }
  }

  /**
   * Start the WhatsApp bot
   */
  async start() {
    try {
      this.logger.info('💬 Starting KevinJr WhatsApp Bot...');
      
      // Verify WhatsApp Business API connection
      await this._verifyConnection();
      
      this.isActive = true;
      this.logger.info('✅ KevinJr WhatsApp Bot is active!');
      this.emit('bot:started');
      
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to start WhatsApp bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the WhatsApp bot
   */
  async stop() {
    try {
      this.logger.info('🛑 Stopping WhatsApp bot...');
      
      this.isActive = false;
      this.userSessions.clear();
      this.messageQueue.clear();
      
      this.logger.info('✅ WhatsApp bot stopped');
      this.emit('bot:stopped');
    } catch (error) {
      this.logger.error(`❌ Error stopping bot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify WhatsApp Business API connection
   */
  async _verifyConnection() {
    try {
      const response = await fetch(`https://graph.facebook.com/${this.options.apiVersion}/${this.options.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.options.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`WhatsApp API verification failed: ${response.status}`);
      }
      
      const data = await response.json();
      this.logger.info(`🔗 Connected to WhatsApp Business: ${data.display_phone_number}`);
    } catch (error) {
      throw new Error(`WhatsApp connection failed: ${error.message}`);
    }
  }

  /**
   * Handle webhook verification (GET request)
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.options.webhookVerifyToken) {
      this.logger.info('✅ Webhook verified successfully');
      return challenge;
    } else {
      this.logger.warn('❌ Webhook verification failed');
      return null;
    }
  }

  /**
   * Handle incoming webhook (POST request)
   */
  async handleWebhook(body) {
    try {
      if (body.object !== 'whatsapp_business_account') {
        return;
      }

      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this._handleMessages(change.value);
          }
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error handling webhook: ${error.message}`);
    }
  }

  /**
   * Handle incoming messages
   */
  async _handleMessages(value) {
    if (!value.messages) return;

    for (const message of value.messages) {
      await this._processMessage(message, value.contacts?.[0], value.metadata);
    }
  }

  /**
   * Process individual message
   */
  async _processMessage(message, contact, metadata) {
    const phoneNumber = message.from;
    const messageId = message.id;
    
    // Prevent processing duplicate messages
    if (this.messageQueue.has(messageId)) {
      return;
    }
    this.messageQueue.set(messageId, Date.now());
    
    // Initialize user session
    if (!this.userSessions.has(phoneNumber)) {
      this.userSessions.set(phoneNumber, {
        phoneNumber,
        name: contact?.profile?.name || 'User',
        startedAt: Date.now(),
        messageCount: 0
      });
      
      // Send welcome message for new users
      await this._sendWelcomeMessage(phoneNumber, contact?.profile?.name);
      return;
    }
    
    const session = this.userSessions.get(phoneNumber);
    session.messageCount++;
    session.lastMessage = Date.now();
    
    this.logger.info(`💬 Message from ${session.name} (${phoneNumber}): ${message.text?.body || message.type}`);
    
    // Handle different message types
    switch (message.type) {
      case 'text':
        await this._handleTextMessage(phoneNumber, message.text.body, session);
        break;
      case 'interactive':
        await this._handleInteractiveMessage(phoneNumber, message.interactive, session);
        break;
      case 'button':
        await this._handleButtonMessage(phoneNumber, message.button, session);
        break;
      default:
        await this._handleUnsupportedMessage(phoneNumber, message.type);
    }
  }

  /**
   * Send welcome message to new users
   */
  async _sendWelcomeMessage(phoneNumber, name = 'Friend') {
    const welcomeText = `🤖 *Welcome to KevinJr, ${name}!*

I'm your advanced AI development assistant! I can:

🏗️ *Build Applications:*
• Mobile apps (React Native, Flutter)
• Desktop apps (Electron, Tauri)
• Web apps with real-time features
• APIs and microservices

🔐 *Handle Security:*
• OAuth authentication
• JWT token systems
• Role-based access control

🧪 *Ensure Quality:*
• Comprehensive testing
• Performance optimization
• CI/CD automation

*I never say no - always find a way!* 🚀

Try these quick actions or just chat with me naturally!`;

    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'build_app',
          title: '🏗️ Build App'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'status',
          title: '📊 Status'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'help',
          title: '❓ Help'
        }
      }
    ];

    await this._sendInteractiveMessage(phoneNumber, welcomeText, buttons);
  }

  /**
   * Handle text messages
   */
  async _handleTextMessage(phoneNumber, text, session) {
    const lowerText = text.toLowerCase();
    
    // Handle common commands
    if (lowerText.includes('help') || lowerText === '?') {
      await this._sendHelpMessage(phoneNumber);
      return;
    }
    
    if (lowerText.includes('status')) {
      await this._sendStatusMessage(phoneNumber);
      return;
    }
    
    if (lowerText.includes('build') || lowerText.includes('create') || lowerText.includes('make')) {
      await this._handleBuildRequest(phoneNumber, text);
      return;
    }
    
    // Send to KevinJr for processing
    try {
      await this._sendMessage(phoneNumber, '🧠 *Processing your request...*');
      
      const response = await this._sendToKevinJr(phoneNumber, text);
      await this._sendMessage(phoneNumber, response);
    } catch (error) {
      await this._sendMessage(phoneNumber, '❌ *Oops! Something went wrong.*\n\nI\'m having trouble connecting to my brain right now. Please make sure KevinJr is running and try again!');
    }
  }

  /**
   * Handle interactive messages (button responses)
   */
  async _handleInteractiveMessage(phoneNumber, interactive, session) {
    const buttonId = interactive.button_reply?.id;
    
    switch (buttonId) {
      case 'build_app':
        await this._sendBuildOptions(phoneNumber);
        break;
      case 'status':
        await this._sendStatusMessage(phoneNumber);
        break;
      case 'help':
        await this._sendHelpMessage(phoneNumber);
        break;
      case 'mobile_app':
        await this._handleBuildRequest(phoneNumber, 'Build a mobile app');
        break;
      case 'web_app':
        await this._handleBuildRequest(phoneNumber, 'Build a web application');
        break;
      case 'api':
        await this._handleBuildRequest(phoneNumber, 'Build a REST API');
        break;
      case 'desktop_app':
        await this._handleBuildRequest(phoneNumber, 'Build a desktop application');
        break;
      default:
        await this._sendMessage(phoneNumber, 'I didn\'t understand that action. Try typing your request or use the menu buttons!');
    }
  }

  /**
   * Handle button messages
   */
  async _handleButtonMessage(phoneNumber, button, session) {
    // Similar to interactive messages
    await this._handleInteractiveMessage(phoneNumber, { button_reply: { id: button.payload } }, session);
  }

  /**
   * Handle unsupported message types
   */
  async _handleUnsupportedMessage(phoneNumber, messageType) {
    await this._sendMessage(phoneNumber, `📝 I received a ${messageType} message, but I currently only support text messages. Please send me a text message describing what you'd like to build!`);
  }

  /**
   * Send help message
   */
  async _sendHelpMessage(phoneNumber) {
    const helpText = `🤖 *KevinJr Help*

*What I can do:*
• Build mobile apps (React Native, Flutter)
• Create web applications
• Generate desktop apps
• Set up APIs and microservices
• Implement authentication
• Create testing frameworks

*How to use:*
Just tell me what you want to build! Examples:
• "Build me a chat app"
• "Create a todo application"
• "Set up OAuth authentication"
• "Generate a REST API"

*Quick Commands:*
• Type "status" to check my status
• Type "help" to see this message
• Use the menu buttons for quick actions

*I never say no - always find a way!* ✨`;

    await this._sendMessage(phoneNumber, helpText);
  }

  /**
   * Send status message
   */
  async _sendStatusMessage(phoneNumber) {
    try {
      const response = await fetch(`${this.options.kevinJrUrl}/api/status`);
      const status = await response.json();
      
      const statusText = `💚 *KevinJr Status: ONLINE*

🖥️ *System Info:*
• Uptime: ${Math.floor(status.uptime / 60)} minutes
• Memory: ${Math.round(status.memory.heapUsed / 1024 / 1024)}MB
• Connected Clients: ${status.clients}

🤖 *WhatsApp Bot:*
• Active Users: ${this.userSessions.size}
• Bot Status: ${this.isActive ? '✅ Active' : '❌ Inactive'}

✨ *All systems operational!*
Ready to build amazing things together! 🚀`;

      await this._sendMessage(phoneNumber, statusText);
    } catch (error) {
      await this._sendMessage(phoneNumber, '❌ *KevinJr Status: OFFLINE*\n\nCannot connect to KevinJr engine. Please check if KevinJr is running on your computer.');
    }
  }

  /**
   * Send build options
   */
  async _sendBuildOptions(phoneNumber) {
    const text = '🏗️ *What would you like to build?*\n\nChoose from the options below or describe your project in your own words:';
    
    const buttons = [
      {
        type: 'reply',
        reply: {
          id: 'mobile_app',
          title: '📱 Mobile App'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'web_app',
          title: '🌐 Web App'
        }
      },
      {
        type: 'reply',
        reply: {
          id: 'api',
          title: '🔌 API'
        }
      }
    ];

    await this._sendInteractiveMessage(phoneNumber, text, buttons);
  }

  /**
   * Handle build requests
   */
  async _handleBuildRequest(phoneNumber, description) {
    await this._sendMessage(phoneNumber, '🚀 *Building your application...*\n\nAnalyzing requirements and generating code...');
    
    try {
      const response = await this._sendToKevinJr(phoneNumber, description);
      await this._sendMessage(phoneNumber, `✅ *Application Built Successfully!*\n\n${response}`);
    } catch (error) {
      await this._sendMessage(phoneNumber, `❌ *Build Failed*\n\n${error.message}`);
    }
  }

  /**
   * Send message to KevinJr and get response
   */
  async _sendToKevinJr(phoneNumber, message) {
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
            platform: 'whatsapp',
            phoneNumber
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
   * Send simple text message
   */
  async _sendMessage(phoneNumber, text) {
    try {
      const response = await fetch(`https://graph.facebook.com/${this.options.apiVersion}/${this.options.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'text',
          text: {
            body: text
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const data = await response.json();
      this.logger.info(`📤 Message sent to ${phoneNumber}: ${data.messages[0].id}`);
      
      return data;
    } catch (error) {
      this.logger.error(`❌ Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send interactive message with buttons
   */
  async _sendInteractiveMessage(phoneNumber, text, buttons) {
    try {
      const response = await fetch(`https://graph.facebook.com/${this.options.apiVersion}/${this.options.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.options.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneNumber,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: text
            },
            action: {
              buttons: buttons
            }
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send interactive message: ${response.status}`);
      }
      
      const data = await response.json();
      this.logger.info(`📤 Interactive message sent to ${phoneNumber}: ${data.messages[0].id}`);
      
      return data;
    } catch (error) {
      this.logger.error(`❌ Error sending interactive message: ${error.message}`);
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
      queuedMessages: this.messageQueue.size
    };
  }

  /**
   * Broadcast message to all users
   */
  async broadcast(message) {
    const results = [];
    
    for (const phoneNumber of this.userSessions.keys()) {
      try {
        await this._sendMessage(phoneNumber, message);
        results.push({ phoneNumber, success: true });
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Clean up old messages from queue
   */
  _cleanupMessageQueue() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [messageId, timestamp] of this.messageQueue.entries()) {
      if (now - timestamp > maxAge) {
        this.messageQueue.delete(messageId);
      }
    }
  }
}

module.exports = KevinJrWhatsAppBot;
