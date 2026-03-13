/**
 * Screen Watcher - Disabled (requires screenshot-desktop and tesseract.js)
 * These packages need native compilation on Windows
 */

import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ScreenWatcher');

class ScreenWatcher {
  constructor() {
    this.isWatching = false;
    this.screenshotDir = './data/screenshots';
    this.actionHistory = [];
    this.detectedPatterns = [];
    this.disabled = true;
  }

  async initialize() {
    try {
      await fs.ensureDir(this.screenshotDir);
      logger.warn('Screen Watcher is DISABLED (requires screenshot-desktop and tesseract.js packages)');
      logger.info('To enable: Install Visual Studio Build Tools and run: npm install screenshot-desktop tesseract.js');
    } catch (error) {
      logger.error('Failed to initialize Screen Watcher:', error);
    }
  }

  async captureScreenshot(reason = 'manual') {
    logger.warn('Screenshot capture is disabled - missing dependencies');
    return {
      success: false,
      error: 'Screen capture disabled - requires screenshot-desktop package',
      reason
    };
  }

  async captureForConfirmation(taskDescription) {
    logger.warn('Screenshot confirmation is disabled - missing dependencies');
    return {
      success: false,
      error: 'Screen capture disabled',
      taskDescription
    };
  }

  async captureBeforeAction(action) {
    logger.warn('Screenshot before action is disabled - missing dependencies');
    return {
      success: false,
      error: 'Screen capture disabled',
      action
    };
  }

  async performOCR(imagePath) {
    logger.warn('OCR is disabled - missing dependencies');
    return {
      success: false,
      error: 'OCR disabled - requires tesseract.js package'
    };
  }

  detectPattern(action) {
    this.actionHistory.push({
      action,
      timestamp: Date.now()
    });

    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }

    const recentActions = this.actionHistory.slice(-10);
    const actionCounts = {};
    
    recentActions.forEach(item => {
      actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
    });

    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count >= 3) {
        const existing = this.detectedPatterns.find(p => p.action === action);
        if (!existing) {
          logger.info(`🔔 Pattern detected: "${action}" repeated ${count} times`);
          this.detectedPatterns.push({
            action,
            count,
            firstSeen: Date.now(),
            suggested: false
          });
        }
      }
    });

    return this.detectedPatterns;
  }

  getDetectedPatterns() {
    return this.detectedPatterns;
  }

  clearPatterns() {
    this.detectedPatterns = [];
    this.actionHistory = [];
    logger.info('Patterns cleared');
  }

  async cleanupOldScreenshots() {
    logger.debug('Screenshot cleanup skipped - feature disabled');
  }

  async start() {
    await this.initialize();
    this.isWatching = false;
    logger.warn('⚠️  Screen Watcher is DISABLED');
    logger.info('   Pattern detection still works');
    logger.info('   Screenshot/OCR features require additional packages');
  }

  async stop() {
    this.isWatching = false;
    logger.info('Screen Watcher stopped');
  }

  getStatus() {
    return {
      isWatching: false,
      disabled: true,
      mode: 'disabled',
      patternsDetected: this.detectedPatterns.length,
      actionsTracked: this.actionHistory.length,
      reason: 'Missing screenshot-desktop and tesseract.js packages'
    };
  }
}

export default new ScreenWatcher();
