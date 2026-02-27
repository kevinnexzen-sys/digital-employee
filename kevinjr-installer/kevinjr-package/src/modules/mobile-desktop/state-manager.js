/**
 * KevinJr Cross-Platform State Manager
 * Unified state management and synchronization across all platforms
 */

const winston = require('winston');
const EventEmitter = require('events');

class StateManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = config;
    this.logger = null;
    
    // State storage
    this.globalState = new Map();
    this.platformStates = new Map();
    this.subscribers = new Map();
    this.middleware = [];
    
    // Sync configuration
    this.syncConfig = {
      enabled: true,
      interval: 1000, // ms
      conflictResolution: 'last-write-wins', // 'last-write-wins', 'merge', 'manual'
      platforms: ['react-native', 'flutter', 'electron', 'tauri', 'web']
    };
    
    // State schemas for validation
    this.schemas = {
      user: {
        id: 'string',
        name: 'string',
        email: 'string',
        avatar: 'string?',
        preferences: 'object',
        lastActive: 'date'
      },
      app: {
        theme: 'string',
        language: 'string',
        notifications: 'boolean',
        version: 'string',
        platform: 'string'
      },
      navigation: {
        currentRoute: 'string',
        history: 'array',
        params: 'object'
      },
      cache: {
        data: 'object',
        timestamp: 'date',
        ttl: 'number'
      }
    };
    
    // Platform-specific adapters
    this.adapters = {
      'react-native': {
        storage: 'AsyncStorage',
        events: 'DeviceEventEmitter',
        networking: 'NetInfo'
      },
      flutter: {
        storage: 'SharedPreferences',
        events: 'EventChannel',
        networking: 'connectivity_plus'
      },
      electron: {
        storage: 'electron-store',
        events: 'ipcMain/ipcRenderer',
        networking: 'online/offline events'
      },
      tauri: {
        storage: 'tauri-plugin-store',
        events: 'tauri events',
        networking: 'window.navigator.onLine'
      },
      web: {
        storage: 'localStorage/sessionStorage',
        events: 'CustomEvent',
        networking: 'navigator.onLine'
      }
    };
    
    this._setupLogger();
    this._initializeState();
  }

  async initialize() {
    this.logger.info('🗃️ State Manager initializing...');
    
    // Setup middleware
    this._setupDefaultMiddleware();
    
    // Start sync if enabled
    if (this.syncConfig.enabled) {
      this._startSync();
    }
    
    this.logger.info('✅ State Manager ready');
    return true;
  }

  /**
   * Set up cross-platform state synchronization
   */
  async setupCrossPlatformSync(params) {
    const {
      platforms = [],
      outputPath = './shared/state',
      syncStrategy = 'real-time', // 'real-time', 'periodic', 'manual'
      conflictResolution = 'last-write-wins'
    } = params;
    
    this.logger.info(`🔄 Setting up cross-platform sync for: ${platforms.join(', ')}`);
    
    try {
      const result = {
        success: true,
        platforms,
        syncStrategy,
        conflictResolution,
        files: {},
        adapters: {}
      };
      
      // Generate platform-specific state adapters
      for (const platform of platforms) {
        result.adapters[platform] = await this._generatePlatformAdapter(platform);
        result.files[`${platform}-adapter`] = result.adapters[platform];
      }
      
      // Generate shared state definitions
      result.files.stateDefinitions = await this._generateStateDefinitions();
      
      // Generate sync utilities
      result.files.syncUtils = await this._generateSyncUtils(platforms, syncStrategy);
      
      // Generate middleware
      result.files.middleware = await this._generateStateMiddleware();
      
      // Write files to disk
      await this._writeStateFiles(outputPath, result.files);
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Cross-platform sync setup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get state value
   */
  getState(key, platform = 'global') {
    if (platform === 'global') {
      return this.globalState.get(key);
    }
    
    const platformState = this.platformStates.get(platform);
    return platformState ? platformState.get(key) : undefined;
  }

  /**
   * Set state value
   */
  setState(key, value, platform = 'global', options = {}) {
    const { validate = true, sync = true, emit = true } = options;
    
    // Validate against schema if available
    if (validate && this.schemas[key]) {
      const isValid = this._validateState(key, value);
      if (!isValid) {
        throw new Error(`Invalid state for key: ${key}`);
      }
    }
    
    // Apply middleware
    const processedValue = this._applyMiddleware('SET_STATE', {
      key,
      value,
      platform,
      timestamp: new Date()
    });
    
    // Set state
    if (platform === 'global') {
      this.globalState.set(key, processedValue.value);
    } else {
      if (!this.platformStates.has(platform)) {
        this.platformStates.set(platform, new Map());
      }
      this.platformStates.get(platform).set(key, processedValue.value);
    }
    
    // Emit change event
    if (emit) {
      this.emit('stateChange', {
        key,
        value: processedValue.value,
        platform,
        timestamp: processedValue.timestamp
      });
    }
    
    // Sync across platforms if enabled
    if (sync && this.syncConfig.enabled) {
      this._syncState(key, processedValue.value, platform);
    }
    
    return processedValue.value;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(key, callback, platform = 'global') {
    const subscriptionKey = `${platform}:${key}`;
    
    if (!this.subscribers.has(subscriptionKey)) {
      this.subscribers.set(subscriptionKey, new Set());
    }
    
    this.subscribers.get(subscriptionKey).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(subscriptionKey);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(subscriptionKey);
        }
      }
    };
  }

  /**
   * Add middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    
    this.middleware.push(middleware);
  }

  /**
   * Merge states from multiple platforms
   */
  mergeStates(states, strategy = 'deep-merge') {
    switch (strategy) {
      case 'deep-merge':
        return this._deepMerge(states);
      case 'shallow-merge':
        return Object.assign({}, ...states);
      case 'last-write-wins':
        return states[states.length - 1];
      default:
        throw new Error(`Unknown merge strategy: ${strategy}`);
    }
  }

  /**
   * Clear state
   */
  clearState(key, platform = 'global') {
    if (platform === 'global') {
      this.globalState.delete(key);
    } else {
      const platformState = this.platformStates.get(platform);
      if (platformState) {
        platformState.delete(key);
      }
    }
    
    this.emit('stateCleared', { key, platform });
  }

  /**
   * Get all state
   */
  getAllState(platform = 'global') {
    if (platform === 'global') {
      return Object.fromEntries(this.globalState);
    }
    
    const platformState = this.platformStates.get(platform);
    return platformState ? Object.fromEntries(platformState) : {};
  }

  async healthCheck() {
    return {
      healthy: true,
      stateManager: 'cross-platform',
      globalStateSize: this.globalState.size,
      platformStates: Array.from(this.platformStates.keys()),
      subscribersCount: this.subscribers.size,
      middlewareCount: this.middleware.length,
      syncEnabled: this.syncConfig.enabled
    };
  }

  async cleanup() {
    this.logger.info('🧹 State Manager cleanup...');
    
    // Clear all states
    this.globalState.clear();
    this.platformStates.clear();
    this.subscribers.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    this.logger.info('✅ State Manager cleanup completed');
  }

  // Private methods
  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [StateManager] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _initializeState() {
    // Initialize with default state
    this.setState('app', {
      initialized: true,
      version: '1.0.0',
      platform: process.platform,
      timestamp: new Date()
    }, 'global', { emit: false });
  }

  _setupDefaultMiddleware() {
    // Logging middleware
    this.use((action, state, next) => {
      this.logger.debug(`State action: ${action.type}`, {
        key: action.key,
        platform: action.platform
      });
      return next(action, state);
    });
    
    // Validation middleware
    this.use((action, state, next) => {
      if (action.type === 'SET_STATE' && this.schemas[action.key]) {
        const isValid = this._validateState(action.key, action.value);
        if (!isValid) {
          throw new Error(`Invalid state for key: ${action.key}`);
        }
      }
      return next(action, state);
    });
    
    // Timestamp middleware
    this.use((action, state, next) => {
      action.timestamp = action.timestamp || new Date();
      return next(action, state);
    });
  }

  _applyMiddleware(type, action) {
    let currentAction = { ...action, type };
    
    const next = (modifiedAction, state) => {
      currentAction = modifiedAction;
      return currentAction;
    };
    
    for (const middleware of this.middleware) {
      try {
        middleware(currentAction, this.globalState, next);
      } catch (error) {
        this.logger.error('Middleware error:', error);
      }
    }
    
    return currentAction;
  }

  _validateState(key, value) {
    const schema = this.schemas[key];
    if (!schema) return true;
    
    try {
      return this._validateAgainstSchema(value, schema);
    } catch (error) {
      this.logger.warn(`State validation failed for ${key}:`, error);
      return false;
    }
  }

  _validateAgainstSchema(value, schema) {
    if (typeof schema === 'string') {
      const isOptional = schema.endsWith('?');
      const type = isOptional ? schema.slice(0, -1) : schema;
      
      if (isOptional && (value === null || value === undefined)) {
        return true;
      }
      
      switch (type) {
        case 'string':
          return typeof value === 'string';
        case 'number':
          return typeof value === 'number';
        case 'boolean':
          return typeof value === 'boolean';
        case 'object':
          return typeof value === 'object' && value !== null;
        case 'array':
          return Array.isArray(value);
        case 'date':
          return value instanceof Date || !isNaN(Date.parse(value));
        default:
          return true;
      }
    }
    
    if (typeof schema === 'object') {
      if (typeof value !== 'object' || value === null) {
        return false;
      }
      
      for (const [key, subSchema] of Object.entries(schema)) {
        if (!this._validateAgainstSchema(value[key], subSchema)) {
          return false;
        }
      }
    }
    
    return true;
  }

  _syncState(key, value, sourcePlatform) {
    // Notify subscribers
    const subscriptionKey = `${sourcePlatform}:${key}`;
    const globalKey = `global:${key}`;
    
    [subscriptionKey, globalKey].forEach(subKey => {
      const subscribers = this.subscribers.get(subKey);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(value, key, sourcePlatform);
          } catch (error) {
            this.logger.error('Subscriber callback error:', error);
          }
        });
      }
    });
  }

  _startSync() {
    setInterval(() => {
      this.emit('syncTick', {
        timestamp: new Date(),
        globalStateSize: this.globalState.size,
        platformStatesCount: this.platformStates.size
      });
    }, this.syncConfig.interval);
  }

  _deepMerge(objects) {
    const result = {};
    
    for (const obj of objects) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          result[key] = this._deepMerge([result[key] || {}, value]);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  async _generatePlatformAdapter(platform) {
    const adapter = this.adapters[platform];
    
    const adapterCode = `// ${platform} State Adapter
class ${this._capitalize(platform)}StateAdapter {
  constructor() {
    this.storage = null;
    this.eventEmitter = null;
    this._initialize();
  }

  async _initialize() {
    // Platform-specific initialization
    ${this._generatePlatformInit(platform, adapter)}
  }

  async getItem(key) {
    try {
      ${this._generateGetItem(platform, adapter)}
    } catch (error) {
      console.error('StateAdapter getItem error:', error);
      return null;
    }
  }

  async setItem(key, value) {
    try {
      ${this._generateSetItem(platform, adapter)}
    } catch (error) {
      console.error('StateAdapter setItem error:', error);
      throw error;
    }
  }

  async removeItem(key) {
    try {
      ${this._generateRemoveItem(platform, adapter)}
    } catch (error) {
      console.error('StateAdapter removeItem error:', error);
      throw error;
    }
  }

  subscribe(callback) {
    ${this._generateSubscribe(platform, adapter)}
  }

  emit(event, data) {
    ${this._generateEmit(platform, adapter)}
  }
}

export default ${this._capitalize(platform)}StateAdapter;`;

    return {
      fileName: `adapters/${platform}-state-adapter.js`,
      content: adapterCode
    };
  }

  async _generateStateDefinitions() {
    return {
      fileName: 'state/definitions.js',
      content: `// Shared State Definitions
export const StateSchemas = ${JSON.stringify(this.schemas, null, 2)};

export const StateKeys = {
  USER: 'user',
  APP: 'app',
  NAVIGATION: 'navigation',
  CACHE: 'cache'
};

export const PlatformTypes = {
  REACT_NATIVE: 'react-native',
  FLUTTER: 'flutter',
  ELECTRON: 'electron',
  TAURI: 'tauri',
  WEB: 'web'
};

export const SyncStrategies = {
  REAL_TIME: 'real-time',
  PERIODIC: 'periodic',
  MANUAL: 'manual'
};

export const ConflictResolution = {
  LAST_WRITE_WINS: 'last-write-wins',
  MERGE: 'merge',
  MANUAL: 'manual'
};`
    };
  }

  async _generateSyncUtils(platforms, syncStrategy) {
    return {
      fileName: 'sync/utils.js',
      content: `// Cross-Platform Sync Utilities
class SyncUtils {
  static async syncAcrossPlatforms(state, platforms) {
    const results = {};
    
    for (const platform of platforms) {
      try {
        results[platform] = await this.syncToPlatform(state, platform);
      } catch (error) {
        console.error(\`Sync to \${platform} failed:\`, error);
        results[platform] = { success: false, error: error.message };
      }
    }
    
    return results;
  }

  static async syncToPlatform(state, platform) {
    switch (platform) {
      case 'react-native':
        return await this.syncToReactNative(state);
      case 'flutter':
        return await this.syncToFlutter(state);
      case 'electron':
        return await this.syncToElectron(state);
      case 'tauri':
        return await this.syncToTauri(state);
      case 'web':
        return await this.syncToWeb(state);
      default:
        throw new Error(\`Unknown platform: \${platform}\`);
    }
  }

  static async syncToReactNative(state) {
    // React Native specific sync logic
    return { success: true, platform: 'react-native', timestamp: new Date() };
  }

  static async syncToFlutter(state) {
    // Flutter specific sync logic
    return { success: true, platform: 'flutter', timestamp: new Date() };
  }

  static async syncToElectron(state) {
    // Electron specific sync logic
    return { success: true, platform: 'electron', timestamp: new Date() };
  }

  static async syncToTauri(state) {
    // Tauri specific sync logic
    return { success: true, platform: 'tauri', timestamp: new Date() };
  }

  static async syncToWeb(state) {
    // Web specific sync logic
    return { success: true, platform: 'web', timestamp: new Date() };
  }

  static resolveConflict(localState, remoteState, strategy = 'last-write-wins') {
    switch (strategy) {
      case 'last-write-wins':
        return remoteState.timestamp > localState.timestamp ? remoteState : localState;
      case 'merge':
        return this.deepMerge(localState, remoteState);
      case 'manual':
        return { conflict: true, local: localState, remote: remoteState };
      default:
        return remoteState;
    }
  }

  static deepMerge(obj1, obj2) {
    const result = { ...obj1 };
    
    for (const [key, value] of Object.entries(obj2)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.deepMerge(result[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

export default SyncUtils;`
    };
  }

  async _generateStateMiddleware() {
    return {
      fileName: 'middleware/index.js',
      content: `// State Management Middleware
export const loggingMiddleware = (action, state, next) => {
  console.log('State Action:', action.type, action);
  const result = next(action, state);
  console.log('State Updated:', result);
  return result;
};

export const validationMiddleware = (schemas) => (action, state, next) => {
  if (action.type === 'SET_STATE' && schemas[action.key]) {
    const isValid = validateAgainstSchema(action.value, schemas[action.key]);
    if (!isValid) {
      throw new Error(\`Invalid state for key: \${action.key}\`);
    }
  }
  return next(action, state);
};

export const timestampMiddleware = (action, state, next) => {
  action.timestamp = action.timestamp || new Date();
  return next(action, state);
};

export const persistenceMiddleware = (adapter) => (action, state, next) => {
  const result = next(action, state);
  
  if (action.type === 'SET_STATE') {
    adapter.setItem(action.key, result.value).catch(error => {
      console.error('Persistence error:', error);
    });
  }
  
  return result;
};

function validateAgainstSchema(value, schema) {
  // Basic validation logic
  if (typeof schema === 'string') {
    const isOptional = schema.endsWith('?');
    const type = isOptional ? schema.slice(0, -1) : schema;
    
    if (isOptional && (value === null || value === undefined)) {
      return true;
    }
    
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'object': return typeof value === 'object' && value !== null;
      case 'array': return Array.isArray(value);
      case 'date': return value instanceof Date || !isNaN(Date.parse(value));
      default: return true;
    }
  }
  
  return true;
}`
    };
  }

  _generatePlatformInit(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `const AsyncStorage = require('@react-native-async-storage/async-storage');
        this.storage = AsyncStorage;`;
      case 'flutter':
        return `// Flutter SharedPreferences initialization
        // This would be implemented in Dart`;
      case 'electron':
        return `const Store = require('electron-store');
        this.storage = new Store();`;
      case 'tauri':
        return `// Tauri store initialization
        // This would use tauri-plugin-store`;
      case 'web':
        return `this.storage = window.localStorage;`;
      default:
        return '// Platform-specific initialization';
    }
  }

  _generateGetItem(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `const value = await this.storage.getItem(key);
        return value ? JSON.parse(value) : null;`;
      case 'web':
        return `const value = this.storage.getItem(key);
        return value ? JSON.parse(value) : null;`;
      default:
        return `// Platform-specific getItem implementation
        return null;`;
    }
  }

  _generateSetItem(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `await this.storage.setItem(key, JSON.stringify(value));`;
      case 'web':
        return `this.storage.setItem(key, JSON.stringify(value));`;
      default:
        return `// Platform-specific setItem implementation`;
    }
  }

  _generateRemoveItem(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `await this.storage.removeItem(key);`;
      case 'web':
        return `this.storage.removeItem(key);`;
      default:
        return `// Platform-specific removeItem implementation`;
    }
  }

  _generateSubscribe(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `// React Native event subscription
        return () => {};`;
      case 'electron':
        return `// Electron IPC subscription
        return () => {};`;
      default:
        return `// Platform-specific subscription
        return () => {};`;
    }
  }

  _generateEmit(platform, adapter) {
    switch (platform) {
      case 'react-native':
        return `// React Native event emission`;
      case 'electron':
        return `// Electron IPC emission`;
      default:
        return `// Platform-specific event emission`;
    }
  }

  async _writeStateFiles(outputPath, files) {
    const fs = require('fs-extra');
    const path = require('path');
    
    for (const [key, file] of Object.entries(files)) {
      if (file.fileName && file.content) {
        const filePath = path.join(outputPath, file.fileName);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
      }
    }
    
    this.logger.info(`📁 State files written to: ${outputPath}`);
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = StateManager;
