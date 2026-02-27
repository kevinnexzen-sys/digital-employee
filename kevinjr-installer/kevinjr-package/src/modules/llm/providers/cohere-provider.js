/**
 * Cohere Provider for KevinJr
 * Command, Generate, and Embed models integration
 */

const axios = require('axios');
const winston = require('winston');

class CohereProvider {
  constructor(config) {
    this.name = 'cohere';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.cohere.ai/v1';
    this.model = config.model || 'command';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
    this.logger = null;
    
    // Available models
    this.models = {
      'command': 'command',
      'command-light': 'command-light',
      'command-nightly': 'command-nightly'
    };
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 1000;
    
    // Token pricing (approximate, in USD per 1K tokens)
    this.pricing = {
      'command': { input: 0.0015, output: 0.002 },
      'command-light': { input: 0.0003, output: 0.0006 },
      'command-nightly': { input: 0.0015, output: 0.002 }
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the Cohere provider
   */
  async initialize() {
    this.logger.info('🔮 Cohere provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('Cohere API key is required');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info(`✅ Cohere provider ready (model: ${this.model})`);
    return true;
  }

  /**
   * Generate a response from conversation messages
   */
  async generateResponse(messages, options = {}) {
    try {
      await this._enforceRateLimit();
      
      // Convert messages to Cohere format
      const prompt = this._formatMessages(messages);
      
      const requestData = {
        model: options.model || this.model,
        prompt: prompt,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        k: options.topK || 0,
        p: options.topP || 0.75,
        frequency_penalty: options.frequencyPenalty || 0,
        presence_penalty: options.presencePenalty || 0,
        return_likelihoods: 'NONE'
      };
      
      this.logger.info(`🔮 Generating response with ${requestData.model}...`);
      
      const response = await this._makeRequest('/generate', requestData);
      
      const result = {
        content: response.generations[0].text.trim(),
        model: requestData.model,
        tokens: this._calculateTokens(prompt, response.generations[0].text),
        cost: this._calculateCost(requestData.model, prompt, response.generations[0].text),
        finishReason: response.generations[0].finish_reason
      };
      
      this.logger.info(`✅ Response generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cohere response generation failed:', error);
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
        model: options.model || this.model,
        prompt: prompt,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        k: options.topK || 0,
        p: options.topP || 0.75,
        return_likelihoods: 'NONE'
      };
      
      this.logger.info(`🔮 Generating completion with ${requestData.model}...`);
      
      const response = await this._makeRequest('/generate', requestData);
      
      const result = {
        content: response.generations[0].text.trim(),
        model: requestData.model,
        tokens: this._calculateTokens(prompt, response.generations[0].text),
        cost: this._calculateCost(requestData.model, prompt, response.generations[0].text),
        finishReason: response.generations[0].finish_reason
      };
      
      this.logger.info(`✅ Completion generated (${result.tokens} tokens, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cohere completion generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(texts, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const textsArray = Array.isArray(texts) ? texts : [texts];
      
      const requestData = {
        texts: textsArray,
        model: options.model || 'embed-english-v2.0',
        truncate: options.truncate || 'END'
      };
      
      this.logger.info(`🔮 Generating embeddings for ${textsArray.length} texts...`);
      
      const response = await this._makeRequest('/embed', requestData);
      
      const result = {
        embeddings: response.embeddings,
        model: requestData.model,
        dimensions: response.embeddings[0].length,
        texts: textsArray.length,
        cost: this._calculateEmbeddingCost(textsArray)
      };
      
      this.logger.info(`✅ Embeddings generated (${result.dimensions}D, $${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cohere embedding generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Classify text
   */
  async classify(inputs, examples, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const requestData = {
        inputs: Array.isArray(inputs) ? inputs : [inputs],
        examples: examples,
        model: options.model || 'embed-english-v2.0',
        truncate: options.truncate || 'END'
      };
      
      this.logger.info(`🔮 Classifying ${requestData.inputs.length} inputs...`);
      
      const response = await this._makeRequest('/classify', requestData);
      
      const result = {
        classifications: response.classifications,
        model: requestData.model,
        cost: this._calculateClassificationCost(requestData.inputs)
      };
      
      this.logger.info(`✅ Classification completed ($${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cohere classification failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Summarize text
   */
  async summarize(text, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const requestData = {
        text: text,
        length: options.length || 'medium',
        format: options.format || 'paragraph',
        model: options.model || 'summarize-medium',
        additional_command: options.additionalCommand || '',
        temperature: options.temperature || 0.3
      };
      
      this.logger.info(`🔮 Summarizing text (${requestData.length} length)...`);
      
      const response = await this._makeRequest('/summarize', requestData);
      
      const result = {
        summary: response.summary,
        model: requestData.model,
        cost: this._calculateSummarizeCost(text)
      };
      
      this.logger.info(`✅ Summary generated ($${result.cost.toFixed(4)})`);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cohere summarization failed:', error);
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
      models: this.models,
      pricing: this.pricing[this.model] || this.pricing['command']
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Cohere provider cleanup...');
    this.logger.info('✅ Cohere provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Cohere] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      // Test with a simple generation
      await this._makeRequest('/generate', {
        model: this.model,
        prompt: 'Hello',
        max_tokens: 5
      });
      
      return true;
      
    } catch (error) {
      throw new Error(`Cohere connection test failed: ${error.message}`);
    }
  }

  async _makeRequest(endpoint, data) {
    try {
      const response = await axios.post(`${this.baseURL}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Cohere-Version': '2022-12-06'
        },
        timeout: 60000
      });
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        const apiError = error.response.data;
        throw new Error(`Cohere API Error: ${apiError.message || JSON.stringify(apiError)}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Cohere request timeout');
      } else {
        throw new Error(`Cohere request failed: ${error.message}`);
      }
    }
  }

  _formatMessages(messages) {
    // Convert conversation messages to a single prompt
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n\n`;
      }
    }
    
    prompt += 'Assistant:';
    return prompt;
  }

  _calculateTokens(prompt, completion) {
    // Rough estimation: ~4 characters per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(completion.length / 4);
    return promptTokens + completionTokens;
  }

  _calculateCost(model, prompt, completion) {
    const modelPricing = this.pricing[model] || this.pricing['command'];
    
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(completion.length / 4);
    
    const inputCost = (promptTokens / 1000) * modelPricing.input;
    const outputCost = (completionTokens / 1000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  _calculateEmbeddingCost(texts) {
    // Cohere embedding pricing: ~$0.0001 per 1K tokens
    const totalTokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
    return (totalTokens / 1000) * 0.0001;
  }

  _calculateClassificationCost(inputs) {
    // Classification pricing: ~$0.0002 per input
    return inputs.length * 0.0002;
  }

  _calculateSummarizeCost(text) {
    // Summarization pricing: ~$0.0003 per 1K tokens
    const tokens = Math.ceil(text.length / 4);
    return (tokens / 1000) * 0.0003;
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
      return new Error('Cohere rate limit exceeded. Please try again later.');
    } else if (error.message.includes('invalid_api_key')) {
      return new Error('Invalid Cohere API key. Please check your configuration.');
    } else if (error.message.includes('timeout')) {
      return new Error('Cohere request timed out. Please try again.');
    } else if (error.message.includes('insufficient_quota')) {
      return new Error('Cohere quota exceeded. Please check your billing settings.');
    } else {
      return error;
    }
  }
}

module.exports = CohereProvider;

