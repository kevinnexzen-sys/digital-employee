import { createLogger } from '../utils/logger.js';
import database from '../memory/database.js';
import scheduler from './scheduler.js';
import webhookHandler from './webhook-handler.js';
import emailTriggers from './email-triggers.js';

const logger = createLogger('AutomationManager');

class AutomationManager {
  constructor() {
    this.automations = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Start scheduler
    scheduler.start();

    // Load saved automations from database
    await this.loadAutomations();

    this.initialized = true;
    logger.info('Automation Manager initialized');
  }

  async loadAutomations() {
    try {
      // Use JSON API instead of SQL
      const automations = await database.getAutomations(true); // Get enabled only

      for (const auto of automations) {
        try {
          // Parse trigger and action if they're strings
          const trigger = typeof auto.trigger === 'string' ? JSON.parse(auto.trigger) : auto.trigger;
          const action = typeof auto.action === 'string' ? JSON.parse(auto.action) : auto.action;

          // Recreate automation based on type
          if (trigger.type === 'schedule') {
            this.createScheduleAutomation(auto.id, auto.name, trigger, action);
          } else if (trigger.type === 'webhook') {
            this.createWebhookAutomation(auto.id, auto.name, trigger, action);
          } else if (trigger.type === 'email') {
            this.createEmailAutomation(auto.id, auto.name, trigger, action);
          }

          this.automations.set(auto.id, { id: auto.id, name: auto.name, trigger, action });
          logger.info(`Loaded automation: ${auto.name}`);
        } catch (error) {
          logger.error(`Failed to load automation ${auto.id}:`, error);
        }
      }
    } catch (error) {
      logger.error('Failed to load automations:', error.message);
    }
  }

  createScheduleAutomation(id, name, trigger, action) {
    scheduler.scheduleJob(id, trigger.cron, async () => {
      await this.executeAction(action);
    });
  }

  createWebhookAutomation(id, name, trigger, action) {
    webhookHandler.registerWebhook(id, async (data) => {
      await this.executeAction(action, data);
    }, trigger.secret);
  }

  createEmailAutomation(id, name, trigger, action) {
    emailTriggers.registerTrigger(id, trigger.pattern, async (email) => {
      await this.executeAction(action, email);
    });
  }

  async executeAction(action, data = null) {
    try {
      logger.info(`Executing action: ${action.type}`);
      
      // Execute based on action type
      if (action.type === 'log') {
        logger.info(`Automation action: ${action.message}`);
      } else if (action.type === 'email') {
        await emailTriggers.sendEmail(action.to, action.subject, action.text);
      } else if (action.type === 'custom') {
        // Execute custom function
        if (typeof action.handler === 'function') {
          await action.handler(data);
        }
      }
    } catch (error) {
      logger.error('Action execution failed:', error);
    }
  }

  async createAutomation(name, trigger, action) {
    try {
      // Save to database using JSON API
      const automation = await database.saveAutomation({
        name,
        trigger,
        action
      });

      const id = automation.id;

      // Create runtime automation
      if (trigger.type === 'schedule') {
        this.createScheduleAutomation(id, name, trigger, action);
      } else if (trigger.type === 'webhook') {
        this.createWebhookAutomation(id, name, trigger, action);
      } else if (trigger.type === 'email') {
        this.createEmailAutomation(id, name, trigger, action);
      }

      this.automations.set(id, { id, name, trigger, action });
      logger.info(`Created automation: ${name} (ID: ${id})`);
      
      return id;
    } catch (error) {
      logger.error('Failed to create automation:', error);
      throw error;
    }
  }

  async deleteAutomation(id) {
    try {
      const automation = this.automations.get(id);
      if (!automation) return false;

      // Remove from runtime
      if (automation.trigger.type === 'schedule') {
        scheduler.removeJob(id);
      } else if (automation.trigger.type === 'webhook') {
        webhookHandler.unregisterWebhook(id);
      } else if (automation.trigger.type === 'email') {
        emailTriggers.unregisterTrigger(id);
      }

      // Remove from database using JSON API
      await database.deleteAutomation(id);

      this.automations.delete(id);
      logger.info(`Deleted automation: ${id}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to delete automation:', error);
      return false;
    }
  }

  async enableAutomation(id) {
    await database.updateAutomation(id, { enabled: true });
    logger.info(`Enabled automation: ${id}`);
  }

  async disableAutomation(id) {
    await database.updateAutomation(id, { enabled: false });
    logger.info(`Disabled automation: ${id}`);
  }

  listAutomations() {
    return Array.from(this.automations.values());
  }
}

export default new AutomationManager();
