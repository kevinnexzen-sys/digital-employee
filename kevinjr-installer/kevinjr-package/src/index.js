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
    
    // Check if core modules exist (they will be created in Phase 2)
    const coreEnginePath = path.join(__dirname, 'core', 'engine.js');
    
    if (!await fs.pathExists(coreEnginePath)) {
      console.log('⚠️  Core engine not yet implemented.');
      console.log('📋 Current Status: Phase 1 Complete - Foundation Ready!');
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   • Phase 2: Core Engine & Configuration System');
      console.log('   • Phase 3: LLM Integration Module');
      console.log('   • Phase 4: Security & Credential Management');
      console.log('');
      console.log('💡 Run "npm run setup" to continue with Phase 2 setup.');
      console.log('');
      console.log('🔗 Documentation: docs/architecture.md');
      console.log('📦 Dependencies ready for installation');
      console.log('');
      console.log('✨ KevinJr foundation is ready for development!');
      return;
    }
    
    // If core engine exists, load it
    const KevinJrEngine = require('./core/engine');
    const engine = new KevinJrEngine();
    
    console.log('🎯 Initializing KevinJr engine...');
    await engine.initialize();
    
    console.log('🎉 KevinJr is ready! Your digital companion is online.');
    console.log('💙 How can I help you today?');
    
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
