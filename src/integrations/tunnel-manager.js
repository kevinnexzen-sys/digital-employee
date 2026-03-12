/**
 * KevinJr Tunnel Manager
 * Secure remote access solution for mobile and messaging integrations
 */

const EventEmitter = require('eventemitter3');
const winston = require('winston');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class TunnelManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      port: options.port || 3001,
      tunnelService: options.tunnelService || 'ngrok', // ngrok, localtunnel, or custom
      authSecret: options.authSecret || crypto.randomBytes(32).toString('hex'),
      allowedOrigins: options.allowedOrigins || ['*'],
      rateLimitWindow: options.rateLimitWindow || 60000, // 1 minute
      rateLimitMax: options.rateLimitMax || 100,
      ...options
    };
    
    this.isActive = false;
    this.publicUrl = null;
    this.tunnel = null;
    this.rateLimitStore = new Map();
    
    this._setupLogger();
  }

  _setupLogger() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [TunnelManager] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }

  /**
   * Start the tunnel service
   */
  async start() {
    try {
      this.logger.info('🌐 Starting tunnel service...');
      
      switch (this.options.tunnelService) {
        case 'ngrok':
          await this._startNgrok();
          break;
        case 'localtunnel':
          await this._startLocalTunnel();
          break;
        case 'custom':
          await this._startCustomTunnel();
          break;
        default:
          throw new Error(`Unsupported tunnel service: ${this.options.tunnelService}`);
      }
      
      this.isActive = true;
      this.logger.info(`✅ Tunnel active: ${this.publicUrl}`);
      this.emit('tunnel:started', { url: this.publicUrl });
      
      return this.publicUrl;
    } catch (error) {
      this.logger.error(`❌ Failed to start tunnel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop the tunnel service
   */
  async stop() {
    try {
      this.logger.info('🛑 Stopping tunnel service...');
      
      if (this.tunnel && typeof this.tunnel.close === 'function') {
        await this.tunnel.close();
      }
      
      this.isActive = false;
      this.publicUrl = null;
      this.tunnel = null;
      
      this.logger.info('✅ Tunnel stopped');
      this.emit('tunnel:stopped');
    } catch (error) {
      this.logger.error(`❌ Error stopping tunnel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start ngrok tunnel
   */
  async _startNgrok() {
    try {
      // Dynamic import for ngrok
      const ngrok = await import('ngrok');
      
      this.tunnel = await ngrok.connect({
        port: this.options.port,
        proto: 'http',
        bind_tls: true, // Force HTTPS
        inspect: false // Disable ngrok web interface
      });
      
      this.publicUrl = this.tunnel;
      this.logger.info(`🔗 Ngrok tunnel established: ${this.publicUrl}`);
    } catch (error) {
      // Fallback to localtunnel if ngrok fails
      this.logger.warn('⚠️ Ngrok failed, falling back to localtunnel...');
      await this._startLocalTunnel();
    }
  }

  /**
   * Start localtunnel
   */
  async _startLocalTunnel() {
    try {
      const localtunnel = require('localtunnel');
      
      this.tunnel = await localtunnel({
        port: this.options.port,
        subdomain: `kevinjr-${crypto.randomBytes(4).toString('hex')}`
      });
      
      this.publicUrl = this.tunnel.url;
      this.logger.info(`🔗 LocalTunnel established: ${this.publicUrl}`);
      
      this.tunnel.on('close', () => {
        this.logger.warn('⚠️ Tunnel closed unexpectedly');
        this.emit('tunnel:closed');
      });
    } catch (error) {
      this.logger.error(`❌ LocalTunnel failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start custom tunnel (placeholder for future implementation)
   */
  async _startCustomTunnel() {
    // For now, just use the local URL
    this.publicUrl = `http://localhost:${this.options.port}`;
    this.logger.info(`🔗 Using local URL: ${this.publicUrl}`);
  }

  /**
   * Generate authentication token for mobile/bot access
   */
  generateAuthToken(clientInfo = {}) {
    const payload = {
      clientId: crypto.randomBytes(16).toString('hex'),
      type: clientInfo.type || 'unknown',
      platform: clientInfo.platform || 'unknown',
      createdAt: Date.now(),
      ...clientInfo
    };
    
    return jwt.sign(payload, this.options.authSecret, {
      expiresIn: '30d' // 30 days
    });
  }

  /**
   * Verify authentication token
   */
  verifyAuthToken(token) {
    try {
      return jwt.verify(token, this.options.authSecret);
    } catch (error) {
      this.logger.warn(`🔒 Invalid auth token: ${error.message}`);
      return null;
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(clientId) {
    const now = Date.now();
    const windowStart = now - this.options.rateLimitWindow;
    
    if (!this.rateLimitStore.has(clientId)) {
      this.rateLimitStore.set(clientId, []);
    }
    
    const requests = this.rateLimitStore.get(clientId);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= this.options.rateLimitMax) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    validRequests.push(now);
    this.rateLimitStore.set(clientId, validRequests);
    
    return true; // Within rate limit
  }

  /**
   * Get tunnel status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      publicUrl: this.publicUrl,
      service: this.options.tunnelService,
      port: this.options.port,
      connectedClients: this.rateLimitStore.size
    };
  }

  /**
   * Create webhook URL for messaging platforms
   */
  createWebhookUrl(platform, endpoint = 'webhook') {
    if (!this.publicUrl) {
      throw new Error('Tunnel not active');
    }
    
    return `${this.publicUrl}/api/integrations/${platform}/${endpoint}`;
  }

  /**
   * Clean up rate limit store periodically
   */
  _cleanupRateLimit() {
    const now = Date.now();
    const windowStart = now - this.options.rateLimitWindow;
    
    for (const [clientId, requests] of this.rateLimitStore.entries()) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (validRequests.length === 0) {
        this.rateLimitStore.delete(clientId);
      } else {
        this.rateLimitStore.set(clientId, validRequests);
      }
    }
  }
}

module.exports = TunnelManager;
