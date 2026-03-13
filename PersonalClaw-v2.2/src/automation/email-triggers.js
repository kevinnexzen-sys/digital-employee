import { createLogger } from '../utils/logger.js';
import nodemailer from 'nodemailer';

const logger = createLogger('EmailTriggers');

class EmailTriggers {
  constructor() {
    this.transporter = null;
    this.triggers = new Map();
  }

  async initialize(config) {
    this.transporter = nodemailer.createTransport(config);
    await this.transporter.verify();
    logger.info('Email service initialized');
  }

  registerTrigger(id, pattern, callback) {
    this.triggers.set(id, { pattern, callback });
    logger.info(`Registered email trigger: ${id}`);
  }

  unregisterTrigger(id) {
    this.triggers.delete(id);
    logger.info(`Unregistered email trigger: ${id}`);
  }

  async processEmail(email) {
    for (const [id, trigger] of this.triggers) {
      const matches = this.matchesTrigger(email, trigger.pattern);
      if (matches) {
        try {
          await trigger.callback(email);
          logger.info(`Trigger ${id} executed for email: ${email.subject}`);
        } catch (error) {
          logger.error(`Trigger ${id} failed:`, error);
        }
      }
    }
  }

  matchesTrigger(email, pattern) {
    if (pattern.from && !email.from.includes(pattern.from)) return false;
    if (pattern.subject && !email.subject.includes(pattern.subject)) return false;
    if (pattern.keywords) {
      const text = email.text || email.html || '';
      const hasKeyword = pattern.keywords.some(kw => text.includes(kw));
      if (!hasKeyword) return false;
    }
    return true;
  }

  async sendEmail(to, subject, text, html = null) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const info = await this.transporter.sendMail({
      from: this.transporter.options.auth.user,
      to,
      subject,
      text,
      html
    });

    logger.info(`Email sent: ${info.messageId}`);
    return info;
  }

  listTriggers() {
    return Array.from(this.triggers.keys());
  }
}

export default new EmailTriggers();
