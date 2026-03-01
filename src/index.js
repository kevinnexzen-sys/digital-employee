#!/usr/bin/env node

/**
 * KevinJr - Advanced Task Automation Agent
 * Main entry point for the application
 */

const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    ██╗  ██╗███████╗██╗   ██╗██╗███╗   ██╗     ██╗██████╗    ║
║    ██║ ██╔╝██╔════╝██║   ██║██║████╗  ██║     ██║██╔══██╗   ║
║    █████╔╝ █████╗  ██║   ██║██║██╔██╗ ██║     ██║██████╔╝   ║
║    ██╔═██╗ ██╔══╝  ╚██╗ ██╔╝██║██║╚██╗██║██   ██║██╔══██╗   ║
║    ██║  ██╗███████╗ ╚████╔╝ ██║██║ ╚████║╚█████╔╝██║  ██║   ║
║    ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝╚═╝  ╚═══╝ ╚════╝ ╚═╝  ╚═╝   ║
║                                                              ║
║           Advanced Task Automation Agent v1.0.0             ║
║              "Never says no - always finds a way"           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

console.log('\x1b[36m%s\x1b[0m', banner);

async function main() {
  try {
    console.log('🚀 Starting KevinJr...');
    
    // Check if this is the first run
    const configPath = path.join(__dirname, '../config');
    const isFirstRun = !await fs.pathExists(path.join(configPath, 'app.json'));
    
    if (isFirstRun) {
      console.log('👋 Welcome! This appears to be your first time running KevinJr.');
      console.log('🔧 Setting up initial configuration...');
      
      // Create config directory if it doesn't exist
      await fs.ensureDir(configPath);
      
      // Create basic config file
      const defaultConfig = {
        version: '1.0.0',
        firstRun: new Date().toISOString(),
        modules: {
          enabled: [],
          disabled: []
        },
        security: {
          encryptionEnabled: true,
          auditLogging: true
        },
        ui: {
          theme: 'dark',
          notifications: true
        }
      };
      
      await fs.writeJson(path.join(configPath, 'app.json'), defaultConfig, { spaces: 2 });
      console.log('✅ Initial configuration created!');
    }
    
    console.log('🔍 Checking system requirements...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      console.error('❌ Node.js 18 or higher is required. Current version:', nodeVersion);
      process.exit(1);
    }
    
    console.log('✅ Node.js version check passed:', nodeVersion);
    
    // Check if core modules exist
    const coreEnginePath = path.join(__dirname, 'core', 'kevinjr-engine.js');
    
    if (!await fs.pathExists(coreEnginePath)) {
      console.log('⚠️  Core engine not found.');
      console.log('📋 Please ensure all KevinJr modules are properly installed.');
      return;
    }
    
    // Load the actual KevinJr engine
    const KevinJrEngine = require('./core/kevinjr-engine');
    const BrowserAutomation = require('./modules/browser-automation');
    const EmailManagement = require('./modules/email-management');
    const VoiceInterface = require('./modules/voice-interface');
    const constitutionalLaws = require('./core/constitutional-laws');
    
    // Verify constitutional laws first
    console.log('🔒 Verifying Constitutional Laws...');
    constitutionalLaws.verifyIntegrity();
    console.log('✅ Constitutional Laws verified and protected');
    
    // Initialize all systems
    const engine = new KevinJrEngine();
    const browserAutomation = new BrowserAutomation();
    const emailManagement = new EmailManagement();
    const voiceInterface = new VoiceInterface();
    
    console.log('🎯 Initializing KevinJr engine...');
    await engine.initialize();
    
    console.log('🌐 Initializing Browser Automation...');
    await browserAutomation.initialize();
    
    console.log('🎤 Initializing Voice Interface...');
    await voiceInterface.initialize();
    
    console.log('🎉 KevinJr is ready! Your AI companion is online.');
    console.log('💙 I\'m Kevin, your loyal AI assistant. I\'m here to help you 24/7!');
    console.log('🌐 All systems operational - Constitutional Laws enforced');
    console.log('📱 WhatsApp integration ready for commands');
    console.log('🔊 Voice interface active in multiple languages');
    console.log('🌐 Browser automation ready for approved sites');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down KevinJr gracefully...');
      await engine.shutdown();
      console.log('👋 KevinJr has been shut down. See you soon!');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\\n🛑 Received termination signal...');
      await engine.shutdown();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('💥 Failed to start KevinJr:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
main().catch(console.error);
