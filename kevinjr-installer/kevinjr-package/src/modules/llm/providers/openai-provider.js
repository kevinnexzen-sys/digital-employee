/**
 * OpenAI Provider for KevinJr
 * GPT-4 and other OpenAI models integration
 */

const axios = require('axios');
const winston = require('winston');

class OpenAIProvider {
  constructor(config) {
    this.name = 'openai';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4';
    this.baseURL = config.baseURL || 'https://api.openai.com/v1';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.logger = null;
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 1000; // 1 second between requests
    
    // Token pricing (approximate, in USD per 1K tokens)
    this.pricing = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the OpenAI provider
   */
  async initialize() {
    this.logger.info('🤖 OpenAI provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    if (!this.apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info(`✅ OpenAI provider ready (model: ${this.model})`);
    return true;
  }

  /**
   * Generate a response from conversation messages
   */
  async generateResponse(messages, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const requestData = {
        model: this.model,
        messages: this._formatMessages(messages),
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        stream: options.stream || false
      };
      
      this.logger.info(`🤖 Generating response with ${this.model}...`);
      
      const response = await this._makeRequest('/chat/completions', requestData);
      
      const result = {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.usage),
        finishReason: response.choices[0].finish_reason
      };
      
      this.logger.info(`✅ Response generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 OpenAI response generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generateCompletion(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const messages = [{ role: 'user', content: prompt }];
      
      const requestData = {
        model: this.model,
        messages: messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature
      };
      
      this.logger.info(`🤖 Generating completion with ${this.model}...`);
      
      const response = await this._makeRequest('/chat/completions', requestData);
      
      const result = {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.usage),
        finishReason: response.choices[0].finish_reason
      };
      
      this.logger.info(`✅ Completion generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 OpenAI completion generation failed:', error);
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
      pricing: this.pricing[this.model] || this.pricing['gpt-4']
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 OpenAI provider cleanup...');
    // No specific cleanup needed for OpenAI
    this.logger.info('✅ OpenAI provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [OpenAI] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      // Check if our model is available
      const availableModels = response.data.data.map(model => model.id);
      if (!availableModels.includes(this.model)) {
        this.logger.warn(`⚠️  Model ${this.model} not found, available models:`, availableModels.slice(0, 5));
      }
      
      return true;
      
    } catch (error) {
      throw new Error(`OpenAI connection test failed: ${error.message}`);
    }
  }

  async _makeRequest(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
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
        throw new Error(`OpenAI API Error: ${apiError.message} (${apiError.type})`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('OpenAI request timeout');
      } else {
        throw new Error(`OpenAI request failed: ${error.message}`);
      }
    }
  }

  _formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  _calculateCost(usage) {
    const modelPricing = this.pricing[this.model] || this.pricing['gpt-4'];
    
    const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
    
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
    // Map common OpenAI errors to user-friendly messages
    if (error.message.includes('insufficient_quota')) {
      return new Error('OpenAI quota exceeded. Please check your billing settings.');
    } else if (error.message.includes('invalid_api_key')) {
      return new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.message.includes('model_not_found')) {
      return new Error(`OpenAI model ${this.model} not found or not accessible.`);
    } else if (error.message.includes('rate_limit_exceeded')) {
      return new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.message.includes('timeout')) {
      return new Error('OpenAI request timed out. Please try again.');
    } else {
      return error;
    }
  }
}

module.exports = OpenAIProvider;
