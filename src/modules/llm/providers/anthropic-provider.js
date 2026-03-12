/**
 * Anthropic Provider for KevinJr
 * Claude 3 and other Anthropic models integration
 */

const axios = require('axios');
const winston = require('winston');

class AnthropicProvider {
  constructor(config) {
    this.name = 'anthropic';
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-3-sonnet-20240229';
    this.baseURL = config.baseURL || 'https://api.anthropic.com/v1';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.logger = null;
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 1000; // 1 second between requests
    
    // Token pricing (approximate, in USD per 1K tokens)
    this.pricing = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the Anthropic provider
   */
  async initialize() {
    this.logger.info('🤖 Anthropic provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    if (!this.apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info(`✅ Anthropic provider ready (model: ${this.model})`);
    return true;
  }

  /**
   * Generate a response from conversation messages
   */
  async generateResponse(messages, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const { system, messages: formattedMessages } = this._formatMessages(messages);
      
      const requestData = {
        model: this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        messages: formattedMessages
      };
      
      // Add system message if present
      if (system) {
        requestData.system = system;
      }
      
      this.logger.info(`🤖 Generating response with ${this.model}...`);
      
      const response = await this._makeRequest('/messages', requestData);
      
      const result = {
        content: response.content[0].text,
        model: response.model,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this._calculateCost(response.usage),
        finishReason: response.stop_reason
      };
      
      this.logger.info(`✅ Response generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Anthropic response generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generateCompletion(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const requestData = {
        model: this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        messages: [{ role: 'user', content: prompt }]
      };
      
      this.logger.info(`🤖 Generating completion with ${this.model}...`);
      
      const response = await this._makeRequest('/messages', requestData);
      
      const result = {
        content: response.content[0].text,
        model: response.model,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
        cost: this._calculateCost(response.usage),
        finishReason: response.stop_reason
      };
      
      this.logger.info(`✅ Completion generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Anthropic completion generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this._testConnection();
      
      return {
        healthy: true,
        provider: this.name,
        model: this.model,
        requestCount: this.requestCount,
        lastRequestTime: this.lastRequestTime
      };
      
    } catch (error) {
      return {
        healthy: false,
        provider: this.name,
        error: error.message
      };
    }
  }

  /**
   * Get provider information
   */
  getInfo() {
    return {
      name: this.name,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      pricing: this.pricing[this.model] || this.pricing['claude-3-sonnet-20240229']
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Anthropic provider cleanup...');
    // No specific cleanup needed for Anthropic
    this.logger.info('✅ Anthropic provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Anthropic] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      // Anthropic doesn't have a models endpoint, so we'll make a minimal request
      const testData = {
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      };
      
      await this._makeRequest('/messages', testData);
      return true;
      
    } catch (error) {
      // If it's just a quota/billing issue, consider it a successful connection test
      if (error.message.includes('credit') || error.message.includes('billing')) {
        this.logger.warn('⚠️  Anthropic connection test passed but billing issue detected');
        return true;
      }
      throw new Error(`Anthropic connection test failed: ${error.message}`);
    }
  }

  async _makeRequest(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000 // 60 seconds for generation
      });
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        // API error response
        const apiError = error.response.data.error;
        throw new Error(`Anthropic API Error: ${apiError.message} (${apiError.type})`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Anthropic request timeout');
      } else {
        throw new Error(`Anthropic request failed: ${error.message}`);
      }
    }
  }

  _formatMessages(messages) {
    let system = null;
    const formattedMessages = [];
    
    for (const message of messages) {
      if (message.role === 'system') {
        // Anthropic handles system messages separately
        system = message.content;
      } else if (message.role === 'user' || message.role === 'assistant') {
        formattedMessages.push({
          role: message.role,
          content: message.content
        });
      }
    }
    
    return { system, messages: formattedMessages };
  }

  _calculateCost(usage) {
    const modelPricing = this.pricing[this.model] || this.pricing['claude-3-sonnet-20240229'];
    
    const inputCost = (usage.input_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.output_tokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  async _enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      this.logger.debug(`⏰ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  _handleError(error) {
    // Map common Anthropic errors to user-friendly messages
    if (error.message.includes('credit_balance_too_low')) {
      return new Error('Anthropic credit balance too low. Please add credits to your account.');
    } else if (error.message.includes('invalid_api_key')) {
      return new Error('Invalid Anthropic API key. Please check your configuration.');
    } else if (error.message.includes('model_not_found')) {
      return new Error(`Anthropic model ${this.model} not found or not accessible.`);
    } else if (error.message.includes('rate_limit_exceeded')) {
      return new Error('Anthropic rate limit exceeded. Please try again later.');
    } else if (error.message.includes('timeout')) {
      return new Error('Anthropic request timed out. Please try again.');
    } else if (error.message.includes('overloaded')) {
      return new Error('Anthropic servers are overloaded. Please try again later.');
    } else {
      return error;
    }
  }
}

module.exports = AnthropicProvider;
