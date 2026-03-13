import llmProvider from './llm-provider.js';
import { createLogger } from '../utils/logger.js';
import database from '../memory/database.js';
import browser from '../tools/browser.js';
import files from '../tools/files.js';
import workerManager from './workers/worker-manager.js';

const logger = createLogger('Executor');

class AgentExecutor {
  constructor() {
    this.isRunning = false;
    this.useMultiAgent = true; // Enable multi-agent by default
  }

  async execute(userMessage) {
    try {
      this.isRunning = true;
      logger.info('Executing agent task');

      // Add user message to database
      database.addConversation('user', userMessage);

      // Check if this should use multi-agent
      if (this.useMultiAgent && this.shouldUseMultiAgent(userMessage)) {
        return await this.executeWithWorkers(userMessage);
      } else {
        return await this.executeSingleAgent(userMessage);
      }
    } catch (error) {
      logger.error('Execution failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  shouldUseMultiAgent(message) {
    const multiAgentKeywords = [
      'code', 'program', 'function', 'website', 'browse',
      'search', 'research', 'analyze', 'file', 'system'
    ];

    const messageLower = message.toLowerCase();
    return multiAgentKeywords.some(keyword => messageLower.includes(keyword));
  }

  async executeWithWorkers(userMessage) {
    logger.info('Using multi-agent execution');

    // Determine task type and dispatch to appropriate worker
    const task = {
      description: userMessage,
      timestamp: Date.now()
    };

    const result = await workerManager.dispatchTask(task);

    // Add assistant response to database
    const response = result.result.output;
    database.addConversation('assistant', JSON.stringify(response));

    return {
      success: true,
      response,
      workerType: result.workerType,
      jobId: result.jobId
    };
  }

  async executeSingleAgent(userMessage) {
    logger.info('Using single agent execution');

    // Get conversation history
    const history = database.getConversations(10);
    
    // Build messages for LLM
    const messages = history.reverse().map(conv => ({
      role: conv.role,
      content: conv.message
    }));

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Get response from LLM
    const response = await llmProvider.chat(messages);

    // Add assistant response to database
    database.addConversation('assistant', response.content);

    return {
      success: true,
      response: response.content,
      mode: 'single-agent'
    };
  }

  async dispatchParallelTasks(tasks) {
    logger.info(`Dispatching ${tasks.length} parallel tasks`);
    return await workerManager.dispatchParallel(tasks);
  }

  getActiveJobs() {
    return workerManager.getActiveJobs();
  }

  cancelJob(jobId) {
    return workerManager.cancelJob(jobId);
  }

  toggleMultiAgent(enabled) {
    this.useMultiAgent = enabled;
    logger.info(`Multi-agent mode: ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new AgentExecutor();
