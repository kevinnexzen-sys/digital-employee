import nodemailer from 'nodemailer';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Email');

class EmailIntegration {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Email Integration...');

      // Check if email credentials are configured
      const emailHost = process.env.EMAIL_HOST;
      const emailPort = process.env.EMAIL_PORT;
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;

      if (!emailHost || !emailUser || !emailPassword) {
        logger.warn('Email credentials not configured - email sending disabled');
        logger.warn('Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env to enable');
        this.isInitialized = true;
        return;
      }

      // Create nodemailer transporter
      this.transporter = nodemailer.createTransport({
        host: emailHost,
        port: parseInt(emailPort) || 587,
        secure: parseInt(emailPort) === 465, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });

      // Verify connection
      await this.transporter.verify();
      
      this.isInitialized = true;
      logger.info('Email Integration initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Email Integration:', error.message);
      logger.warn('Email sending will be disabled');
      this.isInitialized = true; // Mark as initialized to prevent retry loops
    }
  }

  async sendEmail(to, subject, body, options = {}) {
    await this.ensureInitialized();

    if (!this.transporter) {
      logger.warn('Email transporter not configured - skipping email send');
      return {
        success: false,
        error: 'Email not configured',
        to,
        subject
      };
    }

    try {
      logger.info(`Sending email to: ${to}`);

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: to,
        subject: subject,
        text: options.text || body,
        html: options.html || body
      };

      // Add attachments if provided
      if (options.attachments) {
        mailOptions.attachments = options.attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      logger.info(`Email sent successfully: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        to,
        subject
      };
    } catch (error) {
      logger.error('Failed to send email:', error.message);
      return {
        success: false,
        error: error.message,
        to,
        subject
      };
    }
  }

  async sendHtmlEmail(to, subject, htmlContent, textContent = null) {
    return this.sendEmail(to, subject, htmlContent, {
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '') // Strip HTML for text version
    });
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default new EmailIntegration();
