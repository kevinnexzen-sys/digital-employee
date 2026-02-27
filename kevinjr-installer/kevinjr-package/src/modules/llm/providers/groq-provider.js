/**
 * Groq Provider for KevinJr
 * Ultra-fast inference with specialized hardware
 */

const axios = require('axios');
const winston = require('winston');

class GroqProvider {
  constructor(config) {
    this.name = 'groq';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.groq.com/openai/v1';
    this.model = config.model || 'mixtral-8x7b-32768';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.logger = null;
    
    // Available models on Groq
    this.models = {
      'chat': {
        'mixtral-8x7b': 'mixtral-8x7b-32768',
        'llama2-70b': 'llama2-70b-4096',
        'gemma-7b': 'gemma-7b-it'
      },
      'code': {
        'mixtral-8x7b': 'mixtral-8x7b-32768', // Good for code
        'llama2-70b': 'llama2-70b-4096'
      }
    };
    
    // Rate limiting - Groq is very fast
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 100; // 100ms - Groq is ultra-fast
    
    // Token pricing (Groq is very cost-effective)
    this.pricing = {
      'mixtral-8x7b-32768': { input: 0.00027, output: 0.00027 },
      'llama2-70b-4096': { input: 0.0007, output: 0.0008 },
      'gemma-7b-it': { input: 0.0001, output: 0.0001 }
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the Groq provider
   */
  async initialize() {
    this.logger.info('⚡ Groq provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('Groq API key is required');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info(`✅ Groq provider ready (model: ${this.model})`);
    return true;
  }

  /**
   * Generate a response from conversation messages
   */
  async generateResponse(messages, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const requestData = {
        model: options.model || this.model,
        messages: this._formatMessages(messages),
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        top_p: options.topP || 1,
        stream: options.stream || false
      };
      
      this.logger.info(`⚡ Generating response with ${requestData.model}...`);
      
      const startTime = Date.now();
      const response = await this._makeRequest('/chat/completions', requestData);
      const duration = Date.now() - startTime;
      
      const result = {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        finishReason: response.choices[0].finish_reason,
        duration: duration,
        tokensPerSecond: response.usage.total_tokens / (duration / 1000)
      };
      
      this.logger.info(`✅ Response generated (${result.tokens} tokens, ${result.tokensPerSecond.toFixed(0)} tok/s, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Groq response generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generateCompletion(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      // Convert to chat format for Groq
      const messages = [{ role: 'user', content: prompt }];
      
      const requestData = {
        model: options.model || this.model,
        messages: messages,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        top_p: options.topP || 1
      };
      
      this.logger.info(`⚡ Generating completion with ${requestData.model}...`);
      
      const startTime = Date.now();
      const response = await this._makeRequest('/chat/completions', requestData);
      const duration = Date.now() - startTime;
      
      const result = {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        finishReason: response.choices[0].finish_reason,
        duration: duration,
        tokensPerSecond: response.usage.total_tokens / (duration / 1000)
      };
      
      this.logger.info(`✅ Completion generated (${result.tokens} tokens, ${result.tokensPerSecond.toFixed(0)} tok/s, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Groq completion generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate code using Groq's fast inference
   */
  async generateCode(task, language = 'javascript', options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.code['mixtral-8x7b'];
      const prompt = this._buildCodePrompt(task, language);
      
      const requestData = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer. Generate clean, well-documented, production-ready code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.2,
        top_p: options.topP || 0.9
      };
      
      this.logger.info(`⚡ Generating ${language} code with ${model}...`);
      
      const startTime = Date.now();
      const response = await this._makeRequest('/chat/completions', requestData);
      const duration = Date.now() - startTime;
      
      const result = {
        content: this._extractCode(response.choices[0].message.content, language),
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        language: language,
        duration: duration,
        tokensPerSecond: response.usage.total_tokens / (duration / 1000)
      };
      
      this.logger.info(`✅ Code generated (${result.tokens} tokens, ${result.tokensPerSecond.toFixed(0)} tok/s, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Groq code generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels() {
    try {
      const response = await this._makeRequest('/models', {}, 'GET');
      
      return {
        models: response.data,
        total: response.data.length
      };
      
    } catch (error) {
      this.logger.error('💥 Failed to get available models:', error);
      return { models: [], total: 0 };
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
        lastRequestTime: this.lastRequestTime,
        features: ['ultra-fast-inference', 'low-latency', 'cost-effective']
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
      models: this.models,
      pricing: this.pricing[this.model] || { input: 0.0003, output: 0.0003 },
      features: [
        'Ultra-fast inference (up to 500+ tokens/second)',
        'Low latency responses',
        'Cost-effective pricing',
        'Specialized hardware acceleration'
      ]
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Groq provider cleanup...');
    this.logger.info('✅ Groq provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Groq] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      // Test with a simple chat completion
      await this._makeRequest('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });
      
      return true;
      
    } catch (error) {
      throw new Error(`Groq connection test failed: ${error.message}`);
    }
  }

  async _makeRequest(endpoint, data, method = 'POST') {
    try {
      const config = {
        method: method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // Groq is fast, but allow reasonable timeout
      };
      
      if (method === 'POST') {
        config.data = data;
      }
      
      const response = await axios(config);
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        const apiError = error.response.data;
        throw new Error(`Groq API Error: ${apiError.error?.message || JSON.stringify(apiError)}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Groq request timeout');
      } else {
        throw new Error(`Groq request failed: ${error.message}`);
      }
    }
  }

  _formatMessages(messages) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  _buildCodePrompt(task, language) {
    return `Write ${language} code for the following task:

Task: ${task}

Requirements:
- Write clean, well-documented code
- Include comments explaining the logic
- Follow best practices for ${language}
- Make the code production-ready
- Optimize for performance and readability

Please provide only the code without additional explanations.`;
  }

  _extractCode(generatedText, language) {
    // Remove markdown code blocks if present
    const codeBlockRegex = new RegExp(`\`\`\`${language}?\\s*([\\s\\S]*?)\`\`\``, 'i');
    const match = generatedText.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    // If no code block, return the text as-is
    return generatedText.trim();
  }

  _calculateCost(model, usage) {
    const modelPricing = this.pricing[model] || { input: 0.0003, output: 0.0003 };
    
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
    if (error.message.includes('rate limit')) {
      return new Error('Groq rate limit exceeded. Please try again later.');
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return new Error('Invalid Groq API key. Please check your configuration.');
    } else if (error.message.includes('timeout')) {
      return new Error('Groq request timed out. Please try again.');
    } else if (error.message.includes('insufficient')) {
      return new Error('Insufficient Groq credits. Please add funds to your account.');
    } else if (error.message.includes('model not found')) {
      return new Error(`Groq model ${this.model} not found or not accessible.`);
    } else {
      return error;
    }
  }
}

module.exports = GroqProvider;

