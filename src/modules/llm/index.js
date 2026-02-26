/**
 * KevinJr LLM Module
 * Multi-provider AI integration with intelligent conversation management
 * "Never says no - always finds a way!"
 */

const winston = require('winston');
const OpenAIProvider = require('./providers/openai-provider');
const AnthropicProvider = require('./providers/anthropic-provider');
const HuggingFaceProvider = require('./providers/huggingface-provider');
const CohereProvider = require('./providers/cohere-provider');
const ReplicateProvider = require('./providers/replicate-provider');
const TogetherProvider = require('./providers/together-provider');
const GroqProvider = require('./providers/groq-provider');
const ProviderRouter = require('./providers/provider-router');
const { ConversationManager } = require('./conversation/conversation-manager');
const TokenManager = require('./conversation/token-manager');

class LLMModule {
  constructor(engine) {
    this.engine = engine;
    this.name = 'llm';
    this.version = '1.0.0';
    this.logger = null;
    
    // Providers
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackProviders = [];
    this.providerRouter = null;
    
    // Conversation management
    this.conversationManager = null;
    this.tokenManager = null;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      providerUsage: {}
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the LLM module
   */
  async initialize() {
    try {
      this.logger.info('🧠 LLM module initializing...');
      
      // Get module configuration
      const config = this.engine.config.getModuleConfig('llm');
      
      // Initialize token manager
      this.tokenManager = new TokenManager(config);
      await this.tokenManager.initialize();
      
      // Initialize conversation manager
      this.conversationManager = new ConversationManager(config, this.tokenManager);
      await this.conversationManager.initialize();
      
      // Initialize providers
      await this._initializeProviders(config);
      
      // Initialize provider router
      this.providerRouter = new ProviderRouter(this.providers, config.routing || {});
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Validate at least one provider is available
      if (this.providers.size === 0) {
        this.logger.warn('⚠️ No LLM providers configured. Please set up API keys for OpenAI, Anthropic, HuggingFace, Cohere, Replicate, Together AI, or Groq.');
        // Don't throw error - allow graceful degradation
      }
      
      this.logger.info(`✅ LLM module ready with ${this.providers.size} providers`);
      return true;
      
    } catch (error) {
      this.logger.error('💥 LLM module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute LLM commands
   */
  async execute(command, params = {}, context = {}) {
    try {
      this.stats.totalRequests++;
      
      switch (command) {
        case 'chat':
        case 'ask':
          return await this._handleChatCommand(params, context);
          
        case 'complete':
          return await this._handleCompletionCommand(params, context);
          
        case 'analyze':
          return await this._handleAnalysisCommand(params, context);
          
        case 'summarize':
          return await this._handleSummarizeCommand(params, context);
          
        case 'translate':
          return await this._handleTranslateCommand(params, context);
          
        case 'code':
          return await this._handleCodeCommand(params, context);
          
        case 'status':
          return this._getStatus();
          
        case 'stats':
          return this._getStats();
          
        case 'providers':
          return this._getProviders();
          
        case 'switch-provider':
          return await this._switchProvider(params.provider);
          
        default:
          // KevinJr never says no - try to interpret as a chat message
          return await this._handleChatCommand({ message: command, ...params }, context);
      }
      
    } catch (error) {
      this.stats.failedRequests++;
      this.logger.error(`💥 LLM command failed: ${command}`, error);
      
      // KevinJr tries to recover gracefully
      return await this._handleError(command, params, context, error);
    }
  }

  /**
   * Check if module can handle a command
   */
  canHandle(command) {
    const supportedCommands = [
      'chat', 'ask', 'complete', 'analyze', 'summarize', 
      'translate', 'code', 'status', 'stats', 'providers', 'switch-provider'
    ];
    
    return supportedCommands.includes(command) || 
           command.startsWith('llm:') ||
           this._isNaturalLanguageQuery(command);
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return [
      'Natural language conversation',
      'Text completion and generation',
      'Code generation and analysis',
      'Text summarization',
      'Language translation',
      'Content analysis',
      'Multi-provider support',
      'Conversation memory',
      'Token optimization',
      'Streaming responses'
    ];
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      healthy: true,
      providers: {},
      conversations: 0,
      stats: this.stats
    };
    
    // Check each provider
    for (const [name, provider] of this.providers) {
      try {
        const providerHealth = await provider.healthCheck();
        health.providers[name] = providerHealth;
        
        if (!providerHealth.healthy) {
          health.healthy = false;
        }
      } catch (error) {
        health.providers[name] = { healthy: false, error: error.message };
        health.healthy = false;
      }
    }
    
    // Check conversation manager
    if (this.conversationManager) {
      health.conversations = this.conversationManager.getActiveConversationCount();
    }
    
    return health;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 LLM module cleanup...');
    
    // Cleanup providers
    for (const [name, provider] of this.providers) {
      try {
        if (provider.cleanup) {
          await provider.cleanup();
        }
      } catch (error) {
        this.logger.error(`💥 Error cleaning up provider ${name}:`, error);
      }
    }
    
    // Cleanup conversation manager
    if (this.conversationManager) {
      await this.conversationManager.cleanup();
    }
    
    // Cleanup token manager
    if (this.tokenManager) {
      await this.tokenManager.cleanup();
    }
    
    this.providers.clear();
    this.logger.info('✅ LLM module cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [LLM] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _initializeProviders(config) {
    this.logger.info('🔌 Initializing LLM providers...');
    
    // Initialize OpenAI provider
    const openaiKey = this.engine.config.getSecret('openai.apiKey');
    if (openaiKey) {
      try {
        const openaiProvider = new OpenAIProvider({
          apiKey: openaiKey,
          model: config.openai?.model || 'gpt-4',
          ...config.openai
        });
        
        await openaiProvider.initialize();
        this.providers.set('openai', openaiProvider);
        this.logger.info('✅ OpenAI provider initialized');
      } catch (error) {
        this.logger.error('💥 OpenAI provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  OpenAI API key not configured');
    }
    
    // Initialize Anthropic provider
    const anthropicKey = this.engine.config.getSecret('anthropic.apiKey');
    if (anthropicKey) {
      try {
        const anthropicProvider = new AnthropicProvider({
          apiKey: anthropicKey,
          model: config.anthropic?.model || 'claude-3-sonnet-20240229',
          ...config.anthropic
        });
        
        await anthropicProvider.initialize();
        this.providers.set('anthropic', anthropicProvider);
        this.logger.info('✅ Anthropic provider initialized');
      } catch (error) {
        this.logger.error('💥 Anthropic provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  Anthropic API key not configured');
    }
    
    // Initialize HuggingFace provider
    const huggingfaceKey = this.engine.config.getSecret('huggingface.apiKey');
    if (huggingfaceKey) {
      try {
        const huggingfaceProvider = new HuggingFaceProvider({
          apiKey: huggingfaceKey,
          ...config.huggingface
        });
        
        await huggingfaceProvider.initialize();
        this.providers.set('huggingface', huggingfaceProvider);
        this.logger.info('✅ HuggingFace provider initialized');
      } catch (error) {
        this.logger.error('💥 HuggingFace provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  HuggingFace API key not configured');
    }
    
    // Initialize Cohere provider
    const cohereKey = this.engine.config.getSecret('cohere.apiKey');
    if (cohereKey) {
      try {
        const cohereProvider = new CohereProvider({
          apiKey: cohereKey,
          model: config.cohere?.model || 'command',
          ...config.cohere
        });
        
        await cohereProvider.initialize();
        this.providers.set('cohere', cohereProvider);
        this.logger.info('✅ Cohere provider initialized');
      } catch (error) {
        this.logger.error('💥 Cohere provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  Cohere API key not configured');
    }
    
    // Initialize Replicate provider
    const replicateKey = this.engine.config.getSecret('replicate.apiKey');
    if (replicateKey) {
      try {
        const replicateProvider = new ReplicateProvider({
          apiKey: replicateKey,
          ...config.replicate
        });
        
        await replicateProvider.initialize();
        this.providers.set('replicate', replicateProvider);
        this.logger.info('✅ Replicate provider initialized');
      } catch (error) {
        this.logger.error('💥 Replicate provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  Replicate API key not configured');
    }
    
    // Initialize Together AI provider
    const togetherKey = this.engine.config.getSecret('together.apiKey');
    if (togetherKey) {
      try {
        const togetherProvider = new TogetherProvider({
          apiKey: togetherKey,
          model: config.together?.model || 'meta-llama/Llama-2-70b-chat-hf',
          ...config.together
        });
        
        await togetherProvider.initialize();
        this.providers.set('together', togetherProvider);
        this.logger.info('✅ Together AI provider initialized');
      } catch (error) {
        this.logger.error('💥 Together AI provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  Together AI API key not configured');
    }
    
    // Initialize Groq provider
    const groqKey = this.engine.config.getSecret('groq.apiKey');
    if (groqKey) {
      try {
        const groqProvider = new GroqProvider({
          apiKey: groqKey,
          model: config.groq?.model || 'mixtral-8x7b-32768',
          ...config.groq
        });
        
        await groqProvider.initialize();
        this.providers.set('groq', groqProvider);
        this.logger.info('✅ Groq provider initialized');
      } catch (error) {
        this.logger.error('💥 Groq provider initialization failed:', error);
      }
    } else {
      this.logger.warn('⚠️  Groq API key not configured');
    }
    
    // Set active provider
    this._selectActiveProvider(config);
  }

  _selectActiveProvider(config) {
    const preferredProvider = config.preferredProvider || 'openai';
    
    if (this.providers.has(preferredProvider)) {
      this.activeProvider = preferredProvider;
    } else {
      // Use first available provider
      this.activeProvider = Array.from(this.providers.keys())[0];
    }
    
    // Set up fallback chain
    this.fallbackProviders = Array.from(this.providers.keys())
      .filter(name => name !== this.activeProvider);
    
    this.logger.info(`🎯 Active provider: ${this.activeProvider}`);
    if (this.fallbackProviders.length > 0) {
      this.logger.info(`🔄 Fallback providers: ${this.fallbackProviders.join(', ')}`);
    }
  }

  _setupEventListeners() {
    // Listen for configuration changes
    this.engine.config.watch('modules.config.llm', async (newConfig) => {
      this.logger.info('🔄 LLM configuration changed, reinitializing...');
      await this._initializeProviders(newConfig);
    });
    
    // Listen for engine events
    this.engine.eventSystem.on('engine:shutdown_start', () => {
      this.logger.info('🛑 Preparing for shutdown...');
    });
  }

  async _handleChatCommand(params, context) {
    const { message, conversationId, stream = false } = params;
    
    if (!message) {
      return {
        success: false,
        error: 'Message is required for chat command'
      };
    }
    
    // Get or create conversation
    const conversation = await this.conversationManager.getOrCreateConversation(
      conversationId || context.sessionId || 'default'
    );
    
    // Add user message to conversation
    conversation.addMessage('user', message);
    
    // Generate response
    const response = await this._generateResponse(conversation, { stream });
    
    // Add assistant response to conversation
    if (response.success) {
      conversation.addMessage('assistant', response.content);
      this.stats.successfulRequests++;
      this.stats.totalTokens += response.tokens || 0;
      this.stats.totalCost += response.cost || 0;
    }
    
    return response;
  }

  async _handleCompletionCommand(params, context) {
    const { prompt, maxTokens = 150 } = params;
    
    if (!prompt) {
      return {
        success: false,
        error: 'Prompt is required for completion command'
      };
    }
    
    return await this._generateCompletion(prompt, { maxTokens });
  }

  async _handleAnalysisCommand(params, context) {
    const { text, type = 'general' } = params;
    
    if (!text) {
      return {
        success: false,
        error: 'Text is required for analysis command'
      };
    }
    
    const analysisPrompt = this._buildAnalysisPrompt(text, type);
    return await this._generateCompletion(analysisPrompt);
  }

  async _handleSummarizeCommand(params, context) {
    const { text, length = 'medium' } = params;
    
    if (!text) {
      return {
        success: false,
        error: 'Text is required for summarize command'
      };
    }
    
    const summaryPrompt = this._buildSummaryPrompt(text, length);
    return await this._generateCompletion(summaryPrompt);
  }

  async _handleTranslateCommand(params, context) {
    const { text, targetLanguage, sourceLanguage = 'auto' } = params;
    
    if (!text || !targetLanguage) {
      return {
        success: false,
        error: 'Text and target language are required for translate command'
      };
    }
    
    const translatePrompt = this._buildTranslatePrompt(text, sourceLanguage, targetLanguage);
    return await this._generateCompletion(translatePrompt);
  }

  async _handleCodeCommand(params, context) {
    const { task, language = 'javascript', description } = params;
    
    if (!task) {
      return {
        success: false,
        error: 'Task description is required for code command'
      };
    }
    
    const codePrompt = this._buildCodePrompt(task, language, description);
    return await this._generateCompletion(codePrompt);
  }

  async _generateResponse(conversation, options = {}) {
    // Use provider router for intelligent routing
    if (this.providerRouter && this.providers.size > 0) {
      try {
        const result = await this.providerRouter.execute('chat', {
          messages: conversation.getMessages()
        }, options);
        
        // Update provider usage stats
        this._updateProviderStats(result.provider, result);
        
        return {
          success: true,
          content: result.content,
          provider: result.provider,
          tokens: result.tokens,
          cost: result.cost,
          model: result.model,
          routing: result.routing
        };
        
      } catch (error) {
        this.logger.error('💥 Provider router failed:', error);
        // Fall back to manual provider selection
      }
    }
    
    // Fallback to manual provider selection
    const providers = [this.activeProvider, ...this.fallbackProviders];
    
    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName);
        if (!provider) continue;
        
        this.logger.info(`🤖 Generating response with ${providerName}...`);
        
        const response = await provider.generateResponse(
          conversation.getMessages(),
          options
        );
        
        // Update provider usage stats
        this._updateProviderStats(providerName, response);
        
        return {
          success: true,
          content: response.content,
          provider: providerName,
          tokens: response.tokens,
          cost: response.cost,
          model: response.model
        };
        
      } catch (error) {
        this.logger.error(`💥 Provider ${providerName} failed:`, error);
        
        // Try next provider
        if (providerName === providers[providers.length - 1]) {
          // Last provider failed
          throw error;
        }
      }
    }
    
    throw new Error('All providers failed');
  }

  async _generateCompletion(prompt, options = {}) {
    const providers = [this.activeProvider, ...this.fallbackProviders];
    
    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName);
        if (!provider) continue;
        
        this.logger.info(`🤖 Generating completion with ${providerName}...`);
        
        const response = await provider.generateCompletion(prompt, options);
        
        // Update provider usage stats
        this._updateProviderStats(providerName, response);
        
        return {
          success: true,
          content: response.content,
          provider: providerName,
          tokens: response.tokens,
          cost: response.cost,
          model: response.model
        };
        
      } catch (error) {
        this.logger.error(`💥 Provider ${providerName} failed:`, error);
        
        // Try next provider
        if (providerName === providers[providers.length - 1]) {
          // Last provider failed
          throw error;
        }
      }
    }
    
    throw new Error('All providers failed');
  }

  async _handleError(command, params, context, error) {
    // KevinJr never says no - try to provide helpful alternatives
    this.logger.info('🔄 Attempting error recovery...');
    
    return {
      success: false,
      error: error.message,
      message: `I encountered an issue with "${command}", but I'm always finding new ways to help!`,
      suggestions: [
        'Try rephrasing your request',
        'Check if your API keys are configured correctly',
        'Try switching to a different provider',
        'Contact support if the issue persists'
      ],
      recovery: 'I never give up - let me know how else I can assist you!',
      motto: 'Never says no - always finds a way!'
    };
  }

  _isNaturalLanguageQuery(command) {
    // Simple heuristic to detect natural language
    return command.length > 10 && 
           (command.includes(' ') || command.includes('?')) &&
           !command.startsWith('/') &&
           !command.includes(':');
  }

  _buildAnalysisPrompt(text, type) {
    const prompts = {
      general: `Please analyze the following text and provide insights:\n\n${text}`,
      sentiment: `Analyze the sentiment of the following text:\n\n${text}`,
      technical: `Provide a technical analysis of the following content:\n\n${text}`,
      business: `Analyze this from a business perspective:\n\n${text}`
    };
    
    return prompts[type] || prompts.general;
  }

  _buildSummaryPrompt(text, length) {
    const lengthMap = {
      short: 'in 1-2 sentences',
      medium: 'in a brief paragraph',
      long: 'in detail'
    };
    
    return `Please summarize the following text ${lengthMap[length] || lengthMap.medium}:\n\n${text}`;
  }

  _buildTranslatePrompt(text, sourceLanguage, targetLanguage) {
    return `Translate the following text from ${sourceLanguage} to ${targetLanguage}:\n\n${text}`;
  }

  _buildCodePrompt(task, language, description) {
    let prompt = `Generate ${language} code for the following task: ${task}`;
    
    if (description) {
      prompt += `\n\nAdditional details: ${description}`;
    }
    
    prompt += '\n\nPlease provide clean, well-commented code with explanations.';
    
    return prompt;
  }

  _updateProviderStats(providerName, response) {
    if (!this.stats.providerUsage[providerName]) {
      this.stats.providerUsage[providerName] = {
        requests: 0,
        tokens: 0,
        cost: 0
      };
    }
    
    this.stats.providerUsage[providerName].requests++;
    this.stats.providerUsage[providerName].tokens += response.tokens || 0;
    this.stats.providerUsage[providerName].cost += response.cost || 0;
  }

  async _switchProvider(providerName) {
    if (!this.providers.has(providerName)) {
      return {
        success: false,
        error: `Provider ${providerName} not available`
      };
    }
    
    this.activeProvider = providerName;
    this.fallbackProviders = Array.from(this.providers.keys())
      .filter(name => name !== this.activeProvider);
    
    this.logger.info(`🔄 Switched to provider: ${providerName}`);
    
    return {
      success: true,
      message: `Switched to ${providerName} provider`,
      activeProvider: this.activeProvider,
      fallbackProviders: this.fallbackProviders
    };
  }

  _getStatus() {
    return {
      module: this.name,
      version: this.version,
      activeProvider: this.activeProvider,
      availableProviders: Array.from(this.providers.keys()),
      fallbackProviders: this.fallbackProviders,
      conversations: this.conversationManager ? 
        this.conversationManager.getActiveConversationCount() : 0
    };
  }

  _getStats() {
    return {
      ...this.stats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  _getProviders() {
    const providers = {};
    
    for (const [name, provider] of this.providers) {
      providers[name] = {
        name: provider.name,
        model: provider.model,
        active: name === this.activeProvider,
        available: true
      };
    }
    
    return providers;
  }
}

module.exports = LLMModule;
