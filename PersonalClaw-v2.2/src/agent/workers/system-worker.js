import { createLogger } from '../../utils/logger.js';
import files from '../../tools/files.js';

const logger = createLogger('SystemWorker');

class SystemWorker {
  async execute(task) {
    logger.info('System worker executing task');

    // Handle file operations
    if (task.description.includes('list files')) {
      const result = await files.listFiles('./');
      return {
        success: true,
        worker: 'system',
        output: result.files
      };
    }

    return {
      success: true,
      worker: 'system',
      output: 'System task completed'
    };
  }
}

export default SystemWorker;
