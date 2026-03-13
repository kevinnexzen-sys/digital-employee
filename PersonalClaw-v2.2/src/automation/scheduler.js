import { createLogger } from '../utils/logger.js';
import cron from 'node-cron';

const logger = createLogger('Scheduler');

class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  start() {
    this.isRunning = true;
    logger.info('Scheduler started');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.isRunning = false;
    logger.info('Scheduler stopped');
  }

  scheduleJob(id, cronExpression, callback) {
    if (this.jobs.has(id)) {
      logger.warn(`Job ${id} already exists, replacing`);
      this.jobs.get(id).stop();
    }

    const job = cron.schedule(cronExpression, callback, {
      scheduled: this.isRunning
    });

    this.jobs.set(id, job);
    logger.info(`Scheduled job ${id} with expression: ${cronExpression}`);
    return job;
  }

  removeJob(id) {
    const job = this.jobs.get(id);
    if (job) {
      job.stop();
      this.jobs.delete(id);
      logger.info(`Removed job ${id}`);
      return true;
    }
    return false;
  }

  getJob(id) {
    return this.jobs.get(id);
  }

  listJobs() {
    return Array.from(this.jobs.keys());
  }

  // Preset schedules
  daily(id, hour, minute, callback) {
    return this.scheduleJob(id, `${minute} ${hour} * * *`, callback);
  }

  weekly(id, dayOfWeek, hour, minute, callback) {
    return this.scheduleJob(id, `${minute} ${hour} * * ${dayOfWeek}`, callback);
  }

  monthly(id, dayOfMonth, hour, minute, callback) {
    return this.scheduleJob(id, `${minute} ${hour} ${dayOfMonth} * *`, callback);
  }
}

export default new Scheduler();
