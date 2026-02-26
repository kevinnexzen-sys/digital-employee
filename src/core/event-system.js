/**
 * KevinJr Event System
 * Centralized event-driven communication hub
 */

const EventEmitter = require('eventemitter3');
const winston = require('winston');

class EventSystem extends EventEmitter {
  constructor() {
    super();
    
    this.name = 'EventSystem';
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    this.eventStats = new Map();
    this.middlewares = [];
    this.logger = null;
    
    this._setupLogger();
    this._setupInternalEvents();
  }

  /**
   * Initialize the event system
   */
  async initialize() {
    this.logger.info('📡 Event system initializing...');
    
    // Set up error handling
    this.on('error', (error) => {
      this.logger.error('💥 Event system error:', error);
    });
    
    // Set up event logging by overriding emit
    const originalEmit = this.emit.bind(this);
    this.emit = (eventName, ...args) => {
      this._logEvent(eventName, args);
      this._updateStats(eventName);
      this._addToHistory(eventName, args);
      return originalEmit(eventName, ...args);
    };
    
    this.logger.info('✅ Event system ready');
    return true;
  }

  /**
   * Enhanced emit with middleware support
   */
  emit(eventName, ...args) {
    try {
      // Run through middleware chain
      const processedArgs = this._runMiddleware(eventName, args);
      
      // Emit the event
      return super.emit(eventName, ...processedArgs);
      
    } catch (error) {
      this.logger.error(`💥 Error emitting event ${eventName}:`, error);
      super.emit('error', error);
      return false;
    }
  }

  /**
   * Enhanced on with automatic cleanup
   */
  on(eventName, listener, options = {}) {
    const { once = false, timeout = null, priority = 0 } = options;
    
    // Wrap listener with error handling
    const wrappedListener = (...args) => {
      try {
        return listener(...args);
      } catch (error) {
        this.logger.error(`💥 Error in event listener for ${eventName}:`, error);
        this.emit('listener:error', { eventName, error, listener });
      }
    };
    
    // Add priority support
    if (priority !== 0) {
      wrappedListener.priority = priority;
    }
    
    // Set up timeout if specified
    if (timeout) {
      const timeoutId = setTimeout(() => {
        this.off(eventName, wrappedListener);
        this.logger.warn(`⏰ Event listener timeout for ${eventName}`);
      }, timeout);
      
      wrappedListener.timeoutId = timeoutId;
    }
    
    if (once) {
      return super.once(eventName, wrappedListener);
    } else {
      return super.on(eventName, wrappedListener);
    }
  }

  /**
   * Enhanced off with cleanup
   */
  off(eventName, listener) {
    // Clear timeout if exists
    if (listener && listener.timeoutId) {
      clearTimeout(listener.timeoutId);
    }
    
    return super.off(eventName, listener);
  }

  /**
   * Add middleware for event processing
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    
    this.middlewares.push(middleware);
    this.logger.info('🔧 Event middleware added');
  }

  /**
   * Remove middleware
   */
  removeMiddleware(middleware) {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
      this.logger.info('🗑️  Event middleware removed');
    }
  }

  /**
   * Emit event with delay
   */
  emitDelayed(eventName, delay, ...args) {
    setTimeout(() => {
      this.emit(eventName, ...args);
    }, delay);
    
    this.logger.info(`⏰ Scheduled event ${eventName} in ${delay}ms`);
  }

  /**
   * Emit event repeatedly with interval
   */
  emitInterval(eventName, interval, ...args) {
    const intervalId = setInterval(() => {
      this.emit(eventName, ...args);
    }, interval);
    
    this.logger.info(`🔄 Started interval event ${eventName} every ${interval}ms`);
    
    // Return function to stop the interval
    return () => {
      clearInterval(intervalId);
      this.logger.info(`🛑 Stopped interval event ${eventName}`);
    };
  }

  /**
   * Wait for an event to occur
   */
  waitFor(eventName, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.off(eventName, listener);
        reject(new Error(`Timeout waiting for event: ${eventName}`));
      }, timeout);
      
      const listener = (...args) => {
        clearTimeout(timeoutId);
        resolve(args);
      };
      
      this.once(eventName, listener);
    });
  }

  /**
   * Create event namespace
   */
  namespace(prefix) {
    return {
      emit: (eventName, ...args) => {
        return this.emit(`${prefix}:${eventName}`, ...args);
      },
      on: (eventName, listener, options) => {
        return this.on(`${prefix}:${eventName}`, listener, options);
      },
      once: (eventName, listener, options) => {
        return this.on(`${prefix}:${eventName}`, listener, { ...options, once: true });
      },
      off: (eventName, listener) => {
        return this.off(`${prefix}:${eventName}`, listener);
      },
      waitFor: (eventName, timeout) => {
        return this.waitFor(`${prefix}:${eventName}`, timeout);
      }
    };
  }

  /**
   * Get event statistics
   */
  getStats() {
    return {
      totalEvents: Array.from(this.eventStats.values()).reduce((sum, count) => sum + count, 0),
      eventCounts: Object.fromEntries(this.eventStats),
      listenerCounts: this.eventNames().reduce((acc, eventName) => {
        acc[eventName] = this.listenerCount(eventName);
        return acc;
      }, {}),
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Get recent event history
   */
  getHistory(limit = 50) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
    this.logger.info('🧹 Event history cleared');
  }

  /**
   * Get all active event listeners
   */
  getListeners() {
    const listeners = {};
    
    for (const eventName of this.eventNames()) {
      listeners[eventName] = {
        count: this.listenerCount(eventName),
        listeners: this.listeners(eventName)
      };
    }
    
    return listeners;
  }

  /**
   * Health check for event system
   */
  healthCheck() {
    const stats = this.getStats();
    const listenerCount = Object.values(stats.listenerCounts).reduce((sum, count) => sum + count, 0);
    
    return {
      healthy: true,
      stats: {
        totalEvents: stats.totalEvents,
        activeListeners: listenerCount,
        eventTypes: Object.keys(stats.eventCounts).length,
        memoryUsage: this.eventHistory.length
      },
      warnings: this._getHealthWarnings(stats, listenerCount)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 Cleaning up event system...');
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Clear history and stats
    this.eventHistory = [];
    this.eventStats.clear();
    
    // Clear middlewares
    this.middlewares = [];
    
    this.logger.info('✅ Event system cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [EventSystem] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _setupInternalEvents() {
    // Set up internal event handling
    this.on('listener:error', ({ eventName, error }) => {
      this.logger.error(`💥 Listener error for ${eventName}:`, error);
    });
    
    this.on('middleware:error', ({ middleware, error }) => {
      this.logger.error('💥 Middleware error:', error);
    });
  }

  _runMiddleware(eventName, args) {
    let processedArgs = args;
    
    for (const middleware of this.middlewares) {
      try {
        const result = middleware(eventName, processedArgs);
        if (result !== undefined) {
          processedArgs = Array.isArray(result) ? result : [result];
        }
      } catch (error) {
        this.logger.error('💥 Middleware error:', error);
        this.emit('middleware:error', { middleware, error });
      }
    }
    
    return processedArgs;
  }

  _logEvent(eventName, args) {
    if (process.env.LOG_LEVEL === 'debug') {
      this.logger.debug(`📡 Event: ${eventName}`, { args: args.length });
    }
  }

  _updateStats(eventName) {
    const currentCount = this.eventStats.get(eventName) || 0;
    this.eventStats.set(eventName, currentCount + 1);
  }

  _addToHistory(eventName, args) {
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      argsCount: args.length,
      id: this._generateEventId()
    };
    
    this.eventHistory.push(event);
    
    // Trim history if it gets too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  _generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _getHealthWarnings(stats, listenerCount) {
    const warnings = [];
    
    if (listenerCount > 100) {
      warnings.push('High number of active listeners detected');
    }
    
    if (stats.totalEvents > 10000) {
      warnings.push('High event volume detected');
    }
    
    if (this.eventHistory.length >= this.maxHistorySize) {
      warnings.push('Event history buffer is full');
    }
    
    return warnings;
  }
}

module.exports = EventSystem;
