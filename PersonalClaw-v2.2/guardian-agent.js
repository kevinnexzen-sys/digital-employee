#!/usr/bin/env node
/**
 * RAYN - Guardian Agent for PersonalClaw
 * 
 * Core Capabilities:
 * - Monitor PersonalClaw 24/7
 * - Detect crashes and restart automatically
 * - Detect freezes and hangs
 * - Protect system from unauthorized actions
 * - Only follows commands from Kevin (owner)
 * 
 * Security: Emergency kill switch with unlock code
 */

import { spawn } from 'child_process';
import { createLogger } from './src/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('GuardianAgent-Rayn');

class GuardianAgent {
  constructor() {
    this.name = 'Rayn';
    this.authorizedUser = 'Kevin'; // Only Kevin can control
    this.personalClawProcess = null;
    this.isMonitoring = false;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.lastCrashTime = null;
    this.healthCheckInterval = 10000; // Check every 10 seconds
    this.healthCheckTimer = null;
    this.emergencyKillCode = null; // Will be set from config
    this.isEmergencyMode = false;
    
    // Statistics
    this.stats = {
      startTime: new Date(),
      totalRestarts: 0,
      totalCrashes: 0,
      totalFreezes: 0,
      uptime: 0,
      lastHealthCheck: null
    };

    logger.info(`🛡️ Guardian Agent "${this.name}" initialized`);
    logger.info(`👤 Authorized user: ${this.authorizedUser}`);
  }

  /**
   * Start monitoring PersonalClaw
   */
  async start() {
    logger.info(`🚀 ${this.name} starting...`);
    logger.info(`🛡️ Mission: Protect and monitor PersonalClaw`);
    
    this.isMonitoring = true;
    
    // Start PersonalClaw
    await this.startPersonalClaw();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Setup process handlers
    this.setupProcessHandlers();
    
    logger.info(`✅ ${this.name} is now active and monitoring`);
    this.displayStatus();
  }

  /**
   * Start PersonalClaw process
   */
  async startPersonalClaw() {
    if (this.personalClawProcess) {
      logger.warn('PersonalClaw is already running');
      return;
    }

    logger.info('🦞 Starting PersonalClaw...');

    try {
      this.personalClawProcess = spawn('node', ['src/index.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, GUARDIAN_ACTIVE: 'true' }
      });

      // Monitor stdout
      this.personalClawProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Check for suspicious activity
        this.checkForSuspiciousActivity(output);
      });

      // Monitor stderr
      this.personalClawProcess.stderr.on('data', (data) => {
        const error = data.toString();
        logger.error(`PersonalClaw error: ${error}`);
        this.checkForSuspiciousActivity(error);
      });

      // Handle exit
      this.personalClawProcess.on('exit', (code, signal) => {
        logger.warn(`PersonalClaw exited with code ${code}, signal ${signal}`);
        this.handlePersonalClawCrash(code, signal);
      });

      // Handle errors
      this.personalClawProcess.on('error', (error) => {
        logger.error(`PersonalClaw process error: ${error.message}`);
        this.handlePersonalClawCrash(-1, 'ERROR');
      });

      logger.info('✅ PersonalClaw started successfully');
      this.stats.lastHealthCheck = new Date();
      
    } catch (error) {
      logger.error(`Failed to start PersonalClaw: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle PersonalClaw crash
   */
  async handlePersonalClawCrash(code, signal) {
    this.personalClawProcess = null;
    this.stats.totalCrashes++;
    this.lastCrashTime = new Date();

    logger.error(`🚨 PersonalClaw crashed! Code: ${code}, Signal: ${signal}`);
    logger.info(`📊 Total crashes: ${this.stats.totalCrashes}`);

    // Check if too many restarts
    if (this.restartCount >= this.maxRestarts) {
      logger.error(`❌ Too many restarts (${this.restartCount}). Entering emergency mode.`);
      this.enterEmergencyMode();
      return;
    }

    // Wait before restart
    const waitTime = Math.min(5000 * (this.restartCount + 1), 30000);
    logger.info(`⏳ Waiting ${waitTime}ms before restart...`);
    
    await this.sleep(waitTime);

    // Restart PersonalClaw
    logger.info(`🔄 Restarting PersonalClaw (attempt ${this.restartCount + 1}/${this.maxRestarts})...`);
    this.restartCount++;
    this.stats.totalRestarts++;
    
    await this.startPersonalClaw();
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    logger.info('🏥 Starting health monitoring...');
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  performHealthCheck() {
    if (!this.personalClawProcess) {
      logger.warn('⚠️ PersonalClaw is not running!');
      return;
    }

    // Check if process is still alive
    try {
      process.kill(this.personalClawProcess.pid, 0);
      
      // Process is alive
      this.stats.lastHealthCheck = new Date();
      this.stats.uptime = Date.now() - this.stats.startTime.getTime();
      
      // Reset restart count if running stable for 5 minutes
      if (this.lastCrashTime) {
        const timeSinceLastCrash = Date.now() - this.lastCrashTime.getTime();
        if (timeSinceLastCrash > 300000) { // 5 minutes
          this.restartCount = 0;
          this.lastCrashTime = null;
        }
      }
      
    } catch (error) {
      logger.error('❌ PersonalClaw process is not responding!');
      this.stats.totalFreezes++;
      this.handlePersonalClawCrash(-1, 'FREEZE');
    }
  }

  /**
   * Check for suspicious activity
   */
  checkForSuspiciousActivity(output) {
    const suspiciousPatterns = [
      /financial.*transaction/i,
      /bank.*transfer/i,
      /credit.*card/i,
      /payment.*process/i,
      /unauthorized.*access/i,
      /system.*compromise/i,
      /malicious.*code/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(output)) {
        logger.error(`🚨 SUSPICIOUS ACTIVITY DETECTED: ${output.substring(0, 100)}`);
        this.handleSuspiciousActivity(output);
        break;
      }
    }
  }

  /**
   * Handle suspicious activity
   */
  handleSuspiciousActivity(activity) {
    logger.error('🛑 EMERGENCY: Suspicious activity detected!');
    logger.error(`Activity: ${activity.substring(0, 200)}`);
    
    // Kill PersonalClaw immediately
    if (this.personalClawProcess) {
      logger.warn('🛑 Terminating PersonalClaw for safety...');
      this.personalClawProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.personalClawProcess) {
          logger.error('🛑 Force killing PersonalClaw...');
          this.personalClawProcess.kill('SIGKILL');
        }
      }, 5000);
    }

    // Enter emergency mode
    this.enterEmergencyMode();
    
    // Log incident
    this.logSecurityIncident(activity);
  }

  /**
   * Enter emergency mode
   */
  enterEmergencyMode() {
    this.isEmergencyMode = true;
    this.isMonitoring = false;
    
    logger.error('🚨 ENTERING EMERGENCY MODE');
    logger.error('🛑 PersonalClaw has been stopped for safety');
    logger.error('🔐 Emergency unlock code required to restart');
    logger.error(`👤 Only ${this.authorizedUser} can unlock`);
    
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Save emergency state
    this.saveEmergencyState();
  }

  /**
   * Unlock emergency mode (requires code)
   */
  unlockEmergencyMode(code, user) {
    if (user !== this.authorizedUser) {
      logger.error(`❌ Unauthorized unlock attempt by: ${user}`);
      return false;
    }

    // Check unlock code (you mentioned you have a code)
    // For now, using a placeholder - you can set the real code
    const validCode = process.env.EMERGENCY_UNLOCK_CODE || 'KEVIN_UNLOCK_2024';
    
    if (code !== validCode) {
      logger.error('❌ Invalid unlock code');
      return false;
    }

    logger.info(`✅ Emergency mode unlocked by ${user}`);
    this.isEmergencyMode = false;
    this.restartCount = 0;
    this.stats.totalCrashes = 0;
    
    return true;
  }

  /**
   * Log security incident
   */
  logSecurityIncident(activity) {
    const incident = {
      timestamp: new Date().toISOString(),
      type: 'SUSPICIOUS_ACTIVITY',
      activity: activity,
      action: 'TERMINATED_PERSONALCLAW',
      authorizedUser: this.authorizedUser
    };

    const logFile = path.join(__dirname, 'logs', 'security-incidents.json');
    
    try {
      let incidents = [];
      if (fs.existsSync(logFile)) {
        incidents = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      }
      
      incidents.push(incident);
      fs.writeFileSync(logFile, JSON.stringify(incidents, null, 2));
      
      logger.info(`📝 Security incident logged to ${logFile}`);
    } catch (error) {
      logger.error(`Failed to log security incident: ${error.message}`);
    }
  }

  /**
   * Save emergency state
   */
  saveEmergencyState() {
    const state = {
      timestamp: new Date().toISOString(),
      isEmergencyMode: this.isEmergencyMode,
      stats: this.stats,
      authorizedUser: this.authorizedUser
    };

    const stateFile = path.join(__dirname, 'guardian-state.json');
    
    try {
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      logger.info(`💾 Emergency state saved to ${stateFile}`);
    } catch (error) {
      logger.error(`Failed to save emergency state: ${error.message}`);
    }
  }

  /**
   * Setup process handlers
   */
  setupProcessHandlers() {
    process.on('SIGINT', () => {
      logger.info('🛑 Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGTERM', () => {
      logger.info('🛑 Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.message}`);
      logger.error(error.stack);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error(`Unhandled rejection at ${promise}: ${reason}`);
    });
  }

  /**
   * Shutdown Guardian Agent
   */
  shutdown() {
    logger.info(`🛑 ${this.name} shutting down...`);
    
    this.isMonitoring = false;
    
    // Stop health monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Stop PersonalClaw
    if (this.personalClawProcess) {
      logger.info('🛑 Stopping PersonalClaw...');
      this.personalClawProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (this.personalClawProcess) {
          this.personalClawProcess.kill('SIGKILL');
        }
        process.exit(0);
      }, 5000);
    } else {
      process.exit(0);
    }
  }

  /**
   * Display status
   */
  displayStatus() {
    console.log('\n' + '='.repeat(60));
    console.log(`🛡️  GUARDIAN AGENT: ${this.name}`);
    console.log('='.repeat(60));
    console.log(`👤 Authorized User: ${this.authorizedUser}`);
    console.log(`🦞 Protected: PersonalClaw`);
    console.log(`📊 Status: ${this.isMonitoring ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`🔄 Total Restarts: ${this.stats.totalRestarts}`);
    console.log(`💥 Total Crashes: ${this.stats.totalCrashes}`);
    console.log(`❄️  Total Freezes: ${this.stats.totalFreezes}`);
    console.log(`⏱️  Uptime: ${this.formatUptime(this.stats.uptime)}`);
    console.log(`🏥 Last Health Check: ${this.stats.lastHealthCheck?.toLocaleString() || 'Never'}`);
    console.log('='.repeat(60));
    console.log(`\n🛡️  ${this.name} is protecting PersonalClaw...`);
    console.log(`Press Ctrl+C to stop\n`);
  }

  /**
   * Format uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start Guardian Agent
const guardian = new GuardianAgent();
guardian.start().catch(error => {
  logger.error(`Failed to start Guardian Agent: ${error.message}`);
  process.exit(1);
});

export default GuardianAgent;
