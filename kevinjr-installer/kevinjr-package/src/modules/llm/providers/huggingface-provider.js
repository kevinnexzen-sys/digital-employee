/**
 * HuggingFace Provider for KevinJr
 * CodeT5, StarCoder, BLOOM, Stable Diffusion integration
 */

const axios = require('axios');
const winston = require('winston');

class HuggingFaceProvider {
  constructor(config) {
    this.name = 'huggingface';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api-inference.huggingface.co';
    this.logger = null;
    
    // Model configurations
    this.models = {
      'code': {
        'starcoder': 'bigcode/starcoder',
        'codet5': 'Salesforce/codet5-large',
        'codegen': 'Salesforce/codegen-350M-mono'
      },
      'text': {
        'bloom': 'bigscience/bloom',
        'flan-t5': 'google/flan-t5-large'
      },
      'image': {
        'stable-diffusion': 'runwayml/stable-diffusion-v1-5',
        'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0'
      },
      'embedding': {
        'sentence-transformers': 'sentence-transformers/all-MiniLM-L6-v2'
      }
    };
    
    this.defaultModels = {
      code: this.models.code.starcoder,
      text: this.models.text.bloom,
      image: this.models.image['stable-diffusion'],
      embedding: this.models.embedding['sentence-transformers']
    };
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 2000; // 2 seconds for HF
    
    this._setupLogger();
  }

  /**
   * Initialize the HuggingFace provider
   */
  async initialize() {
    this.logger.info('🤗 HuggingFace provider initializing...');
    
    if (!this.apiKey) {
      this.logger.warn('⚠️ HuggingFace API key not provided, using public inference API');
    }
    
    // Test connection with a simple model
    await this._testConnection();
    
    this.logger.info('✅ HuggingFace provider ready');
    return true;
  }

  /**
   * Generate code using HuggingFace code models
   */
  async generateCode(task, language = 'javascript', options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.defaultModels.code;
      const prompt = this._buildCodePrompt(task, language);
      
      this.logger.info(`🤗 Generating ${language} code with ${model}...`);
      
      const response = await this._makeRequest(model, {
        inputs: prompt,
        parameters: {
          max_new_tokens: options.maxTokens || 500,
          temperature: options.temperature || 0.2,
          do_sample: true,
          return_full_text: false
        }
      });
      
      const generatedText = Array.isArray(response) ? response[0].generated_text : response.generated_text;
      
      return {
        content: this._extractCode(generatedText, language),
        model: model,
        tokens: this._estimateTokens(generatedText),
        cost: this._calculateCost(model, generatedText),
        language: language
      };
      
    } catch (error) {
      this.logger.error('💥 HuggingFace code generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate text completion
   */
  async generateCompletion(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.defaultModels.text;
      
      this.logger.info(`🤗 Generating completion with ${model}...`);
      
      const response = await this._makeRequest(model, {
        inputs: prompt,
        parameters: {
          max_new_tokens: options.maxTokens || 200,
          temperature: options.temperature || 0.7,
          do_sample: true,
          return_full_text: false
        }
      });
      
      const generatedText = Array.isArray(response) ? response[0].generated_text : response.generated_text;
      
      return {
        content: generatedText,
        model: model,
        tokens: this._estimateTokens(generatedText),
        cost: this._calculateCost(model, generatedText)
      };
      
    } catch (error) {
      this.logger.error('💥 HuggingFace completion generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate images using Stable Diffusion
   */
  async generateImage(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.defaultModels.image;
      
      this.logger.info(`🤗 Generating image with ${model}...`);
      
      const response = await this._makeRequest(model, {
        inputs: prompt,
        parameters: {
          num_inference_steps: options.steps || 50,
          guidance_scale: options.guidance || 7.5,
          width: options.width || 512,
          height: options.height || 512
        }
      }, { responseType: 'arraybuffer' });
      
      // Convert to base64
      const base64Image = Buffer.from(response).toString('base64');
      
      return {
        content: `data:image/png;base64,${base64Image}`,
        model: model,
        prompt: prompt,
        cost: this._calculateImageCost(model)
      };
      
    } catch (error) {
      this.logger.error('💥 HuggingFace image generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbedding(text, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.defaultModels.embedding;
      
      this.logger.info(`🤗 Generating embedding with ${model}...`);
      
      const response = await this._makeRequest(model, {
        inputs: text,
        options: {
          wait_for_model: true
        }
      });
      
      return {
        embedding: response,
        model: model,
        dimensions: response.length,
        cost: this._calculateEmbeddingCost(model, text)
      };
      
    } catch (error) {
      this.logger.error('💥 HuggingFace embedding generation failed:', error);
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
        models: Object.keys(this.defaultModels),
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
   * Get available models
   */
  getModels() {
    return this.models;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 HuggingFace provider cleanup...');
    this.logger.info('✅ HuggingFace provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [HuggingFace] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      // Test with a simple text generation
      const testModel = this.models.text['flan-t5'];
      await this._makeRequest(testModel, {
        inputs: 'Hello',
        parameters: { max_new_tokens: 5 }
      });
      
      return true;
      
    } catch (error) {
      throw new Error(`HuggingFace connection test failed: ${error.message}`);
    }
  }

  async _makeRequest(model, data, options = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      const response = await axios.post(
        `${this.baseURL}/models/${model}`,
        data,
        {
          headers,
          timeout: 60000,
          ...options
        }
      );
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        const apiError = error.response.data;
        if (apiError.error) {
          throw new Error(`HuggingFace API Error: ${apiError.error}`);
        }
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('HuggingFace request timeout');
      }
      
      throw new Error(`HuggingFace request failed: ${error.message}`);
    }
  }

  _buildCodePrompt(task, language) {
    const languageComments = {
      javascript: '//',
      python: '#',
      java: '//',
      cpp: '//',
      go: '//',
      rust: '//',
      typescript: '//'
    };
    
    const comment = languageComments[language] || '//';
    
    return `${comment} Task: ${task}
${comment} Language: ${language}
${comment} Generate clean, well-documented code:

`;
  }

  _extractCode(generatedText, language) {
    // Remove any explanatory text and extract just the code
    const lines = generatedText.split('\n');
    const codeLines = [];
    let inCodeBlock = false;
    
    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      
      if (inCodeBlock || this._looksLikeCode(line, language)) {
        codeLines.push(line);
      }
    }
    
    return codeLines.length > 0 ? codeLines.join('\n') : generatedText;
  }

  _looksLikeCode(line, language) {
    const codePatterns = {
      javascript: /^(function|const|let|var|class|if|for|while|\s*\/\/|\s*\*)/,
      python: /^(def|class|if|for|while|import|from|\s*#)/,
      java: /^(public|private|class|interface|if|for|while|\s*\/\/)/,
      cpp: /^(#include|int|void|class|if|for|while|\s*\/\/)/,
      go: /^(package|import|func|type|if|for|\s*\/\/)/,
      rust: /^(fn|struct|impl|use|if|for|while|\s*\/\/)/
    };
    
    const pattern = codePatterns[language];
    return pattern ? pattern.test(line.trim()) : true;
  }

  _estimateTokens(text) {
    // Rough estimation for HuggingFace models
    return Math.ceil(text.length / 4);
  }

  _calculateCost(model, text) {
    // HuggingFace inference API is free for public models
    // For private endpoints, costs vary
    const tokens = this._estimateTokens(text);
    
    if (this.apiKey) {
      // Estimated costs for private endpoints
      return tokens * 0.0001; // $0.0001 per token
    }
    
    return 0; // Free public inference
  }

  _calculateImageCost(model) {
    // Estimated cost for image generation
    return this.apiKey ? 0.02 : 0; // $0.02 per image for private endpoints
  }

  _calculateEmbeddingCost(model, text) {
    const tokens = this._estimateTokens(text);
    return this.apiKey ? tokens * 0.00001 : 0; // $0.00001 per token
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
    if (error.message.includes('Model is currently loading')) {
      return new Error('HuggingFace model is loading. Please try again in a few moments.');
    } else if (error.message.includes('Rate limit')) {
      return new Error('HuggingFace rate limit exceeded. Please try again later.');
    } else if (error.message.includes('timeout')) {
      return new Error('HuggingFace request timed out. Please try again.');
    } else {
      return error;
    }
  }
}

module.exports = HuggingFaceProvider;

