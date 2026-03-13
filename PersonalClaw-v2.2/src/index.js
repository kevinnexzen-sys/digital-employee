#!/usr/bin/env node

import { createLogger } from './utils/logger.js';
import config from './utils/config.js';
import financialBlocker from './security/financial-blocker.js';
import llmProvider from './agent/llm-provider.js';
import agentExecutor from './agent/executor.js';
import telegram from './channels/telegram.js';
import screenWatcher from './screen-watcher/watcher.js';
import browser from './tools/browser.js';
import files from './tools/files.js';
import database from './memory/database.js';
import voiceInterface from './voice/voice-interface.js';
import email from './integrations/email.js';
import calendar from './integrations/calendar.js';
import automationManager from './automation/automation-manager.js';

const logger = createLogger('Main');

class PersonalClaw {
  constructor() {
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('🦞 Starting PersonalClaw...');
      logger.info(`   Version: 1.0.0`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info('');

      await this.initializeComponents();

      this.isRunning = true;
      logger.info('✅ PersonalClaw started successfully!');
      logger.info('');
      logger.info('📊 Status:');
      logger.info(`   Gateway: http://${config.host}:${config.port}`);
      logger.info(`   Financial Blocker: ACTIVE`);
      logger.info(`   Screen Watcher: ${config.screenWatch.enabled ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`   Telegram: ${config.telegram.botToken ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
      logger.info(`   Voice Interface: READY`);
      logger.info(`   Browser Automation: READY`);
      logger.info(`   Memory Database: READY`);
      logger.info(`   Automation System: READY`);
      logger.info('');
      logger.info('Press Ctrl+C to stop');

    } catch (error) {
      logger.error('Failed to start PersonalClaw:', error);
      process.exit(1);
    }
  }

  async initializeComponents() {
    // Financial blocker (already initialized)
    logger.info('✓ Financial Blocker initialized');

    // LLM Provider (already initialized)
    logger.info('✓ LLM Provider initialized');

    // Agent Executor (already initialized)
    logger.info('✓ Agent Executor initialized');

    // Telegram (already initialized)
    if (config.telegram.botToken) {
      logger.info('✓ Telegram bot initialized');
    }

    // Screen watcher
    if (config.screenWatch.enabled) {
      await screenWatcher.start();
      logger.info('✓ Screen Watcher started');
    }

    // Browser automation (lazy init)
    logger.info('✓ Browser Automation ready');

    // File operations (already initialized)
    logger.info('✓ File Operations ready');

    // Memory database
    await database.initialize();
    logger.info('✓ Memory Database initialized');

    // Automation system
    await automationManager.initialize();
    logger.info('✓ Automation System initialized');

    // Voice interface
    await voiceInterface.initialize();
    logger.info('✓ Voice Interface initialized');

    // Email integration
    await email.initialize();
    logger.info('✓ Email Integration initialized');

    // Calendar integration
    await calendar.initialize();
    logger.info('✓ Calendar Integration initialized');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping PersonalClaw...');

    await screenWatcher.stop();
    telegram.stop();
    await browser.close();
    database.close();
    voiceInterface.stopListening();

    this.isRunning = false;
    logger.info('PersonalClaw stopped');
  }
}

const personalClaw = new PersonalClaw();
personalClaw.start();

process.on('SIGINT', async () => {
  logger.info('');
  logger.info('Received SIGINT, shutting down...');
  await personalClaw.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down...');
  await personalClaw.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default PersonalClaw;
