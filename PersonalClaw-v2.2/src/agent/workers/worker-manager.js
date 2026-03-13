import { createLogger } from '../../utils/logger.js';
import CodingWorker from './coding-worker.js';
import BrowserWorker from './browser-worker.js';
import SystemWorker from './system-worker.js';
import ResearchWorker from './research-worker.js';
import AnalysisWorker from './analysis-worker.js';

const logger = createLogger('WorkerManager');

class WorkerManager {
  constructor() {
    this.workers = {
      coding: new CodingWorker(),
      browser: new BrowserWorker(),
      system: new SystemWorker(),
      research: new ResearchWorker(),
      analysis: new AnalysisWorker()
    };
    
    this.activeJobs = new Map();
  }

  async dispatchTask(task) {
    try {
      logger.info(`Dispatching task: ${task.type}`);

      const workerType = this.selectWorker(task);
      const worker = this.workers[workerType];

      if (!worker) {
        throw new Error(`Unknown worker type: ${workerType}`);
      }

      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.activeJobs.set(jobId, {
        id: jobId,
        type: workerType,
        task,
        status: 'running',
        startedAt: Date.now()
      });

      const result = await worker.execute(task);

      this.activeJobs.get(jobId).status = 'completed';
      this.activeJobs.get(jobId).completedAt = Date.now();
      this.activeJobs.get(jobId).result = result;

      return {
        success: true,
        jobId,
        workerType,
        result
      };
    } catch (error) {
      logger.error('Task dispatch failed:', error);
      throw error;
    }
  }

  selectWorker(task) {
    // Intelligent worker selection based on task
    const taskLower = task.description.toLowerCase();

    if (taskLower.includes('code') || taskLower.includes('program') || taskLower.includes('function')) {
      return 'coding';
    } else if (taskLower.includes('browse') || taskLower.includes('website') || taskLower.includes('web')) {
      return 'browser';
    } else if (taskLower.includes('file') || taskLower.includes('system') || taskLower.includes('process')) {
      return 'system';
    } else if (taskLower.includes('research') || taskLower.includes('find') || taskLower.includes('search')) {
      return 'research';
    } else {
      return 'analysis';
    }
  }

  async dispatchParallel(tasks) {
    logger.info(`Dispatching ${tasks.length} tasks in parallel`);

    const promises = tasks.map(task => this.dispatchTask(task));
    const results = await Promise.allSettled(promises);

    return results.map((result, index) => ({
      task: tasks[index],
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  getActiveJobs() {
    return Array.from(this.activeJobs.values());
  }

  cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.status = 'cancelled';
      logger.info(`Job cancelled: ${jobId}`);
      return true;
    }
    return false;
  }
}

export default new WorkerManager();
