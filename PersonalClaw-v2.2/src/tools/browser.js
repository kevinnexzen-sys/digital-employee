import { chromium } from 'playwright';
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
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing browser...');
      
      this.browser = await chromium.launch({
        headless: config.browser.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });

      await this.context.route('**/*', async (route) => {
        const url = route.request().url();
        const blockResult = financialBlocker.checkUrl(url);
        
        if (blockResult.blocked) {
          logger.warn(`Blocked navigation to: ${url}`);
          await route.abort('blockedbyclient');
        } else {
          await route.continue();
        }
      });

      this.page = await this.context.newPage();
      this.isInitialized = true;
      
      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  async navigate(url) {
    await this.ensureInitialized();
    
    const blockResult = financialBlocker.checkUrl(url);
    if (blockResult.blocked) {
      throw new Error(`Navigation blocked: ${blockResult.reason}`);
    }

    try {
      logger.info(`Navigating to: ${url}`);
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: config.browser.timeout 
      });
      
      const html = await this.page.content();
      const contentCheck = financialBlocker.checkDomContent(html);
      
      if (contentCheck.blocked) {
        logger.warn(`Financial content detected on page: ${url}`);
        await this.page.close();
        this.page = await this.context.newPage();
        throw new Error(`Page blocked: ${contentCheck.reason}`);
      }
      
      return { success: true, url: this.page.url() };
    } catch (error) {
      logger.error(`Navigation failed: ${error.message}`);
      throw error;
    }
  }

  async fillForm(selector, value) {
    await this.ensureInitialized();
    
    try {
      logger.info(`Filling form field: ${selector}`);
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.fill(selector, value);
      return { success: true };
    } catch (error) {
      logger.error(`Form fill failed: ${error.message}`);
      throw error;
    }
  }

  async click(selector) {
    await this.ensureInitialized();
    
    try {
      logger.info(`Clicking element: ${selector}`);
      await this.page.waitForSelector(selector, { timeout: 5000 });
      await this.page.click(selector);
      return { success: true };
    } catch (error) {
      logger.error(`Click failed: ${error.message}`);
      throw error;
    }
  }

  async getText(selector) {
    await this.ensureInitialized();
    
    try {
      logger.info(`Getting text from: ${selector}`);
      await this.page.waitForSelector(selector, { timeout: 5000 });
      const text = await this.page.textContent(selector);
      return { success: true, text };
    } catch (error) {
      logger.error(`Get text failed: ${error.message}`);
      throw error;
    }
  }

  async screenshot(options = {}) {
    await this.ensureInitialized();
    
    try {
      logger.info('Taking screenshot');
      const screenshot = await this.page.screenshot({
        type: 'png',
        fullPage: options.fullPage || false,
        ...options
      });
      return { success: true, screenshot };
    } catch (error) {
      logger.error(`Screenshot failed: ${error.message}`);
      throw error;
    }
  }

  async extractData(selectors) {
    await this.ensureInitialized();
    
    try {
      logger.info('Extracting data from page');
      const data = {};
      
      for (const [key, selector] of Object.entries(selectors)) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            data[key] = await element.textContent();
          }
        } catch (err) {
          logger.warn(`Failed to extract ${key}: ${err.message}`);
          data[key] = null;
        }
      }
      
      return { success: true, data };
    } catch (error) {
      logger.error(`Data extraction failed: ${error.message}`);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.isInitialized = false;
      logger.info('Browser closed');
    } catch (error) {
      logger.error('Error closing browser:', error);
    }
  }
}

export default new BrowserAutomation();
