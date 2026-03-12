/**
 * Together AI Provider for KevinJr
 * Fast inference and custom models integration
 */

const axios = require('axios');
const winston = require('winston');

class TogetherProvider {
  constructor(config) {
    this.name = 'together';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.together.xyz/v1';
    this.model = config.model || 'meta-llama/Llama-2-70b-chat-hf';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.logger = null;
    
    // Available models on Together AI
    this.models = {
      'chat': {
        'llama-2-70b': 'meta-llama/Llama-2-70b-chat-hf',
        'llama-2-13b': 'meta-llama/Llama-2-13b-chat-hf',
        'llama-2-7b': 'meta-llama/Llama-2-7b-chat-hf',
        'mistral-7b': 'mistralai/Mistral-7B-Instruct-v0.1',
        'mixtral-8x7b': 'mistralai/Mixtral-8x7B-Instruct-v0.1'
      },
      'code': {
        'codellama-34b': 'codellama/CodeLlama-34b-Instruct-hf',
        'codellama-13b': 'codellama/CodeLlama-13b-Instruct-hf',
        'codellama-7b': 'codellama/CodeLlama-7b-Instruct-hf',
        'starcoder': 'bigcode/starcoder'
      },
      'completion': {
        'llama-2-70b-base': 'meta-llama/Llama-2-70b-hf',
        'llama-2-13b-base': 'meta-llama/Llama-2-13b-hf',
        'falcon-40b': 'tiiuae/falcon-40b'
      }
    };
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 500; // 500ms - Together is fast
    
    // Token pricing (approximate, in USD per 1K tokens)
    this.pricing = {
      'meta-llama/Llama-2-70b-chat-hf': { input: 0.0009, output: 0.0009 },
      'meta-llama/Llama-2-13b-chat-hf': { input: 0.0003, output: 0.0003 },
      'meta-llama/Llama-2-7b-chat-hf': { input: 0.0002, output: 0.0002 },
      'codellama/CodeLlama-34b-Instruct-hf': { input: 0.0008, output: 0.0008 },
      'mistralai/Mistral-7B-Instruct-v0.1': { input: 0.0002, output: 0.0002 }
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the Together AI provider
   */
  async initialize() {
    this.logger.info('🤝 Together AI provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('Together AI API key is required');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info(`✅ Together AI provider ready (model: ${this.model})`);
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
        top_p: options.topP || 0.7,
        top_k: options.topK || 50,
        repetition_penalty: options.repetitionPenalty || 1.0,
        stream: options.stream || false
      };
      
      this.logger.info(`🤝 Generating response with ${requestData.model}...`);
      
      const response = await this._makeRequest('/chat/completions', requestData);
      
      const result = {
        content: response.choices[0].message.content,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        finishReason: response.choices[0].finish_reason
      };
      
      this.logger.info(`✅ Response generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Together AI response generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate a completion from a prompt
   */
  async generateCompletion(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.completion['llama-2-70b-base'];
      
      const requestData = {
        model: model,
        prompt: prompt,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        top_p: options.topP || 0.7,
        top_k: options.topK || 50,
        repetition_penalty: options.repetitionPenalty || 1.0,
        stop: options.stop || []
      };
      
      this.logger.info(`🤝 Generating completion with ${model}...`);
      
      const response = await this._makeRequest('/completions', requestData);
      
      const result = {
        content: response.choices[0].text,
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        finishReason: response.choices[0].finish_reason
      };
      
      this.logger.info(`✅ Completion generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Together AI completion generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate code using code models
   */
  async generateCode(task, language = 'javascript', options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.code['codellama-34b'];
      const prompt = this._buildCodePrompt(task, language);
      
      const requestData = {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer. Generate clean, well-documented code.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 1500,
        temperature: options.temperature || 0.2,
        top_p: options.topP || 0.9,
        stop: options.stop || ['```', '\n\n\n']
      };
      
      this.logger.info(`🤝 Generating ${language} code with ${model}...`);
      
      const response = await this._makeRequest('/chat/completions', requestData);
      
      const result = {
        content: this._extractCode(response.choices[0].message.content, language),
        model: response.model,
        tokens: response.usage.total_tokens,
        cost: this._calculateCost(response.model, response.usage),
        language: language
      };
      
      this.logger.info(`✅ Code generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Together AI code generation failed:', error);
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
      models: this.models,
      pricing: this.pricing[this.model] || { input: 0.0005, output: 0.0005 }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Together AI provider cleanup...');
    this.logger.info('✅ Together AI provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Together] [${level}] ${message}`;
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
      throw new Error(`Together AI connection test failed: ${error.message}`);
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
        timeout: 60000
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
        throw new Error(`Together AI API Error: ${apiError.error?.message || JSON.stringify(apiError)}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Together AI request timeout');
      } else {
        throw new Error(`Together AI request failed: ${error.message}`);
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
    const modelPricing = this.pricing[model] || { input: 0.0005, output: 0.0005 };
    
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
      return new Error('Together AI rate limit exceeded. Please try again later.');
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      return new Error('Invalid Together AI API key. Please check your configuration.');
    } else if (error.message.includes('timeout')) {
      return new Error('Together AI request timed out. Please try again.');
    } else if (error.message.includes('insufficient')) {
      return new Error('Insufficient Together AI credits. Please add funds to your account.');
    } else {
      return error;
    }
  }
}

module.exports = TogetherProvider;

