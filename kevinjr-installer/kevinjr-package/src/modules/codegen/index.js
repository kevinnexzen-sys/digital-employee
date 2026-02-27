/**
 * KevinJr Code Generation Module
 * Multi-AI powered full-stack application generator
 * "Never says no - always finds a way!"
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');
const FullStackGenerator = require('./generators/fullstack-generator');
const CodeValidator = require('./validators/code-validator');
const TemplateEngine = require('./templates/template-engine');

class CodeGenModule {
  constructor(engine) {
    this.engine = engine;
    this.name = 'codegen';
    this.version = '1.0.0';
    this.logger = null;
    
    // Generators
    this.fullStackGenerator = null;
    this.codeValidator = null;
    this.templateEngine = null;
    
    // Supported languages and frameworks
    this.supportedLanguages = [
      'javascript', 'typescript', 'python', 'go', 'rust', 'java', 'cpp'
    ];
    
    this.supportedFrameworks = {
      frontend: ['react', 'vue', 'angular', 'svelte', 'vanilla'],
      backend: ['express', 'fastapi', 'gin', 'actix', 'spring', 'fiber'],
      mobile: ['react-native', 'flutter'],
      desktop: ['electron', 'tauri']
    };
    
    this.supportedDatabases = [
      'postgresql', 'mysql', 'mongodb', 'redis', 'sqlite', 'cassandra'
    ];
    
    // Statistics
    this.stats = {
      totalProjects: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      languageUsage: {},
      frameworkUsage: {}
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the CodeGen module
   */
  async initialize() {
    try {
      this.logger.info('💻 CodeGen module initializing...');
      
      // Get module configuration
      const config = this.engine.config.getModuleConfig('codegen');
      
      // Initialize template engine
      this.templateEngine = new TemplateEngine(config.templates || {});
      await this.templateEngine.initialize();
      
      // Initialize code validator
      this.codeValidator = new CodeValidator(this.engine.modules.get('llm'), config.validation || {});
      await this.codeValidator.initialize();
      
      // Initialize full-stack generator
      this.fullStackGenerator = new FullStackGenerator(
        this.engine.modules.get('llm'),
        this.templateEngine,
        this.codeValidator,
        config.generation || {}
      );
      await this.fullStackGenerator.initialize();
      
      this.logger.info('✅ CodeGen module ready');
      return true;
      
    } catch (error) {
      this.logger.error('💥 CodeGen module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute CodeGen commands
   */
  async execute(command, params = {}, context = {}) {
    try {
      this.stats.totalProjects++;
      
      switch (command) {
        case 'generate-app':
        case 'create-app':
          return await this._handleAppGeneration(params, context);
          
        case 'generate-component':
          return await this._handleComponentGeneration(params, context);
          
        case 'generate-api':
          return await this._handleApiGeneration(params, context);
          
        case 'generate-database':
          return await this._handleDatabaseGeneration(params, context);
          
        case 'generate-tests':
          return await this._handleTestGeneration(params, context);
          
        case 'validate-code':
          return await this._handleCodeValidation(params, context);
          
        case 'optimize-code':
          return await this._handleCodeOptimization(params, context);
          
        case 'status':
          return this._getStatus();
          
        case 'stats':
          return this._getStats();
          
        case 'templates':
          return this._getTemplates();
          
        default:
          return {
            success: false,
            error: `Unknown CodeGen command: ${command}`,
            suggestions: [
              'generate-app - Create a full-stack application',
              'generate-component - Create UI components',
              'generate-api - Create API endpoints',
              'generate-database - Create database schemas',
              'generate-tests - Create test suites'
            ]
          };
      }
      
    } catch (error) {
      this.stats.failedGenerations++;
      this.logger.error(`💥 CodeGen command failed: ${command}`, error);
      
      return {
        success: false,
        error: error.message,
        recovery: 'KevinJr never gives up! Try rephrasing your request or check the parameters.',
        motto: 'Never says no - always finds a way!'
      };
    }
  }

  /**
   * Check if module can handle a command
   */
  canHandle(command) {
    const supportedCommands = [
      'generate-app', 'create-app', 'generate-component', 'generate-api',
      'generate-database', 'generate-tests', 'validate-code', 'optimize-code',
      'status', 'stats', 'templates'
    ];
    
    return supportedCommands.includes(command) || 
           command.startsWith('codegen:') ||
           command.startsWith('generate-') ||
           command.startsWith('create-');
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return [
      'Full-stack application generation',
      'Multi-language code generation',
      'Framework-specific scaffolding',
      'Database schema design',
      'API endpoint generation',
      'Component library creation',
      'Test suite generation',
      'Code validation and optimization',
      'Multi-AI code review',
      'Template-based generation'
    ];
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      healthy: true,
      generators: {},
      stats: this.stats
    };
    
    // Check generators
    try {
      if (this.fullStackGenerator) {
        health.generators.fullStack = await this.fullStackGenerator.healthCheck();
      }
      
      if (this.codeValidator) {
        health.generators.validator = await this.codeValidator.healthCheck();
      }
      
      if (this.templateEngine) {
        health.generators.templates = await this.templateEngine.healthCheck();
      }
      
    } catch (error) {
      health.healthy = false;
      health.error = error.message;
    }
    
    return health;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 CodeGen module cleanup...');
    
    if (this.fullStackGenerator) {
      await this.fullStackGenerator.cleanup();
    }
    
    if (this.codeValidator) {
      await this.codeValidator.cleanup();
    }
    
    if (this.templateEngine) {
      await this.templateEngine.cleanup();
    }
    
    this.logger.info('✅ CodeGen module cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [CodeGen] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _handleAppGeneration(params, context) {
    const {
      name,
      description,
      type = 'fullstack',
      frontend = 'react',
      backend = 'express',
      database = 'postgresql',
      features = [],
      outputPath
    } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'App name is required'
      };
    }
    
    this.logger.info(`💻 Generating ${type} app: ${name}`);
    
    const result = await this.fullStackGenerator.generateApp({
      name,
      description,
      type,
      frontend,
      backend,
      database,
      features,
      outputPath: outputPath || path.join(process.cwd(), 'generated', name)
    });
    
    if (result.success) {
      this.stats.successfulGenerations++;
      this._updateUsageStats('framework', frontend);
      this._updateUsageStats('framework', backend);
    }
    
    return result;
  }

  async _handleComponentGeneration(params, context) {
    const {
      name,
      type = 'react',
      props = [],
      styling = 'css',
      outputPath
    } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'Component name is required'
      };
    }
    
    this.logger.info(`🧩 Generating ${type} component: ${name}`);
    
    const result = await this.fullStackGenerator.generateComponent({
      name,
      type,
      props,
      styling,
      outputPath
    });
    
    return result;
  }

  async _handleApiGeneration(params, context) {
    const {
      name,
      endpoints = [],
      framework = 'express',
      database = 'postgresql',
      authentication = false,
      outputPath
    } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'API name is required'
      };
    }
    
    this.logger.info(`🔌 Generating ${framework} API: ${name}`);
    
    const result = await this.fullStackGenerator.generateAPI({
      name,
      endpoints,
      framework,
      database,
      authentication,
      outputPath
    });
    
    return result;
  }

  async _handleDatabaseGeneration(params, context) {
    const {
      name,
      type = 'postgresql',
      tables = [],
      relationships = [],
      outputPath
    } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'Database name is required'
      };
    }
    
    this.logger.info(`🗄️ Generating ${type} database: ${name}`);
    
    const result = await this.fullStackGenerator.generateDatabase({
      name,
      type,
      tables,
      relationships,
      outputPath
    });
    
    return result;
  }

  async _handleTestGeneration(params, context) {
    const {
      target,
      type = 'unit',
      framework = 'jest',
      coverage = true,
      outputPath
    } = params;
    
    if (!target) {
      return {
        success: false,
        error: 'Test target is required'
      };
    }
    
    this.logger.info(`🧪 Generating ${type} tests for: ${target}`);
    
    const result = await this.fullStackGenerator.generateTests({
      target,
      type,
      framework,
      coverage,
      outputPath
    });
    
    return result;
  }

  async _handleCodeValidation(params, context) {
    const { code, language, rules = [] } = params;
    
    if (!code) {
      return {
        success: false,
        error: 'Code is required for validation'
      };
    }
    
    this.logger.info(`🔍 Validating ${language} code...`);
    
    const result = await this.codeValidator.validate(code, language, rules);
    
    return result;
  }

  async _handleCodeOptimization(params, context) {
    const { code, language, optimizations = ['performance', 'readability'] } = params;
    
    if (!code) {
      return {
        success: false,
        error: 'Code is required for optimization'
      };
    }
    
    this.logger.info(`⚡ Optimizing ${language} code...`);
    
    const result = await this.codeValidator.optimize(code, language, optimizations);
    
    return result;
  }

  _updateUsageStats(category, item) {
    if (!this.stats[`${category}Usage`]) {
      this.stats[`${category}Usage`] = {};
    }
    
    if (!this.stats[`${category}Usage`][item]) {
      this.stats[`${category}Usage`][item] = 0;
    }
    
    this.stats[`${category}Usage`][item]++;
  }

  _getStatus() {
    return {
      module: this.name,
      version: this.version,
      supportedLanguages: this.supportedLanguages,
      supportedFrameworks: this.supportedFrameworks,
      supportedDatabases: this.supportedDatabases,
      generators: {
        fullStack: !!this.fullStackGenerator,
        validator: !!this.codeValidator,
        templates: !!this.templateEngine
      }
    };
  }

  _getStats() {
    return {
      ...this.stats,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  _getTemplates() {
    return this.templateEngine ? this.templateEngine.getAvailableTemplates() : {};
  }
}

module.exports = CodeGenModule;

