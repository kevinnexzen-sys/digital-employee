/**
 * KevinJr Core Engine
 * Central orchestration and lifecycle management system
 * "Never says no - always finds a way!"
 */

const EventEmitter = require('eventemitter3');
const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

const ConfigManager = require('./config-manager');
const ModuleLoader = require('./module-loader');
const EventSystem = require('./event-system');
const SecurityManager = require('./security/security-manager');

class KevinJrEngine extends EventEmitter {
  constructor() {
    super();
    
    this.name = 'KevinJr';
    this.version = '1.0.0';
    this.status = 'initializing';
    this.startTime = null;
    
    // Core components
    this.config = null;
    this.moduleLoader = null;
    this.eventSystem = null;
    this.security = null;
    this.logger = null;
    
    // Module registry
    this.modules = new Map();
    this.moduleStatus = new Map();
    
    // Graceful shutdown handling
    this.isShuttingDown = false;
    this.shutdownPromise = null;
    
    this._setupLogger();
  }

  /**
   * Initialize the KevinJr engine
   */
  async initialize() {
    try {
      this.logger.info('🚀 Initializing KevinJr Core Engine...');
      this.status = 'initializing';
      this.startTime = new Date();

      // Initialize core components in order
      await this._initializeConfig();
      await this._initializeSecurity();
      await this._initializeEventSystem();
      await this._initializeModuleLoader();
      
      // Load and initialize modules
      await this._loadModules();
      
      // Start core services
      await this._startServices();
      
      this.status = 'running';
      this.logger.info('✅ KevinJr Core Engine initialized successfully!');
      this.logger.info(`💙 Your digital companion is ready to help!`);
      
      this.emit('engine:ready');
      
      return true;
      
    } catch (error) {
      this.status = 'error';
      this.logger.error('💥 Failed to initialize KevinJr engine:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown of the engine
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return this.shutdownPromise;
    }
    
    this.isShuttingDown = true;
    this.shutdownPromise = this._performShutdown();
    
    return this.shutdownPromise;
  }

  async _performShutdown() {
    try {
      this.logger.info('🛑 Shutting down KevinJr gracefully...');
      this.status = 'shutting_down';
      
      this.emit('engine:shutdown_start');
      
      // Stop accepting new requests
      this.emit('engine:stop_accepting_requests');
      
      // Shutdown modules in reverse order
      await this._shutdownModules();
      
      // Stop core services
      await this._stopServices();
      
      // Final cleanup
      await this._cleanup();
      
      this.status = 'stopped';
      this.logger.info('👋 KevinJr has been shut down successfully');
      
      this.emit('engine:shutdown_complete');
      
    } catch (error) {
      this.logger.error('💥 Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Execute a command through the appropriate module
   */
  async execute(command, params = {}, context = {}) {
    try {
      if (this.status !== 'running') {
        throw new Error(`Engine not ready. Current status: ${this.status}`);
      }

      this.logger.info(`🎯 Executing command: ${command}`);
      
      // Security check
      const securityCheck = await this.security.validateCommand(command, params, context);
      if (!securityCheck.allowed) {
        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }

      // Find appropriate module
      const module = await this._findModuleForCommand(command);
      if (!module) {
        // KevinJr never says no - try to find a creative solution
        return await this._handleUnknownCommand(command, params, context);
      }

      // Execute through module
      const result = await module.execute(command, params, context);
      
      this.logger.info(`✅ Command executed successfully: ${command}`);
      this.emit('command:executed', { command, result, module: module.name });
      
      return result;
      
    } catch (error) {
      this.logger.error(`💥 Command execution failed: ${command}`, error);
      this.emit('command:failed', { command, error, params });
      
      // KevinJr tries to find alternative solutions
      return await this._handleCommandError(command, params, context, error);
    }
  }

  /**
   * Get engine status and health information
   */
  getStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      name: this.name,
      version: this.version,
      status: this.status,
      uptime: uptime,
      startTime: this.startTime,
      modules: Array.from(this.modules.keys()),
      moduleStatus: Object.fromEntries(this.moduleStatus),
      memoryUsage: process.memoryUsage(),
      isShuttingDown: this.isShuttingDown
    };
  }

  /**
   * Get available capabilities from all modules
   */
  getCapabilities() {
    const capabilities = [];
    
    for (const [name, module] of this.modules) {
      if (module.getCapabilities) {
        const moduleCapabilities = module.getCapabilities();
        capabilities.push({
          module: name,
          capabilities: moduleCapabilities
        });
      }
    }
    
    return capabilities;
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: path.join(process.cwd(), 'logs', 'kevinjr.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5
        })
      ]
    });

    // Ensure logs directory exists
    fs.ensureDirSync(path.join(process.cwd(), 'logs'));
  }

  async _initializeConfig() {
    this.logger.info('🔧 Initializing configuration manager...');
    this.config = new ConfigManager();
    await this.config.initialize();
    this.logger.info('✅ Configuration manager ready');
  }

  async _initializeSecurity() {
    this.logger.info('🔒 Initializing security manager...');
    this.security = new SecurityManager(this.config);
    await this.security.initialize();
    this.logger.info('✅ Security manager ready');
  }

  async _initializeEventSystem() {
    this.logger.info('📡 Initializing event system...');
    this.eventSystem = new EventSystem();
    await this.eventSystem.initialize();
    this.logger.info('✅ Event system ready');
  }

  async _initializeModuleLoader() {
    this.logger.info('🔌 Initializing module loader...');
    this.moduleLoader = new ModuleLoader(this);
    await this.moduleLoader.initialize();
    this.logger.info('✅ Module loader ready');
  }

  async _loadModules() {
    this.logger.info('📦 Loading modules...');
    
    const enabledModules = this.config.get('modules.enabled', []);
    
    if (enabledModules.length === 0) {
      this.logger.info('ℹ️  No modules enabled yet - ready for Phase 3!');
      return;
    }

    for (const moduleName of enabledModules) {
      try {
        const module = await this.moduleLoader.loadModule(moduleName);
        this.modules.set(moduleName, module);
        this.moduleStatus.set(moduleName, 'loaded');
        
        this.logger.info(`✅ Module loaded: ${moduleName}`);
      } catch (error) {
        this.logger.error(`💥 Failed to load module: ${moduleName}`, error);
        this.moduleStatus.set(moduleName, 'error');
      }
    }
  }

  async _startServices() {
    this.logger.info('🎬 Starting core services...');
    
    // Start health monitoring
    this._startHealthMonitoring();
    
    // Start periodic tasks
    this._startPeriodicTasks();
    
    this.logger.info('✅ Core services started');
  }

  _startHealthMonitoring() {
    // Monitor system health every 30 seconds
    setInterval(() => {
      if (this.status === 'running') {
        this._performHealthCheck();
      }
    }, 30000);
  }

  _startPeriodicTasks() {
    // Cleanup tasks every hour
    setInterval(() => {
      if (this.status === 'running') {
        this._performMaintenance();
      }
    }, 3600000); // 1 hour
  }

  async _performHealthCheck() {
    try {
      const status = this.getStatus();
      this.emit('health:check', status);
      
      // Check module health
      for (const [name, module] of this.modules) {
        if (module.healthCheck) {
          const moduleHealth = await module.healthCheck();
          if (!moduleHealth.healthy) {
            this.logger.warn(`⚠️  Module health issue: ${name}`, moduleHealth);
          }
        }
      }
    } catch (error) {
      this.logger.error('💥 Health check failed:', error);
    }
  }

  async _performMaintenance() {
    try {
      this.logger.info('🧹 Performing maintenance tasks...');
      
      // Cleanup old logs
      await this._cleanupLogs();
      
      // Module maintenance
      for (const [name, module] of this.modules) {
        if (module.performMaintenance) {
          await module.performMaintenance();
        }
      }
      
      this.emit('maintenance:complete');
      this.logger.info('✅ Maintenance completed');
      
    } catch (error) {
      this.logger.error('💥 Maintenance failed:', error);
    }
  }

  async _cleanupLogs() {
    // Keep only last 7 days of logs
    const logsDir = path.join(process.cwd(), 'logs');
    const files = await fs.readdir(logsDir);
    const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.remove(filePath);
        this.logger.info(`🗑️  Cleaned up old log file: ${file}`);
      }
    }
  }

  async _findModuleForCommand(command) {
    // Try to find a module that can handle this command
    for (const [name, module] of this.modules) {
      if (module.canHandle && module.canHandle(command)) {
        return module;
      }
    }
    return null;
  }

  async _handleUnknownCommand(command, params, context) {
    this.logger.info(`🤔 Unknown command: ${command} - finding creative solution...`);
    
    // KevinJr never says no - try to find alternatives
    const suggestions = await this._findCommandSuggestions(command);
    
    return {
      success: false,
      message: `I don't recognize the command "${command}", but I never give up! Here are some suggestions:`,
      suggestions: suggestions,
      motto: "Never says no - always finds a way!"
    };
  }

  async _findCommandSuggestions(command) {
    const suggestions = [];
    
    // Get all available capabilities
    const capabilities = this.getCapabilities();
    
    // Simple fuzzy matching for suggestions
    for (const moduleCapabilities of capabilities) {
      for (const capability of moduleCapabilities.capabilities) {
        if (capability.toLowerCase().includes(command.toLowerCase()) ||
            command.toLowerCase().includes(capability.toLowerCase())) {
          suggestions.push({
            module: moduleCapabilities.module,
            capability: capability,
            confidence: 0.8
          });
        }
      }
    }
    
    return suggestions;
  }

  async _handleCommandError(command, params, context, error) {
    this.logger.info(`🔄 Command failed, trying alternative approaches...`);
    
    // KevinJr tries to recover and find alternatives
    return {
      success: false,
      error: error.message,
      message: `I encountered an issue with "${command}", but I'm working on alternative solutions!`,
      recovery: "I'll keep trying different approaches until I find a way.",
      motto: "Never says no - always finds a way!"
    };
  }

  async _shutdownModules() {
    this.logger.info('🔌 Shutting down modules...');
    
    // Shutdown in reverse order
    const moduleNames = Array.from(this.modules.keys()).reverse();
    
    for (const moduleName of moduleNames) {
      try {
        const module = this.modules.get(moduleName);
        if (module && module.cleanup) {
          await module.cleanup();
        }
        this.moduleStatus.set(moduleName, 'stopped');
        this.logger.info(`✅ Module stopped: ${moduleName}`);
      } catch (error) {
        this.logger.error(`💥 Error stopping module: ${moduleName}`, error);
      }
    }
  }

  async _stopServices() {
    this.logger.info('🛑 Stopping core services...');
    // Stop any running intervals/timers
    // Additional service cleanup would go here
  }

  async _cleanup() {
    this.logger.info('🧹 Final cleanup...');
    
    // Clear module registry
    this.modules.clear();
    this.moduleStatus.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    this.logger.info('✅ Cleanup completed');
  }
}

module.exports = KevinJrEngine;
