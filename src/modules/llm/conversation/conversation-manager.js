/**
 * KevinJr Conversation Manager
 * Manages conversation context, memory, and history
 */

const winston = require('winston');
const fs = require('fs-extra');
const path = require('path');

class Conversation {
  constructor(id, config = {}) {
    this.id = id;
    this.messages = [];
    this.createdAt = new Date();
    this.lastActivity = new Date();
    this.metadata = {};
    this.maxMessages = config.maxMessages || 50;
    this.maxAge = config.maxAge || 24 * 60 * 60 * 1000; // 24 hours
    
    // Add system message if provided
    if (config.systemMessage) {
      this.addMessage('system', config.systemMessage);
    }
  }

  addMessage(role, content, metadata = {}) {
    const message = {
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    
    this.messages.push(message);
    this.lastActivity = new Date();
    
    // Trim old messages if we exceed the limit
    if (this.messages.length > this.maxMessages) {
      // Keep system message if it exists
      const systemMessages = this.messages.filter(m => m.role === 'system');
      const otherMessages = this.messages.filter(m => m.role !== 'system');
      
      // Keep the most recent messages
      const trimmedMessages = otherMessages.slice(-this.maxMessages + systemMessages.length);
      this.messages = [...systemMessages, ...trimmedMessages];
    }
  }

  getMessages() {
    return this.messages;
  }

  getLastMessage() {
    return this.messages[this.messages.length - 1];
  }

  getMessageCount() {
    return this.messages.length;
  }

  isExpired() {
    const now = new Date();
    return (now - this.lastActivity) > this.maxAge;
  }

  getSummary() {
    return {
      id: this.id,
      messageCount: this.messages.length,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      isExpired: this.isExpired(),
      metadata: this.metadata
    };
  }

  toJSON() {
    return {
      id: this.id,
      messages: this.messages,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      metadata: this.metadata
    };
  }

  static fromJSON(data) {
    const conversation = new Conversation(data.id);
    conversation.messages = data.messages || [];
    conversation.createdAt = new Date(data.createdAt);
    conversation.lastActivity = new Date(data.lastActivity);
    conversation.metadata = data.metadata || {};
    return conversation;
  }
}

class ConversationManager {
  constructor(config, tokenManager) {
    this.config = config;
    this.tokenManager = tokenManager;
    this.conversations = new Map();
    this.logger = null;
    
    // Configuration
    this.maxConversations = config.maxConversations || 100;
    this.persistenceEnabled = config.persistenceEnabled !== false;
    this.persistencePath = config.persistencePath || path.join(process.cwd(), 'data', 'conversations');
    this.cleanupInterval = config.cleanupInterval || 60 * 60 * 1000; // 1 hour
    
    // Default system message for KevinJr
    this.defaultSystemMessage = config.systemMessage || 
      `You are KevinJr, an advanced task automation agent and digital companion. 
      Your motto is "Never says no - always finds a way!" 
      You are helpful, creative, and always try to find solutions to any problem.
      You have a friendly personality and act as a supportive digital friend.
      You can help with coding, analysis, automation, and general assistance.`;
    
    this._setupLogger();
  }

  /**
   * Initialize the conversation manager
   */
  async initialize() {
    this.logger.info('💬 Conversation manager initializing...');
    
    // Ensure persistence directory exists
    if (this.persistenceEnabled) {
      await fs.ensureDir(this.persistencePath);
      await this._loadPersistedConversations();
    }
    
    // Start cleanup interval
    this._startCleanupInterval();
    
    this.logger.info(`✅ Conversation manager ready (${this.conversations.size} conversations loaded)`);
    return true;
  }

  /**
   * Get or create a conversation
   */
  async getOrCreateConversation(conversationId, options = {}) {
    let conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      // Create new conversation
      conversation = new Conversation(conversationId, {
        systemMessage: options.systemMessage || this.defaultSystemMessage,
        maxMessages: options.maxMessages || this.config.maxMessages,
        maxAge: options.maxAge || this.config.maxAge
      });
      
      this.conversations.set(conversationId, conversation);
      this.logger.info(`💬 Created new conversation: ${conversationId}`);
      
      // Persist if enabled
      if (this.persistenceEnabled) {
        await this._persistConversation(conversation);
      }
      
      // Cleanup old conversations if we exceed the limit
      await this._cleanupOldConversations();
    } else {
      // Update last activity
      conversation.lastActivity = new Date();
    }
    
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }
    
    this.conversations.delete(conversationId);
    this.logger.info(`🗑️  Deleted conversation: ${conversationId}`);
    
    // Remove from persistence
    if (this.persistenceEnabled) {
      await this._removePersistedConversation(conversationId);
    }
    
    return true;
  }

  /**
   * List all conversations
   */
  listConversations() {
    return Array.from(this.conversations.values()).map(conv => conv.getSummary());
  }

  /**
   * Get active conversation count
   */
  getActiveConversationCount() {
    return this.conversations.size;
  }

  /**
   * Clear all conversations
   */
  async clearAllConversations() {
    this.logger.info('🧹 Clearing all conversations...');
    
    this.conversations.clear();
    
    // Clear persistence
    if (this.persistenceEnabled) {
      await fs.emptyDir(this.persistencePath);
    }
    
    this.logger.info('✅ All conversations cleared');
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    const conversations = Array.from(this.conversations.values());
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.getMessageCount(), 0);
    const expiredCount = conversations.filter(conv => conv.isExpired()).length;
    
    return {
      totalConversations: conversations.length,
      totalMessages: totalMessages,
      expiredConversations: expiredCount,
      averageMessagesPerConversation: conversations.length > 0 ? 
        Math.round(totalMessages / conversations.length) : 0
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Conversation manager cleanup...');
    
    // Stop cleanup interval
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }
    
    // Persist all conversations
    if (this.persistenceEnabled) {
      await this._persistAllConversations();
    }
    
    this.conversations.clear();
    this.logger.info('✅ Conversation manager cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [ConversationManager] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _loadPersistedConversations() {
    try {
      const files = await fs.readdir(this.persistencePath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.persistencePath, file);
          const data = await fs.readJson(filePath);
          const conversation = Conversation.fromJSON(data);
          
          // Skip expired conversations
          if (!conversation.isExpired()) {
            this.conversations.set(conversation.id, conversation);
          } else {
            // Remove expired conversation file
            await fs.remove(filePath);
          }
        } catch (error) {
          this.logger.error(`💥 Error loading conversation from ${file}:`, error);
        }
      }
      
      this.logger.info(`📂 Loaded ${this.conversations.size} persisted conversations`);
      
    } catch (error) {
      this.logger.error('💥 Error loading persisted conversations:', error);
    }
  }

  async _persistConversation(conversation) {
    if (!this.persistenceEnabled) return;
    
    try {
      const filePath = path.join(this.persistencePath, `${conversation.id}.json`);
      await fs.writeJson(filePath, conversation.toJSON(), { spaces: 2 });
    } catch (error) {
      this.logger.error(`💥 Error persisting conversation ${conversation.id}:`, error);
    }
  }

  async _persistAllConversations() {
    if (!this.persistenceEnabled) return;
    
    const promises = Array.from(this.conversations.values()).map(conv => 
      this._persistConversation(conv)
    );
    
    await Promise.allSettled(promises);
  }

  async _removePersistedConversation(conversationId) {
    if (!this.persistenceEnabled) return;
    
    try {
      const filePath = path.join(this.persistencePath, `${conversationId}.json`);
      await fs.remove(filePath);
    } catch (error) {
      this.logger.error(`💥 Error removing persisted conversation ${conversationId}:`, error);
    }
  }

  _startCleanupInterval() {
    this.cleanupIntervalId = setInterval(async () => {
      await this._cleanupExpiredConversations();
    }, this.cleanupInterval);
  }

  async _cleanupExpiredConversations() {
    const expiredConversations = Array.from(this.conversations.entries())
      .filter(([id, conv]) => conv.isExpired());
    
    if (expiredConversations.length > 0) {
      this.logger.info(`🧹 Cleaning up ${expiredConversations.length} expired conversations`);
      
      for (const [id, conversation] of expiredConversations) {
        await this.deleteConversation(id);
      }
    }
  }

  async _cleanupOldConversations() {
    if (this.conversations.size <= this.maxConversations) {
      return;
    }
    
    // Sort conversations by last activity (oldest first)
    const sortedConversations = Array.from(this.conversations.entries())
      .sort(([, a], [, b]) => a.lastActivity - b.lastActivity);
    
    // Remove oldest conversations
    const toRemove = sortedConversations.slice(0, this.conversations.size - this.maxConversations);
    
    this.logger.info(`🧹 Cleaning up ${toRemove.length} old conversations to stay within limit`);
    
    for (const [id] of toRemove) {
      await this.deleteConversation(id);
    }
  }
}

module.exports = { ConversationManager, Conversation };
