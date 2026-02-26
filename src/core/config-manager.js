/**
 * KevinJr Configuration Manager
 * Secure configuration and settings management
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const _ = require('lodash');

class ConfigManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config');
    this.appConfigFile = path.join(this.configPath, 'app.json');
    this.userConfigFile = path.join(this.configPath, 'user.json');
    this.secretsFile = path.join(this.configPath, 'secrets.encrypted');
    
    // In-memory configuration
    this.config = {};
    this.secrets = {};
    this.watchers = new Map();
    
    // Default configuration
    this.defaults = {
      version: '1.0.0',
      engine: {
        logLevel: 'info',
        healthCheckInterval: 30000,
        maintenanceInterval: 3600000,
        maxLogFiles: 5,
        maxLogSize: 10485760 // 10MB
      },
      modules: {
        enabled: [],
        disabled: [],
        autoLoad: true,
        loadTimeout: 30000
      },
      security: {
        encryptionEnabled: true,
        auditLogging: true,
        permissionChecks: true,
        sessionTimeout: 3600000, // 1 hour
        maxFailedAttempts: 5
      },
      ui: {
        theme: 'dark',
        notifications: true,
        verboseLogging: false,
        showBanner: true
      },
      api: {
        port: 3000,
        host: 'localhost',
        cors: true,
        rateLimit: {
          windowMs: 900000, // 15 minutes
          max: 100 // requests per window
        }
      },
      automation: {
        maxConcurrentTasks: 10,
        taskTimeout: 300000, // 5 minutes
        retryAttempts: 3,
        retryDelay: 1000
      }
    };
  }

  /**
   * Initialize the configuration manager
   */
  async initialize() {
    try {
      // Ensure config directory exists
      await fs.ensureDir(this.configPath);
      
      // Load configurations
      await this._loadAppConfig();
      await this._loadUserConfig();
      await this._loadSecrets();
      
      // Merge with defaults
      this._mergeDefaults();
      
      // Validate configuration
      await this._validateConfig();
      
      // Set up file watchers for hot reloading
      this._setupWatchers();
      
      return true;
      
    } catch (error) {
      throw new Error(`Failed to initialize configuration: ${error.message}`);
    }
  }

  /**
   * Get a configuration value using dot notation
   */
  get(key, defaultValue = undefined) {
    return _.get(this.config, key, defaultValue);
  }

  /**
   * Set a configuration value using dot notation
   */
  async set(key, value, persist = true) {
    _.set(this.config, key, value);
    
    if (persist) {
      await this._saveUserConfig();
    }
    
    // Notify watchers
    this._notifyWatchers(key, value);
  }

  /**
   * Get a secret value (encrypted storage)
   */
  getSecret(key, defaultValue = undefined) {
    return _.get(this.secrets, key, defaultValue);
  }

  /**
   * Set a secret value (encrypted storage)
   */
  async setSecret(key, value) {
    _.set(this.secrets, key, value);
    await this._saveSecrets();
  }

  /**
   * Remove a secret
   */
  async removeSecret(key) {
    _.unset(this.secrets, key);
    await this._saveSecrets();
  }

  /**
   * Get all configuration as a safe object (no secrets)
   */
  getAll() {
    return _.cloneDeep(this.config);
  }

  /**
   * Get module-specific configuration
   */
  getModuleConfig(moduleName) {
    const moduleConfig = this.get(`modules.config.${moduleName}`, {});
    const globalConfig = {
      logLevel: this.get('engine.logLevel'),
      security: this.get('security'),
      api: this.get('api')
    };
    
    return { ...globalConfig, ...moduleConfig };
  }

  /**
   * Set module-specific configuration
   */
  async setModuleConfig(moduleName, config) {
    await this.set(`modules.config.${moduleName}`, config);
  }

  /**
   * Watch for configuration changes
   */
  watch(key, callback) {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, new Set());
    }
    this.watchers.get(key).add(callback);
    
    // Return unwatch function
    return () => {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.watchers.delete(key);
        }
      }
    };
  }

  /**
   * Validate API keys and credentials
   */
  async validateCredentials() {
    const issues = [];
    
    // Check OpenAI API key
    const openaiKey = this.getSecret('openai.apiKey');
    if (!openaiKey) {
      issues.push('OpenAI API key not configured');
    } else if (!openaiKey.startsWith('sk-')) {
      issues.push('OpenAI API key format appears invalid');
    }
    
    // Check Anthropic API key
    const anthropicKey = this.getSecret('anthropic.apiKey');
    if (!anthropicKey) {
      issues.push('Anthropic API key not configured');
    } else if (!anthropicKey.startsWith('sk-ant-')) {
      issues.push('Anthropic API key format appears invalid');
    }
    
    // Check encryption key
    const encryptionKey = this.getSecret('security.encryptionKey');
    if (!encryptionKey) {
      issues.push('Encryption key not configured');
    } else if (encryptionKey.length < 32) {
      issues.push('Encryption key should be at least 32 characters');
    }
    
    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Reset configuration to defaults
   */
  async reset() {
    this.config = _.cloneDeep(this.defaults);
    await this._saveAppConfig();
    await this._saveUserConfig();
  }

  /**
   * Export configuration (safe, no secrets)
   */
  export() {
    return {
      config: this.getAll(),
      timestamp: new Date().toISOString(),
      version: this.get('version')
    };
  }

  /**
   * Import configuration
   */
  async import(configData) {
    if (configData.version !== this.get('version')) {
      throw new Error('Configuration version mismatch');
    }
    
    this.config = { ...this.config, ...configData.config };
    await this._saveUserConfig();
  }

  // Private methods

  async _loadAppConfig() {
    try {
      if (await fs.pathExists(this.appConfigFile)) {
        const appConfig = await fs.readJson(this.appConfigFile);
        this.config = { ...this.config, ...appConfig };
      }
    } catch (error) {
      // App config is optional, create default if missing
      await this._saveAppConfig();
    }
  }

  async _loadUserConfig() {
    try {
      if (await fs.pathExists(this.userConfigFile)) {
        const userConfig = await fs.readJson(this.userConfigFile);
        this.config = { ...this.config, ...userConfig };
      }
    } catch (error) {
      // User config is optional
    }
  }

  async _loadSecrets() {
    try {
      if (await fs.pathExists(this.secretsFile)) {
        const encryptedData = await fs.readFile(this.secretsFile, 'utf8');
        this.secrets = this._decrypt(encryptedData);
      }
    } catch (error) {
      // Secrets file is optional, but log the error
      console.warn('Could not load secrets file:', error.message);
      this.secrets = {};
    }
  }

  _mergeDefaults() {
    this.config = _.merge({}, this.defaults, this.config);
  }

  async _validateConfig() {
    // Validate required fields
    const required = [
      'version',
      'engine.logLevel',
      'security.encryptionEnabled'
    ];
    
    for (const field of required) {
      if (_.get(this.config, field) === undefined) {
        throw new Error(`Required configuration field missing: ${field}`);
      }
    }
    
    // Validate data types
    if (typeof this.config.engine.healthCheckInterval !== 'number') {
      throw new Error('engine.healthCheckInterval must be a number');
    }
    
    if (!Array.isArray(this.config.modules.enabled)) {
      throw new Error('modules.enabled must be an array');
    }
  }

  async _saveAppConfig() {
    const appConfig = {
      version: this.config.version,
      firstRun: this.config.firstRun || new Date().toISOString(),
      phases: this.config.phases || {}
    };
    
    await fs.writeJson(this.appConfigFile, appConfig, { spaces: 2 });
  }

  async _saveUserConfig() {
    // Save user-specific configuration (excluding app-level config)
    const userConfig = _.omit(this.config, ['version', 'firstRun', 'phases']);
    await fs.writeJson(this.userConfigFile, userConfig, { spaces: 2 });
  }

  async _saveSecrets() {
    if (Object.keys(this.secrets).length > 0) {
      const encryptedData = this._encrypt(this.secrets);
      await fs.writeFile(this.secretsFile, encryptedData, 'utf8');
    }
  }

  _encrypt(data) {
    const key = this._getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  _decrypt(encryptedData) {
    try {
      const key = this._getEncryptionKey();
      const parts = encryptedData.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt secrets: ' + error.message);
    }
  }

  _getEncryptionKey() {
    // Try to get from environment first
    let key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      // Generate a default key (not secure for production)
      key = 'kevinjr-default-encryption-key-change-me';
      console.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY environment variable for security.');
    }
    
    return key;
  }

  _setupWatchers() {
    // Watch for file changes and reload configuration
    if (fs.existsSync(this.userConfigFile)) {
      fs.watchFile(this.userConfigFile, async () => {
        try {
          await this._loadUserConfig();
          this._mergeDefaults();
          this._notifyWatchers('*', this.config);
        } catch (error) {
          console.error('Error reloading user config:', error);
        }
      });
    }
  }

  _notifyWatchers(key, value) {
    // Notify exact key watchers
    const exactWatchers = this.watchers.get(key);
    if (exactWatchers) {
      for (const callback of exactWatchers) {
        try {
          callback(value, key);
        } catch (error) {
          console.error('Error in config watcher:', error);
        }
      }
    }
    
    // Notify wildcard watchers
    const wildcardWatchers = this.watchers.get('*');
    if (wildcardWatchers) {
      for (const callback of wildcardWatchers) {
        try {
          callback(value, key);
        } catch (error) {
          console.error('Error in config watcher:', error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Stop file watchers
    if (fs.existsSync(this.userConfigFile)) {
      fs.unwatchFile(this.userConfigFile);
    }
    
    // Clear watchers
    this.watchers.clear();
  }
}

module.exports = ConfigManager;
