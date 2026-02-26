/**
 * KevinJr Security Manager
 * Authentication, authorization, and security enforcement
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const winston = require('winston');

class SecurityManager {
  constructor(config) {
    this.config = config;
    this.logger = null;
    
    // Security state
    this.sessions = new Map();
    this.failedAttempts = new Map();
    this.auditLog = [];
    this.permissions = new Map();
    
    // Permission levels
    this.PERMISSION_LEVELS = {
      PUBLIC: 0,
      USER: 1,
      SYSTEM: 2,
      ADMIN: 3
    };
    
    // Default permissions for commands
    this.defaultPermissions = {
      'status': this.PERMISSION_LEVELS.PUBLIC,
      'help': this.PERMISSION_LEVELS.PUBLIC,
      'capabilities': this.PERMISSION_LEVELS.PUBLIC,
      'config:get': this.PERMISSION_LEVELS.USER,
      'config:set': this.PERMISSION_LEVELS.USER,
      'module:load': this.PERMISSION_LEVELS.SYSTEM,
      'module:unload': this.PERMISSION_LEVELS.SYSTEM,
      'system:shutdown': this.PERMISSION_LEVELS.ADMIN,
      'security:audit': this.PERMISSION_LEVELS.ADMIN
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the security manager
   */
  async initialize() {
    this.logger.info('🔒 Security manager initializing...');
    
    // Load permissions from config
    await this._loadPermissions();
    
    // Set up audit logging
    this._setupAuditLogging();
    
    // Initialize security policies
    this._initializePolicies();
    
    this.logger.info('✅ Security manager ready');
    return true;
  }

  /**
   * Validate a command execution request
   */
  async validateCommand(command, params = {}, context = {}) {
    try {
      // Get required permission level for command
      const requiredLevel = this._getRequiredPermissionLevel(command);
      
      // Get user's permission level
      const userLevel = await this._getUserPermissionLevel(context);
      
      // Check if user has sufficient permissions
      if (userLevel < requiredLevel) {
        await this._logSecurityEvent('PERMISSION_DENIED', {
          command,
          requiredLevel,
          userLevel,
          context
        });
        
        return {
          allowed: false,
          reason: `Insufficient permissions. Required: ${this._getLevelName(requiredLevel)}, User: ${this._getLevelName(userLevel)}`
        };
      }
      
      // Check for rate limiting
      const rateLimitCheck = await this._checkRateLimit(context);
      if (!rateLimitCheck.allowed) {
        return rateLimitCheck;
      }
      
      // Check for suspicious patterns
      const suspiciousCheck = await this._checkSuspiciousActivity(command, params, context);
      if (!suspiciousCheck.allowed) {
        return suspiciousCheck;
      }
      
      // Log successful validation
      await this._logSecurityEvent('COMMAND_AUTHORIZED', {
        command,
        userLevel,
        context
      });
      
      return { allowed: true };
      
    } catch (error) {
      this.logger.error('💥 Security validation error:', error);
      
      // Fail secure - deny access on error
      return {
        allowed: false,
        reason: 'Security validation failed'
      };
    }
  }

  /**
   * Create a new session
   */
  async createSession(userId, metadata = {}) {
    const sessionId = this._generateSessionId();
    const expiresAt = new Date(Date.now() + this.config.get('security.sessionTimeout', 3600000));
    
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date(),
      expiresAt,
      metadata,
      lastActivity: new Date()
    };
    
    this.sessions.set(sessionId, session);
    
    await this._logSecurityEvent('SESSION_CREATED', {
      sessionId,
      userId,
      metadata
    });
    
    return sessionId;
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }
    
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      await this._logSecurityEvent('SESSION_EXPIRED', { sessionId });
      return { valid: false, reason: 'Session expired' };
    }
    
    // Update last activity
    session.lastActivity = new Date();
    
    return { valid: true, session };
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      await this._logSecurityEvent('SESSION_DESTROYED', { sessionId });
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data) {
    try {
      const key = this._getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', key);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      this.logger.error('💥 Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData) {
    try {
      const key = this._getEncryptionKey();
      const decipher = crypto.createDecipher('aes-256-gcm', key);
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      this.logger.error('💥 Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Generate secure hash
   */
  hash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(32).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    
    return { hash, salt };
  }

  /**
   * Verify hash
   */
  verifyHash(data, hash, salt) {
    const { hash: computedHash } = this.hash(data, salt);
    return computedHash === hash;
  }

  /**
   * Generate JWT token
   */
  generateToken(payload, expiresIn = '1h') {
    const secret = this._getJWTSecret();
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const secret = this._getJWTSecret();
      return jwt.verify(token, secret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get security audit log
   */
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  /**
   * Clear audit log
   */
  clearAuditLog() {
    this.auditLog = [];
    this.logger.info('🧹 Security audit log cleared');
  }

  /**
   * Get security statistics
   */
  getSecurityStats() {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.expiresAt > now);
    
    return {
      activeSessions: activeSessions.length,
      totalSessions: this.sessions.size,
      failedAttempts: this.failedAttempts.size,
      auditLogSize: this.auditLog.length,
      permissions: this.permissions.size
    };
  }

  /**
   * Health check
   */
  healthCheck() {
    const stats = this.getSecurityStats();
    const warnings = [];
    
    if (stats.failedAttempts > 10) {
      warnings.push('High number of failed authentication attempts');
    }
    
    if (stats.auditLogSize > 10000) {
      warnings.push('Audit log is getting large');
    }
    
    return {
      healthy: true,
      stats,
      warnings
    };
  }

  /**
   * Cleanup expired sessions and old audit logs
   */
  async cleanup() {
    this.logger.info('🧹 Security manager cleanup...');
    
    // Remove expired sessions
    const now = new Date();
    let expiredCount = 0;
    
    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now) {
        this.sessions.delete(sessionId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.logger.info(`🗑️  Removed ${expiredCount} expired sessions`);
    }
    
    // Trim audit log
    if (this.auditLog.length > 5000) {
      this.auditLog = this.auditLog.slice(-5000);
      this.logger.info('🗑️  Trimmed audit log');
    }
    
    // Clear old failed attempts
    this.failedAttempts.clear();
    
    this.logger.info('✅ Security cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [SecurityManager] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _loadPermissions() {
    // Load custom permissions from config
    const customPermissions = this.config.get('security.permissions', {});
    
    // Merge with defaults
    this.permissions = new Map([
      ...Object.entries(this.defaultPermissions),
      ...Object.entries(customPermissions)
    ]);
    
    this.logger.info(`🔑 Loaded ${this.permissions.size} permission rules`);
  }

  _setupAuditLogging() {
    if (this.config.get('security.auditLogging', true)) {
      this.logger.info('📋 Audit logging enabled');
    }
  }

  _initializePolicies() {
    // Initialize security policies
    this.logger.info('📜 Security policies initialized');
  }

  _getRequiredPermissionLevel(command) {
    // Check for exact match first
    if (this.permissions.has(command)) {
      return this.permissions.get(command);
    }
    
    // Check for pattern matches
    for (const [pattern, level] of this.permissions) {
      if (pattern.includes('*') || pattern.includes(':')) {
        const regex = new RegExp(pattern.replace('*', '.*').replace(':', ':'));
        if (regex.test(command)) {
          return level;
        }
      }
    }
    
    // Default to USER level for unknown commands
    return this.PERMISSION_LEVELS.USER;
  }

  async _getUserPermissionLevel(context) {
    // For now, return USER level
    // In future phases, this will check actual user authentication
    return this.PERMISSION_LEVELS.USER;
  }

  _getLevelName(level) {
    const names = Object.keys(this.PERMISSION_LEVELS);
    return names.find(name => this.PERMISSION_LEVELS[name] === level) || 'UNKNOWN';
  }

  async _checkRateLimit(context) {
    // Simple rate limiting implementation
    // In production, this would be more sophisticated
    return { allowed: true };
  }

  async _checkSuspiciousActivity(command, params, context) {
    // Check for suspicious patterns
    // This is a basic implementation
    return { allowed: true };
  }

  async _logSecurityEvent(event, data) {
    if (!this.config.get('security.auditLogging', true)) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      id: this._generateEventId()
    };
    
    this.auditLog.push(logEntry);
    
    // Log important events
    if (['PERMISSION_DENIED', 'SESSION_EXPIRED', 'SUSPICIOUS_ACTIVITY'].includes(event)) {
      this.logger.warn(`🚨 Security event: ${event}`, data);
    }
  }

  _generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  _generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _getEncryptionKey() {
    let key = this.config.getSecret('security.encryptionKey') || process.env.ENCRYPTION_KEY;
    
    if (!key) {
      key = 'kevinjr-default-encryption-key-change-me-for-security';
      this.logger.warn('⚠️  Using default encryption key. Set ENCRYPTION_KEY for security.');
    }
    
    return key;
  }

  _getJWTSecret() {
    let secret = this.config.getSecret('security.jwtSecret') || process.env.JWT_SECRET;
    
    if (!secret) {
      secret = 'kevinjr-default-jwt-secret-change-me-for-security';
      this.logger.warn('⚠️  Using default JWT secret. Set JWT_SECRET for security.');
    }
    
    return secret;
  }
}

module.exports = SecurityManager;
