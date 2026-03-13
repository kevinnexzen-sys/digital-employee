import screenshot from 'screenshot-desktop';
import Tesseract from 'tesseract.js';
import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('ScreenWatcher');

class ScreenWatcher {
  constructor() {
    this.isWatching = false;
    this.screenshotDir = './data/screenshots';
    this.actionHistory = [];
    this.detectedPatterns = [];
  }

  async initialize() {
    try {
      await fs.ensureDir(this.screenshotDir);
      logger.info('Screen Watcher initialized (Smart Mode - On-Demand Only)');
    } catch (error) {
      logger.error('Failed to initialize Screen Watcher:', error);
      throw error;
    }
  }

  // SMART MODE: Only capture when needed
  async captureScreenshot(reason = 'manual') {
    try {
      logger.info(`📸 Taking screenshot (Reason: ${reason})`);
      
      const timestamp = Date.now();
      const filename = `screenshot_${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      const img = await screenshot();
      await fs.writeFile(filepath, img);

      logger.info(`✅ Screenshot saved: ${filename}`);

      return {
        success: true,
        filepath,
        filename,
        timestamp,
        reason
      };
    } catch (error) {
      logger.error('Screenshot capture failed:', error);
      throw error;
    }
  }

  // Capture + OCR for task confirmation
  async captureForConfirmation(taskDescription) {
    try {
      logger.info(`📸 Capturing screenshot for confirmation: ${taskDescription}`);
      
      const screenshot = await this.captureScreenshot('confirmation');
      
      // Perform OCR
      const ocrResult = await this.performOCR(screenshot.filepath);
      
      return {
        success: true,
        screenshot: screenshot.filepath,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        taskDescription
      };
    } catch (error) {
      logger.error('Capture for confirmation failed:', error);
      throw error;
    }
  }

  // Capture before executing action
  async captureBeforeAction(action) {
    try {
      logger.info(`📸 Capturing screenshot before action: ${action}`);
      
      const screenshot = await this.captureScreenshot(`before_${action}`);
      
      return {
        success: true,
        screenshot: screenshot.filepath,
        action
      };
    } catch (error) {
      logger.error('Capture before action failed:', error);
      throw error;
    }
  }

  // Perform OCR on screenshot
  async performOCR(imagePath) {
    try {
      logger.info('🔍 Performing OCR...');
      
      const { data } = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      logger.info(`✅ OCR completed (Confidence: ${data.confidence}%)`);

      return {
        success: true,
        text: data.text,
        confidence: data.confidence
      };
    } catch (error) {
      logger.error('OCR failed:', error);
      throw error;
    }
  }

  // Detect patterns in actions (for automation suggestions)
  detectPattern(action) {
    this.actionHistory.push({
      action,
      timestamp: Date.now()
    });

    // Keep only last 100 actions
    if (this.actionHistory.length > 100) {
      this.actionHistory.shift();
    }

    // Count repetitions
    const recentActions = this.actionHistory.slice(-10);
    const actionCounts = {};
    
    recentActions.forEach(item => {
      actionCounts[item.action] = (actionCounts[item.action] || 0) + 1;
    });

    // If action repeated 3+ times, suggest automation
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

  // Clean up old screenshots (keep last 50)
  async cleanupOldScreenshots() {
    try {
      const files = await fs.readdir(this.screenshotDir);
      const screenshots = files
        .filter(f => f.startsWith('screenshot_'))
        .map(f => ({
          name: f,
          path: path.join(this.screenshotDir, f),
          time: parseInt(f.match(/\d+/)[0])
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only last 50
      const toDelete = screenshots.slice(50);
      
      for (const file of toDelete) {
        await fs.remove(file.path);
      }

      if (toDelete.length > 0) {
        logger.info(`🗑️ Cleaned up ${toDelete.length} old screenshots`);
      }
    } catch (error) {
      logger.error('Cleanup failed:', error);
    }
  }

  // REMOVED: Continuous watching
  // Now only on-demand screenshots!

  async start() {
    await this.initialize();
    this.isWatching = true;
    logger.info('✅ Screen Watcher started (Smart Mode - On-Demand Only)');
    logger.info('   Screenshots will be taken only when:');
    logger.info('   - Asking for permission (Telegram)');
    logger.info('   - Before executing actions');
    logger.info('   - On manual request');
  }

  async stop() {
    this.isWatching = false;
    logger.info('Screen Watcher stopped');
  }

  getStatus() {
    return {
      isWatching: this.isWatching,
      mode: 'smart_on_demand',
      patternsDetected: this.detectedPatterns.length,
      actionsTracked: this.actionHistory.length
    };
  }
}

export default new ScreenWatcher();
