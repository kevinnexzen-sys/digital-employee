import { createLogger } from '../../utils/logger.js';
import browser from '../../tools/browser.js';

const logger = createLogger('BrowserWorker');

class BrowserWorker {
  async execute(task) {
    logger.info('Browser worker executing task');

    // Extract URL if present
    const urlMatch = task.description.match(/https?:\/\/[^\s]+/);
    
    if (urlMatch) {
      const url = urlMatch[0];
      await browser.navigate(url);
      
      const screenshot = await browser.screenshot();
      
      return {
        success: true,
        worker: 'browser',
        output: `Navigated to ${url}`,
        screenshot: screenshot.screenshot
      };
    }

    return {
      success: false,
      worker: 'browser',
      error: 'No URL found in task'
    };
  }
}

export default BrowserWorker;
