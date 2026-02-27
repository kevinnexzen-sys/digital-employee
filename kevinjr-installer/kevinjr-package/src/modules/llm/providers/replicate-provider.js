/**
 * Replicate Provider for KevinJr
 * Open source models, image/video generation integration
 */

const axios = require('axios');
const winston = require('winston');

class ReplicateProvider {
  constructor(config) {
    this.name = 'replicate';
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.replicate.com/v1';
    this.logger = null;
    
    // Popular models on Replicate
    this.models = {
      'text': {
        'llama-2-70b': 'meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3',
        'codellama': 'meta/codellama-34b-instruct:1bfb924045802467bbc9fd1b1d5866ae3dcc8557e5b4a5d1e0b0b8c7b8c7b8c7',
        'mistral-7b': 'mistralai/mistral-7b-instruct-v0.1:83b6a56e7c828e667f21fd596c338fd4f0039b46bcfa18d973e8e70e455fda70'
      },
      'image': {
        'stable-diffusion-xl': 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
        'dall-e-3': 'openai/dall-e-3:2b017d9b67edd2ee1401238df49d75da53c523f36e363881e057f5dc3ed3c5b2',
        'midjourney': 'prompthero/openjourney:9936c2001faa2194a261c01381f90e65261879985476014a0a37a334593a05eb'
      },
      'video': {
        'stable-video': 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb1a4919c746077d670cbbe5fc9e78f83b2c7c6e5',
        'runway-gen2': 'runwayml/gen-2:7fb0a3b3ac7b4cf9c8d5c8b9c8d5c8b9c8d5c8b9c8d5c8b9c8d5c8b9c8d5c8b9'
      },
      'audio': {
        'musicgen': 'meta/musicgen-melody:b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2dbe',
        'whisper': 'openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2'
      },
      'code': {
        'code-llama': 'meta/codellama-34b-instruct:1bfb924045802467bbc9fd1b1d5866ae3dcc8557e5b4a5d1e0b0b8c7b8c7b8c7',
        'starcoder': 'bigcode/starcoder:7d77a1f6c5c532e35c5b6c5c532e35c5b6c5c532e35c5b6c5c532e35c5b6c5c5'
      }
    };
    
    // Rate limiting
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimitDelay = config.rateLimitDelay || 2000; // 2 seconds
    
    this._setupLogger();
  }

  /**
   * Initialize the Replicate provider
   */
  async initialize() {
    this.logger.info('🔄 Replicate provider initializing...');
    
    if (!this.apiKey) {
      throw new Error('Replicate API key is required');
    }
    
    // Test the API connection
    await this._testConnection();
    
    this.logger.info('✅ Replicate provider ready');
    return true;
  }

  /**
   * Generate text using language models
   */
  async generateText(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.text['llama-2-70b'];
      
      this.logger.info(`🔄 Generating text with ${model}...`);
      
      const prediction = await this._createPrediction(model, {
        prompt: prompt,
        max_new_tokens: options.maxTokens || 500,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.9,
        repetition_penalty: options.repetitionPenalty || 1.0
      });
      
      const result = await this._waitForCompletion(prediction.id);
      
      return {
        content: Array.isArray(result.output) ? result.output.join('') : result.output,
        model: model,
        predictionId: prediction.id,
        cost: this._calculateCost('text', result),
        status: result.status
      };
      
    } catch (error) {
      this.logger.error('💥 Replicate text generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate code using code models
   */
  async generateCode(task, language = 'javascript', options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.code['code-llama'];
      const prompt = this._buildCodePrompt(task, language);
      
      this.logger.info(`🔄 Generating ${language} code with ${model}...`);
      
      const prediction = await this._createPrediction(model, {
        prompt: prompt,
        max_new_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.2,
        top_p: options.topP || 0.9
      });
      
      const result = await this._waitForCompletion(prediction.id);
      
      return {
        content: this._extractCode(result.output, language),
        model: model,
        predictionId: prediction.id,
        language: language,
        cost: this._calculateCost('code', result)
      };
      
    } catch (error) {
      this.logger.error('💥 Replicate code generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate images
   */
  async generateImage(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.image['stable-diffusion-xl'];
      
      this.logger.info(`🔄 Generating image with ${model}...`);
      
      const prediction = await this._createPrediction(model, {
        prompt: prompt,
        negative_prompt: options.negativePrompt || '',
        width: options.width || 1024,
        height: options.height || 1024,
        num_inference_steps: options.steps || 50,
        guidance_scale: options.guidance || 7.5,
        scheduler: options.scheduler || 'K_EULER',
        num_outputs: options.numOutputs || 1
      });
      
      const result = await this._waitForCompletion(prediction.id);
      
      return {
        images: Array.isArray(result.output) ? result.output : [result.output],
        model: model,
        predictionId: prediction.id,
        prompt: prompt,
        cost: this._calculateCost('image', result)
      };
      
    } catch (error) {
      this.logger.error('💥 Replicate image generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate videos
   */
  async generateVideo(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.video['stable-video'];
      
      this.logger.info(`🔄 Generating video with ${model}...`);
      
      const prediction = await this._createPrediction(model, {
        input_image: options.inputImage,
        prompt: prompt,
        motion_bucket_id: options.motionBucket || 127,
        fps: options.fps || 6,
        num_frames: options.numFrames || 25
      });
      
      const result = await this._waitForCompletion(prediction.id);
      
      return {
        video: result.output,
        model: model,
        predictionId: prediction.id,
        prompt: prompt,
        cost: this._calculateCost('video', result)
      };
      
    } catch (error) {
      this.logger.error('💥 Replicate video generation failed:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Generate audio/music
   */
  async generateAudio(prompt, options = {}) {
    try {
      await this._enforceRateLimit();
      
      const model = options.model || this.models.audio['musicgen'];
      
      this.logger.info(`🔄 Generating audio with ${model}...`);
      
      const prediction = await this._createPrediction(model, {
        prompt: prompt,
        model_version: options.modelVersion || 'melody',
        duration: options.duration || 8,
        top_k: options.topK || 250,
        top_p: options.topP || 0.0,
        temperature: options.temperature || 1.0,
        classifier_free_guidance: options.guidance || 3.0
      });
      
      const result = await this._waitForCompletion(prediction.id);
      
      return {
        audio: result.output,
        model: model,
        predictionId: prediction.id,
        prompt: prompt,
        cost: this._calculateCost('audio', result)
      };
      
    } catch (error) {
      this.logger.error('💥 Replicate audio generation failed:', error);
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
        requestCount: this.requestCount,
        lastRequestTime: this.lastRequestTime,
        availableModels: Object.keys(this.models)
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
    this.logger.info('🧹 Replicate provider cleanup...');
    this.logger.info('✅ Replicate provider cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [Replicate] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      // Test by getting account info
      const response = await axios.get(`${this.baseURL}/account`, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      return true;
      
    } catch (error) {
      throw new Error(`Replicate connection test failed: ${error.message}`);
    }
  }

  async _createPrediction(model, input) {
    try {
      const response = await axios.post(`${this.baseURL}/predictions`, {
        version: model,
        input: input
      }, {
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      this.requestCount++;
      this.lastRequestTime = Date.now();
      
      return response.data;
      
    } catch (error) {
      if (error.response) {
        const apiError = error.response.data;
        throw new Error(`Replicate API Error: ${apiError.detail || JSON.stringify(apiError)}`);
      }
      throw new Error(`Replicate request failed: ${error.message}`);
    }
  }

  async _waitForCompletion(predictionId, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.baseURL}/predictions/${predictionId}`, {
          headers: {
            'Authorization': `Token ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        const prediction = response.data;
        
        if (prediction.status === 'succeeded') {
          return prediction;
        } else if (prediction.status === 'failed') {
          throw new Error(`Prediction failed: ${prediction.error}`);
        } else if (prediction.status === 'canceled') {
          throw new Error('Prediction was canceled');
        }
        
        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        if (error.message.includes('Prediction failed') || error.message.includes('canceled')) {
          throw error;
        }
        // Continue polling on network errors
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    throw new Error('Prediction timed out');
  }

  _buildCodePrompt(task, language) {
    return `Write ${language} code for the following task:

Task: ${task}

Requirements:
- Write clean, well-documented code
- Include comments explaining the logic
- Follow best practices for ${language}
- Make the code production-ready

Code:`;
  }

  _extractCode(output, language) {
    if (Array.isArray(output)) {
      output = output.join('');
    }
    
    // Extract code from markdown code blocks if present
    const codeBlockRegex = new RegExp(`\`\`\`${language}?\\s*([\\s\\S]*?)\`\`\``, 'i');
    const match = output.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }
    
    return output.trim();
  }

  _calculateCost(type, result) {
    // Replicate pricing varies by model and usage
    // These are rough estimates
    const baseCosts = {
      'text': 0.001,    // $0.001 per generation
      'code': 0.002,    // $0.002 per generation
      'image': 0.01,    // $0.01 per image
      'video': 0.05,    // $0.05 per video
      'audio': 0.02     // $0.02 per audio clip
    };
    
    return baseCosts[type] || 0.001;
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
      return new Error('Replicate rate limit exceeded. Please try again later.');
    } else if (error.message.includes('authentication')) {
      return new Error('Invalid Replicate API key. Please check your configuration.');
    } else if (error.message.includes('timeout')) {
      return new Error('Replicate request timed out. Please try again.');
    } else if (error.message.includes('insufficient funds')) {
      return new Error('Insufficient Replicate credits. Please add funds to your account.');
    } else {
      return error;
    }
  }
}

module.exports = ReplicateProvider;

