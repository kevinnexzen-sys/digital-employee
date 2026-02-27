/**
 * KevinJr AI Provider Router
 * Intelligent routing and load balancing across all AI providers
 * "Never says no - always finds a way!"
 */

const winston = require('winston');

class ProviderRouter {
  constructor(providers, config = {}) {
    this.providers = providers;
    this.config = config;
    this.logger = null;
    
    // Provider capabilities mapping
    this.capabilities = {
      'code-generation': ['openai', 'anthropic', 'huggingface', 'cohere'],
      'text-generation': ['openai', 'anthropic', 'cohere', 'together', 'groq'],
      'image-generation': ['openai', 'huggingface', 'replicate'],
      'embeddings': ['openai', 'cohere', 'huggingface'],
      'chat': ['openai', 'anthropic', 'cohere', 'together', 'groq'],
      'completion': ['openai', 'anthropic', 'cohere', 'together', 'groq']
    };
    
    // Provider performance metrics
    this.metrics = new Map();
    
    // Load balancing strategies
    this.strategies = {
      'round-robin': this._roundRobinStrategy.bind(this),
      'least-loaded': this._leastLoadedStrategy.bind(this),
      'fastest': this._fastestStrategy.bind(this),
      'cheapest': this._cheapestStrategy.bind(this),
      'best-quality': this._bestQualityStrategy.bind(this)
    };
    
    this.currentStrategy = config.strategy || 'best-quality';
    this.roundRobinIndex = 0;
    
    this._setupLogger();
  }

  /**
   * Route a request to the best provider
   */
  async route(task, options = {}) {
    try {
      const capability = this._determineCapability(task);
      const availableProviders = this._getAvailableProviders(capability);
      
      if (availableProviders.length === 0) {
        throw new Error(`No providers available for capability: ${capability}`);
      }
      
      // Apply routing strategy
      const selectedProvider = await this._selectProvider(availableProviders, task, options);
      
      this.logger.info(`🎯 Routing ${capability} task to ${selectedProvider}`);
      
      return {
        provider: selectedProvider,
        capability,
        availableProviders,
        strategy: this.currentStrategy
      };
      
    } catch (error) {
      this.logger.error('💥 Provider routing failed:', error);
      throw error;
    }
  }

  /**
   * Execute a task with automatic provider selection and fallback
   */
  async execute(task, params = {}, options = {}) {
    const routing = await this.route(task, options);
    const providers = [routing.provider, ...routing.availableProviders.filter(p => p !== routing.provider)];
    
    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName);
        if (!provider) continue;
        
        const startTime = Date.now();
        
        // Execute the task
        let result;
        switch (task) {
          case 'chat':
          case 'ask':
            result = await provider.generateResponse(params.messages, options);
            break;
          case 'complete':
            result = await provider.generateCompletion(params.prompt, options);
            break;
          case 'code':
            result = await provider.generateCode(params.task, params.language, options);
            break;
          case 'image':
            result = await provider.generateImage(params.prompt, options);
            break;
          case 'embed':
            result = await provider.generateEmbedding(params.text, options);
            break;
          default:
            result = await provider.execute(task, params, options);
        }
        
        const duration = Date.now() - startTime;
        
        // Record metrics
        this._recordMetrics(providerName, task, duration, true, result.cost || 0);
        
        return {
          ...result,
          provider: providerName,
          duration,
          routing: routing
        };
        
      } catch (error) {
        this.logger.warn(`⚠️ Provider ${providerName} failed for ${task}:`, error.message);
        
        // Record failure metrics
        this._recordMetrics(providerName, task, 0, false, 0);
        
        // Try next provider
        continue;
      }
    }
    
    throw new Error(`All providers failed for task: ${task}`);
  }

  /**
   * Get provider health status
   */
  async getProviderHealth() {
    const health = {};
    
    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.healthCheck();
      } catch (error) {
        health[name] = { healthy: false, error: error.message };
      }
    }
    
    return health;
  }

  /**
   * Get routing statistics
   */
  getStats() {
    const stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalCost: 0,
      providers: {}
    };
    
    for (const [provider, metrics] of this.metrics) {
      stats.providers[provider] = {
        requests: metrics.requests,
        successes: metrics.successes,
        failures: metrics.failures,
        averageLatency: metrics.requests > 0 ? metrics.totalLatency / metrics.requests : 0,
        totalCost: metrics.totalCost,
        successRate: metrics.requests > 0 ? (metrics.successes / metrics.requests) * 100 : 0
      };
      
      stats.totalRequests += metrics.requests;
      stats.successfulRequests += metrics.successes;
      stats.failedRequests += metrics.failures;
      stats.totalCost += metrics.totalCost;
    }
    
    stats.averageLatency = stats.totalRequests > 0 ? 
      Array.from(this.metrics.values()).reduce((sum, m) => sum + m.totalLatency, 0) / stats.totalRequests : 0;
    
    return stats;
  }

  /**
   * Update routing strategy
   */
  setStrategy(strategy) {
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown routing strategy: ${strategy}`);
    }
    
    this.currentStrategy = strategy;
    this.logger.info(`🔄 Routing strategy changed to: ${strategy}`);
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [ProviderRouter] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _determineCapability(task) {
    const taskCapabilityMap = {
      'chat': 'chat',
      'ask': 'chat',
      'complete': 'completion',
      'code': 'code-generation',
      'generate-code': 'code-generation',
      'image': 'image-generation',
      'generate-image': 'image-generation',
      'embed': 'embeddings',
      'embedding': 'embeddings'
    };
    
    return taskCapabilityMap[task] || 'text-generation';
  }

  _getAvailableProviders(capability) {
    const capableProviders = this.capabilities[capability] || [];
    return capableProviders.filter(provider => this.providers.has(provider));
  }

  async _selectProvider(availableProviders, task, options) {
    const strategy = this.strategies[this.currentStrategy];
    return await strategy(availableProviders, task, options);
  }

  _roundRobinStrategy(providers) {
    const provider = providers[this.roundRobinIndex % providers.length];
    this.roundRobinIndex++;
    return provider;
  }

  _leastLoadedStrategy(providers) {
    let leastLoaded = providers[0];
    let minLoad = this._getProviderLoad(leastLoaded);
    
    for (const provider of providers.slice(1)) {
      const load = this._getProviderLoad(provider);
      if (load < minLoad) {
        minLoad = load;
        leastLoaded = provider;
      }
    }
    
    return leastLoaded;
  }

  _fastestStrategy(providers) {
    let fastest = providers[0];
    let minLatency = this._getProviderLatency(fastest);
    
    for (const provider of providers.slice(1)) {
      const latency = this._getProviderLatency(provider);
      if (latency < minLatency) {
        minLatency = latency;
        fastest = provider;
      }
    }
    
    return fastest;
  }

  _cheapestStrategy(providers) {
    let cheapest = providers[0];
    let minCost = this._getProviderCost(cheapest);
    
    for (const provider of providers.slice(1)) {
      const cost = this._getProviderCost(provider);
      if (cost < minCost) {
        minCost = cost;
        cheapest = provider;
      }
    }
    
    return cheapest;
  }

  _bestQualityStrategy(providers) {
    // Quality ranking based on provider capabilities and performance
    const qualityRanking = {
      'openai': 9,
      'anthropic': 9,
      'groq': 8,
      'together': 7,
      'cohere': 7,
      'huggingface': 6,
      'replicate': 6
    };
    
    let bestProvider = providers[0];
    let bestScore = this._calculateQualityScore(bestProvider, qualityRanking);
    
    for (const provider of providers.slice(1)) {
      const score = this._calculateQualityScore(provider, qualityRanking);
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }
    
    return bestProvider;
  }

  _calculateQualityScore(provider, qualityRanking) {
    const baseQuality = qualityRanking[provider] || 5;
    const metrics = this.metrics.get(provider);
    
    if (!metrics || metrics.requests === 0) {
      return baseQuality;
    }
    
    const successRate = metrics.successes / metrics.requests;
    const latencyPenalty = Math.min(metrics.totalLatency / metrics.requests / 1000, 2); // Max 2 point penalty
    
    return baseQuality * successRate - latencyPenalty;
  }

  _getProviderLoad(provider) {
    const metrics = this.metrics.get(provider);
    return metrics ? metrics.requests : 0;
  }

  _getProviderLatency(provider) {
    const metrics = this.metrics.get(provider);
    return metrics && metrics.requests > 0 ? metrics.totalLatency / metrics.requests : 1000;
  }

  _getProviderCost(provider) {
    const metrics = this.metrics.get(provider);
    return metrics ? metrics.totalCost : 0;
  }

  _recordMetrics(provider, task, duration, success, cost) {
    if (!this.metrics.has(provider)) {
      this.metrics.set(provider, {
        requests: 0,
        successes: 0,
        failures: 0,
        totalLatency: 0,
        totalCost: 0
      });
    }
    
    const metrics = this.metrics.get(provider);
    metrics.requests++;
    metrics.totalLatency += duration;
    metrics.totalCost += cost;
    
    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }
  }
}

module.exports = ProviderRouter;

