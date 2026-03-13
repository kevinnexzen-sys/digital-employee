import { createLogger } from '../../utils/logger.js';
import llmProvider from '../llm-provider.js';

const logger = createLogger('AnalysisWorker');

class AnalysisWorker {
  async execute(task) {
    logger.info('Analysis worker executing task');

    const prompt = `Analyze this request and provide insights: ${task.description}`;

    const response = await llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.5 }
    );

    return {
      success: true,
      worker: 'analysis',
      output: response.content
    };
  }
}

export default AnalysisWorker;
