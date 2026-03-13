/**
 * Browser Automation - Disabled (requires playwright)
 * Playwright needs native compilation on Windows
 */

import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import financialBlocker from '../security/financial-blocker.js';

const logger = createLogger('Browser');

class BrowserAutomation {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.isInitialized = false;
    this.disabled = true;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    logger.warn('Browser Automation is DISABLED (requires playwright package)');
    logger.info('To enable: Install Visual Studio Build Tools and run: npm install playwright');
    logger.info('Then run: npx playwright install chromium');
    
    this.isInitialized = false;
  }

  async navigate(url) {
    logger.warn('Browser navigation is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async fillForm(selector, value) {
    logger.warn('Form filling is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async click(selector) {
    logger.warn('Click automation is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async getText(selector) {
    logger.warn('Get text is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async screenshot(options = {}) {
    logger.warn('Browser screenshot is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async extractData(selectors) {
    logger.warn('Data extraction is disabled - missing dependencies');
    throw new Error('Browser automation disabled - requires playwright package');
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async close() {
    logger.debug('Browser close skipped - feature disabled');
  }

  getStatus() {
    return {
      isInitialized: false,
      disabled: true,
      reason: 'Missing playwright package'
    };
  }
}

export default new BrowserAutomation();
