import TelegramBot from 'node-telegram-bot-api';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import screenWatcher from '../screen-watcher/watcher.js';
import fs from 'fs-extra';

const logger = createLogger('Telegram');

class TelegramChannel {
  constructor() {
    this.bot = null;
    this.isInitialized = false;
    this.pendingConfirmations = new Map();
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    if (!config.telegram.botToken) {
      logger.warn('Telegram bot token not configured');
      return;
    }

    try {
      logger.info('Initializing Telegram bot...');
      
      this.bot = new TelegramBot(config.telegram.botToken, { polling: true });
      
      this.setupCommands();
      this.setupCallbacks();
      
      this.isInitialized = true;
      logger.info('Telegram bot initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  setupCommands() {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, 
        '🦞 *PersonalClaw Bot*\n\n' +
        'I will send you confirmation requests when PersonalClaw needs permission.\n\n' +
        'Commands:\n' +
        '/status - Check bot status\n' +
        '/pending - View pending confirmations\n' +
        '/help - Show this message',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.onText(/\/status/, (msg) => {
      const chatId = msg.chat.id;
      const pending = this.pendingConfirmations.size;
      this.bot.sendMessage(chatId,
        `✅ Bot is active\n\n` +
        `Pending confirmations: ${pending}`,
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.onText(/\/pending/, (msg) => {
      const chatId = msg.chat.id;
      if (this.pendingConfirmations.size === 0) {
        this.bot.sendMessage(chatId, 'No pending confirmations');
        return;
      }

      let message = '📋 *Pending Confirmations:*\n\n';
      this.pendingConfirmations.forEach((conf, id) => {
        message += `• ${conf.action}\n`;
      });

      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId,
        '🦞 *PersonalClaw Help*\n\n' +
        'This bot sends confirmation requests when PersonalClaw needs your permission.\n\n' +
        'When you receive a request:\n' +
        '✅ Approve - Allow the action\n' +
        '❌ Reject - Deny the action\n' +
        '✏️ Edit - Modify the action\n\n' +
        'Commands:\n' +
        '/status - Check status\n' +
        '/pending - View pending\n' +
        '/help - This message',
        { parse_mode: 'Markdown' }
      );
    });
  }

  setupCallbacks() {
    this.bot.on('callback_query', async (query) => {
      const data = query.data;
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;

      if (data.startsWith('approve_')) {
        const confirmId = data.replace('approve_', '');
        await this.handleApproval(confirmId, chatId, messageId);
      } else if (data.startsWith('reject_')) {
        const confirmId = data.replace('reject_', '');
        await this.handleRejection(confirmId, chatId, messageId);
      } else if (data.startsWith('edit_')) {
        const confirmId = data.replace('edit_', '');
        await this.handleEdit(confirmId, chatId, messageId);
      }

      this.bot.answerCallbackQuery(query.id);
    });
  }

  // REQUEST CONFIRMATION WITH SCREENSHOT
  async requestConfirmation(action, details = {}) {
    if (!this.isInitialized) {
      logger.warn('Telegram not initialized, auto-approving');
      return { approved: true, reason: 'telegram_not_configured' };
    }

    try {
      const confirmId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info(`📸 Requesting confirmation for: ${action}`);

      // CAPTURE SCREENSHOT BEFORE ASKING
      const capture = await screenWatcher.captureForConfirmation(action);
      
      // Send screenshot to Telegram
      const chatId = config.telegram.chatId;
      
      // Send photo with caption
      await this.bot.sendPhoto(chatId, capture.screenshot, {
        caption: `🦞 *PersonalClaw Confirmation Request*\n\n` +
                 `*Action:* ${action}\n` +
                 `*Details:* ${JSON.stringify(details, null, 2)}\n\n` +
                 `📸 Current screen captured\n` +
                 `🔍 OCR Confidence: ${capture.confidence.toFixed(1)}%\n\n` +
                 `Please review and respond:`,
        parse_mode: 'Markdown'
      });

      // Send buttons
      await this.bot.sendMessage(chatId, 
        'Choose an action:',
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `approve_${confirmId}` },
                { text: '❌ Reject', callback_data: `reject_${confirmId}` }
              ],
              [
                { text: '✏️ Edit', callback_data: `edit_${confirmId}` }
              ]
            ]
          }
        }
      );

      // Store confirmation
      const confirmation = {
        id: confirmId,
        action,
        details,
        screenshot: capture.screenshot,
        ocrText: capture.text,
        timestamp: Date.now(),
        status: 'pending'
      };

      this.pendingConfirmations.set(confirmId, confirmation);

      // Wait for response (with timeout)
      return await this.waitForResponse(confirmId, config.telegram.confirmationTimeout || 300000);

    } catch (error) {
      logger.error('Failed to request confirmation:', error);
      return { approved: false, error: error.message };
    }
  }

  async handleApproval(confirmId, chatId, messageId) {
    const confirmation = this.pendingConfirmations.get(confirmId);
    if (!confirmation) {
      this.bot.editMessageText('⚠️ Confirmation expired', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    confirmation.status = 'approved';
    confirmation.resolvedAt = Date.now();

    this.bot.editMessageText(
      `✅ *Approved*\n\nAction: ${confirmation.action}\nApproved at: ${new Date().toLocaleString()}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`✅ Confirmation approved: ${confirmId}`);
  }

  async handleRejection(confirmId, chatId, messageId) {
    const confirmation = this.pendingConfirmations.get(confirmId);
    if (!confirmation) {
      this.bot.editMessageText('⚠️ Confirmation expired', {
        chat_id: chatId,
        message_id: messageId
      });
      return;
    }

    confirmation.status = 'rejected';
    confirmation.resolvedAt = Date.now();

    this.bot.editMessageText(
      `❌ *Rejected*\n\nAction: ${confirmation.action}\nRejected at: ${new Date().toLocaleString()}`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown'
      }
    );

    logger.info(`❌ Confirmation rejected: ${confirmId}`);
  }

  async handleEdit(confirmId, chatId, messageId) {
    this.bot.editMessageText(
      '✏️ Edit mode not yet implemented.\n\nPlease reject and provide new instructions.',
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
  }

  async waitForResponse(confirmId, timeout) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const confirmation = this.pendingConfirmations.get(confirmId);
        
        if (confirmation && confirmation.status !== 'pending') {
          clearInterval(checkInterval);
          clearTimeout(timeoutHandle);
          this.pendingConfirmations.delete(confirmId);
          
          resolve({
            approved: confirmation.status === 'approved',
            status: confirmation.status
          });
        }
      }, 500);

      const timeoutHandle = setTimeout(() => {
        clearInterval(checkInterval);
        this.pendingConfirmations.delete(confirmId);
        
        logger.warn(`⏱️ Confirmation timeout: ${confirmId}`);
        resolve({ approved: false, timeout: true });
      }, timeout);
    });
  }

  async sendMessage(message) {
    if (!this.isInitialized) {
      logger.warn('Telegram not initialized');
      return;
    }

    try {
      await this.bot.sendMessage(config.telegram.chatId, message);
    } catch (error) {
      logger.error('Failed to send message:', error);
    }
  }

  stop() {
    if (this.bot) {
      this.bot.stopPolling();
      logger.info('Telegram bot stopped');
    }
  }
}

export default new TelegramChannel();
