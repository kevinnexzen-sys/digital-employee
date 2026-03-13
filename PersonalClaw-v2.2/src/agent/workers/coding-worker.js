import { createLogger } from '../../utils/logger.js';
import llmProvider from '../llm-provider.js';
import files from '../../tools/files.js';

const logger = createLogger('CodingWorker');

class CodingWorker {
  async execute(task) {
    logger.info('Coding worker executing task');

    const prompt = `You are a coding specialist. ${task.description}

Generate production-ready code with:
- Proper error handling
- Comments
- Type safety
- Best practices

Return the code and explanation.`;

    const response = await llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3 }
    );

    return {
      success: true,
      worker: 'coding',
      output: response.content
    };
  }
}

export default CodingWorker;
