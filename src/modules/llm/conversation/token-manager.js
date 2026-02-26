/**
 * KevinJr Token Manager
 * Manages token counting, cost tracking, and optimization
 */

const winston = require('winston');

class TokenManager {
  constructor(config) {
    this.config = config;
    this.logger = null;
    
    // Token tracking
    this.totalTokensUsed = 0;
    this.totalCost = 0;
    this.sessionStats = new Map();
    
    // Cost tracking by provider
    this.providerCosts = new Map();
    
    // Optimization settings
    this.maxTokensPerRequest = config.maxTokensPerRequest || 4000;
    this.costThreshold = config.costThreshold || 10.0; // $10 warning threshold
    this.optimizationEnabled = config.optimizationEnabled !== false;
    
    this._setupLogger();
  }

  /**
   * Initialize the token manager
   */
  async initialize() {
    this.logger.info('🔢 Token manager initializing...');
    
    // Load persisted stats if available
    await this._loadPersistedStats();
    
    this.logger.info('✅ Token manager ready');
    return true;
  }

  /**
   * Estimate tokens for a text string
   * Simple approximation: ~4 characters per token for English text
   */
  estimateTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }
    
    // More accurate estimation based on text characteristics
    const words = text.split(/\s+/).length;
    const characters = text.length;
    
    // Rough estimation: 1 token ≈ 0.75 words or 4 characters
    const wordBasedEstimate = Math.ceil(words / 0.75);
    const charBasedEstimate = Math.ceil(characters / 4);
    
    // Use the higher estimate for safety
    return Math.max(wordBasedEstimate, charBasedEstimate);
  }

  /**
   * Estimate tokens for a conversation
   */
  estimateConversationTokens(messages) {
    let totalTokens = 0;
    
    for (const message of messages) {
      // Add tokens for role and content
      totalTokens += this.estimateTokens(message.role);
      totalTokens += this.estimateTokens(message.content);
      
      // Add overhead for message structure
      totalTokens += 4; // Approximate overhead per message
    }
    
    return totalTokens;
  }

  /**
   * Check if a request would exceed token limits
   */
  checkTokenLimits(estimatedTokens, maxTokens = null) {
    const limit = maxTokens || this.maxTokensPerRequest;
    
    if (estimatedTokens > limit) {
      return {
        withinLimit: false,
        estimatedTokens,
        limit,
        suggestion: 'Consider reducing the conversation context or message length'
      };
    }
    
    return {
      withinLimit: true,
      estimatedTokens,
      limit
    };
  }

  /**
   * Record token usage and cost
   */
  recordUsage(provider, model, tokens, cost, sessionId = 'default') {
    // Update totals
    this.totalTokensUsed += tokens;
    this.totalCost += cost;
    
    // Update provider costs
    if (!this.providerCosts.has(provider)) {
      this.providerCosts.set(provider, { tokens: 0, cost: 0, requests: 0 });
    }
    
    const providerStats = this.providerCosts.get(provider);
    providerStats.tokens += tokens;
    providerStats.cost += cost;
    providerStats.requests += 1;
    
    // Update session stats
    if (!this.sessionStats.has(sessionId)) {
      this.sessionStats.set(sessionId, { tokens: 0, cost: 0, requests: 0 });
    }
    
    const sessionStat = this.sessionStats.get(sessionId);
    sessionStat.tokens += tokens;
    sessionStat.cost += cost;
    sessionStat.requests += 1;
    
    this.logger.info(`📊 Usage recorded: ${tokens} tokens, $${cost.toFixed(4)} (${provider}/${model})`);
    
    // Check cost threshold
    this._checkCostThreshold();
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      totalCost: this.totalCost,
      averageCostPerToken: this.totalTokensUsed > 0 ? 
        this.totalCost / this.totalTokensUsed : 0,
      providerBreakdown: Object.fromEntries(this.providerCosts),
      sessionCount: this.sessionStats.size,
      costThreshold: this.costThreshold,
      thresholdExceeded: this.totalCost > this.costThreshold
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    return this.sessionStats.get(sessionId) || { tokens: 0, cost: 0, requests: 0 };
  }

  /**
   * Optimize conversation for token efficiency
   */
  optimizeConversation(messages, targetTokens = null) {
    if (!this.optimizationEnabled) {
      return messages;
    }
    
    const target = targetTokens || Math.floor(this.maxTokensPerRequest * 0.7); // 70% of limit
    const currentTokens = this.estimateConversationTokens(messages);
    
    if (currentTokens <= target) {
      return messages; // No optimization needed
    }
    
    this.logger.info(`🔧 Optimizing conversation: ${currentTokens} → ${target} tokens`);
    
    // Keep system message and recent messages
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // Calculate how many recent messages we can keep
    let optimizedMessages = [...systemMessages];
    let tokenCount = this.estimateConversationTokens(systemMessages);
    
    // Add messages from the end until we approach the target
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const message = otherMessages[i];
      const messageTokens = this.estimateTokens(message.content) + 4; // +4 for overhead
      
      if (tokenCount + messageTokens <= target) {
        optimizedMessages.unshift(message);
        tokenCount += messageTokens;
      } else {
        break;
      }
    }
    
    // Ensure we have at least the last user message and assistant response
    if (optimizedMessages.length < systemMessages.length + 2 && otherMessages.length >= 2) {
      const lastMessages = otherMessages.slice(-2);
      optimizedMessages = [...systemMessages, ...lastMessages];
    }
    
    const finalTokens = this.estimateConversationTokens(optimizedMessages);
    this.logger.info(`✅ Conversation optimized: ${messages.length} → ${optimizedMessages.length} messages, ${finalTokens} tokens`);
    
    return optimizedMessages;
  }

  /**
   * Get cost estimate for a request
   */
  estimateCost(provider, model, estimatedTokens, inputOutputRatio = 0.5) {
    // Default pricing (should be updated with actual provider pricing)
    const pricing = {
      openai: {
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
      },
      anthropic: {
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
      }
    };
    
    const modelPricing = pricing[provider]?.[model];
    if (!modelPricing) {
      // Default fallback pricing
      return (estimatedTokens / 1000) * 0.02; // $0.02 per 1K tokens
    }
    
    const inputTokens = Math.floor(estimatedTokens * inputOutputRatio);
    const outputTokens = estimatedTokens - inputTokens;
    
    const inputCost = (inputTokens / 1000) * modelPricing.input;
    const outputCost = (outputTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.logger.info('🔄 Resetting token statistics...');
    
    this.totalTokensUsed = 0;
    this.totalCost = 0;
    this.sessionStats.clear();
    this.providerCosts.clear();
    
    this.logger.info('✅ Token statistics reset');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Token manager cleanup...');
    
    // Persist stats before cleanup
    await this._persistStats();
    
    this.sessionStats.clear();
    this.providerCosts.clear();
    
    this.logger.info('✅ Token manager cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [TokenManager] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _checkCostThreshold() {
    if (this.totalCost > this.costThreshold) {
      this.logger.warn(`⚠️  Cost threshold exceeded: $${this.totalCost.toFixed(2)} > $${this.costThreshold}`);
      
      // Could emit an event here for notifications
      // this.emit('cost-threshold-exceeded', { totalCost: this.totalCost, threshold: this.costThreshold });
    }
  }

  async _loadPersistedStats() {
    // In a real implementation, this would load from a file or database
    // For now, we'll just log that we're ready to load stats
    this.logger.debug('📂 Ready to load persisted token statistics');
  }

  async _persistStats() {
    // In a real implementation, this would save to a file or database
    // For now, we'll just log the current stats
    this.logger.debug('💾 Ready to persist token statistics', this.getStats());
  }
}

module.exports = TokenManager;
