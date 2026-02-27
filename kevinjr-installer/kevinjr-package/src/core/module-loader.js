/**
 * KevinJr Module Loader
 * Dynamic loading and management of modules
 */

const fs = require('fs-extra');
const path = require('path');
const winston = require('winston');

class ModuleLoader {
  constructor(engine) {
    this.engine = engine;
    this.modulesPath = path.join(process.cwd(), 'src', 'modules');
    this.loadedModules = new Map();
    this.moduleMetadata = new Map();
    this.logger = null;
    
    this._setupLogger();
  }

  /**
   * Initialize the module loader
   */
  async initialize() {
    this.logger.info('🔌 Module loader initializing...');
    
    // Ensure modules directory exists
    await fs.ensureDir(this.modulesPath);
    
    // Scan for available modules
    await this._scanModules();
    
    this.logger.info('✅ Module loader ready');
    return true;
  }

  /**
   * Load a specific module
   */
  async loadModule(moduleName) {
    try {
      this.logger.info(`📦 Loading module: ${moduleName}`);
      
      // Check if already loaded
      if (this.loadedModules.has(moduleName)) {
        this.logger.warn(`⚠️  Module ${moduleName} is already loaded`);
        return this.loadedModules.get(moduleName);
      }
      
      // Get module metadata
      const metadata = this.moduleMetadata.get(moduleName);
      if (!metadata) {
        throw new Error(`Module ${moduleName} not found`);
      }
      
      // Validate module dependencies
      await this._validateDependencies(metadata);
      
      // Load the module
      const ModuleClass = require(metadata.entryPoint);
      
      // Validate module interface
      this._validateModuleInterface(ModuleClass, moduleName);
      
      // Create module instance
      const moduleInstance = new ModuleClass(this.engine);
      
      // Initialize the module
      await this._initializeModule(moduleInstance, metadata);
      
      // Register the module
      this.loadedModules.set(moduleName, moduleInstance);
      
      this.logger.info(`✅ Module loaded successfully: ${moduleName}`);
      
      // Emit module loaded event
      this.engine.eventSystem.emit('module:loaded', {
        name: moduleName,
        metadata: metadata,
        instance: moduleInstance
      });
      
      return moduleInstance;
      
    } catch (error) {
      this.logger.error(`💥 Failed to load module ${moduleName}:`, error);
      
      // Emit module load failed event
      this.engine.eventSystem.emit('module:load_failed', {
        name: moduleName,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Unload a specific module
   */
  async unloadModule(moduleName) {
    try {
      this.logger.info(`🔌 Unloading module: ${moduleName}`);
      
      const moduleInstance = this.loadedModules.get(moduleName);
      if (!moduleInstance) {
        this.logger.warn(`⚠️  Module ${moduleName} is not loaded`);
        return;
      }
      
      // Cleanup the module
      if (moduleInstance.cleanup) {
        await moduleInstance.cleanup();
      }
      
      // Remove from loaded modules
      this.loadedModules.delete(moduleName);
      
      // Clear from require cache
      const metadata = this.moduleMetadata.get(moduleName);
      if (metadata) {
        delete require.cache[require.resolve(metadata.entryPoint)];
      }
      
      this.logger.info(`✅ Module unloaded successfully: ${moduleName}`);
      
      // Emit module unloaded event
      this.engine.eventSystem.emit('module:unloaded', {
        name: moduleName
      });
      
    } catch (error) {
      this.logger.error(`💥 Failed to unload module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Reload a specific module
   */
  async reloadModule(moduleName) {
    this.logger.info(`🔄 Reloading module: ${moduleName}`);
    
    await this.unloadModule(moduleName);
    await this._scanModules(); // Refresh metadata
    return await this.loadModule(moduleName);
  }

  /**
   * Get list of available modules
   */
  getAvailableModules() {
    return Array.from(this.moduleMetadata.keys());
  }

  /**
   * Get list of loaded modules
   */
  getLoadedModules() {
    return Array.from(this.loadedModules.keys());
  }

  /**
   * Get module metadata
   */
  getModuleMetadata(moduleName) {
    return this.moduleMetadata.get(moduleName);
  }

  /**
   * Get module instance
   */
  getModule(moduleName) {
    return this.loadedModules.get(moduleName);
  }

  /**
   * Check if module is loaded
   */
  isModuleLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }

  /**
   * Load all enabled modules
   */
  async loadEnabledModules() {
    const enabledModules = this.engine.config.get('modules.enabled', []);
    const results = [];
    
    for (const moduleName of enabledModules) {
      try {
        const module = await this.loadModule(moduleName);
        results.push({ name: moduleName, success: true, module });
      } catch (error) {
        results.push({ name: moduleName, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Health check for all loaded modules
   */
  async healthCheck() {
    const results = {};
    
    for (const [name, module] of this.loadedModules) {
      try {
        if (module.healthCheck) {
          results[name] = await module.healthCheck();
        } else {
          results[name] = { healthy: true, message: 'No health check implemented' };
        }
      } catch (error) {
        results[name] = { healthy: false, error: error.message };
      }
    }
    
    return results;
  }

  /**
   * Cleanup all modules
   */
  async cleanup() {
    this.logger.info('🧹 Cleaning up all modules...');
    
    const moduleNames = Array.from(this.loadedModules.keys());
    
    for (const moduleName of moduleNames) {
      try {
        await this.unloadModule(moduleName);
      } catch (error) {
        this.logger.error(`💥 Error cleaning up module ${moduleName}:`, error);
      }
    }
    
    this.loadedModules.clear();
    this.moduleMetadata.clear();
    
    this.logger.info('✅ Module loader cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [ModuleLoader] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _scanModules() {
    this.logger.info('🔍 Scanning for available modules...');
    
    try {
      const entries = await fs.readdir(this.modulesPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          await this._scanModule(entry.name);
        }
      }
      
      this.logger.info(`✅ Found ${this.moduleMetadata.size} modules`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.info('ℹ️  No modules directory found - ready for Phase 3!');
      } else {
        this.logger.error('💥 Error scanning modules:', error);
      }
    }
  }

  async _scanModule(moduleName) {
    const modulePath = path.join(this.modulesPath, moduleName);
    const packagePath = path.join(modulePath, 'package.json');
    const indexPath = path.join(modulePath, 'index.js');
    
    try {
      // Check if module has package.json
      let packageInfo = {};
      if (await fs.pathExists(packagePath)) {
        packageInfo = await fs.readJson(packagePath);
      }
      
      // Check if module has index.js
      if (!await fs.pathExists(indexPath)) {
        this.logger.warn(`⚠️  Module ${moduleName} missing index.js`);
        return;
      }
      
      // Create module metadata
      const metadata = {
        name: moduleName,
        version: packageInfo.version || '1.0.0',
        description: packageInfo.description || 'No description',
        author: packageInfo.author || 'Unknown',
        dependencies: packageInfo.dependencies || {},
        kevinjrDependencies: packageInfo.kevinjrDependencies || [],
        entryPoint: indexPath,
        path: modulePath,
        capabilities: packageInfo.capabilities || [],
        permissions: packageInfo.permissions || [],
        config: packageInfo.config || {},
        scannedAt: new Date().toISOString()
      };
      
      this.moduleMetadata.set(moduleName, metadata);
      this.logger.debug(`📋 Scanned module: ${moduleName}`);
      
    } catch (error) {
      this.logger.error(`💥 Error scanning module ${moduleName}:`, error);
    }
  }

  async _validateDependencies(metadata) {
    // Check Node.js dependencies
    for (const [dep, version] of Object.entries(metadata.dependencies)) {
      try {
        require.resolve(dep);
      } catch (error) {
        throw new Error(`Missing dependency: ${dep}@${version}`);
      }
    }
    
    // Check KevinJr module dependencies
    for (const depModule of metadata.kevinjrDependencies) {
      if (!this.loadedModules.has(depModule)) {
        throw new Error(`Missing KevinJr module dependency: ${depModule}`);
      }
    }
  }

  _validateModuleInterface(ModuleClass, moduleName) {
    // Check if it's a valid class
    if (typeof ModuleClass !== 'function') {
      throw new Error(`Module ${moduleName} must export a class`);
    }
    
    // Check required methods
    const requiredMethods = ['initialize', 'execute', 'cleanup', 'getCapabilities'];
    const prototype = ModuleClass.prototype;
    
    for (const method of requiredMethods) {
      if (typeof prototype[method] !== 'function') {
        throw new Error(`Module ${moduleName} missing required method: ${method}`);
      }
    }
  }

  async _initializeModule(moduleInstance, metadata) {
    this.logger.info(`🎯 Initializing module: ${metadata.name}`);
    
    // Set module metadata
    moduleInstance.metadata = metadata;
    moduleInstance.name = metadata.name;
    
    // Initialize the module
    const timeout = this.engine.config.get('modules.loadTimeout', 30000);
    
    await Promise.race([
      moduleInstance.initialize(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Module ${metadata.name} initialization timeout`));
        }, timeout);
      })
    ]);
    
    this.logger.info(`✅ Module initialized: ${metadata.name}`);
  }
}

module.exports = ModuleLoader;
