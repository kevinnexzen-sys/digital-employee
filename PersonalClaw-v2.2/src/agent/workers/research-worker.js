import { createLogger } from '../../utils/logger.js';
import searchProvider from '../../skills-engine/search-provider.js';

const logger = createLogger('ResearchWorker');

class ResearchWorker {
  async execute(task) {
    logger.info('Research worker executing task');

    const results = await searchProvider.search(task.description, {
      maxResults: 5
    });

    return {
      success: true,
      worker: 'research',
      output: results.results
    };
  }
}

export default ResearchWorker;
