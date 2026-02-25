#!/usr/bin/env node

/**
 * KevinJr Setup Script
 * Handles initial setup and phase progression
 */

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔧 KevinJr Setup Wizard');
  console.log('========================');
  console.log('');
  
  try {
    // Check current phase
    const configPath = path.join(__dirname, '../config/app.json');
    let config = {};
    
    if (await fs.pathExists(configPath)) {
      config = await fs.readJson(configPath);
    }
    
    console.log('📋 Current Status: Phase 1 Complete');
    console.log('🎯 Ready to proceed to Phase 2: Core Engine & Configuration System');
    console.log('');
    
    const proceed = await question('Would you like to continue with Phase 2 setup? (y/n): ');
    
    if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
      console.log('👋 Setup cancelled. Run this script again when ready!');
      rl.close();
      return;
    }
    
    console.log('');
    console.log('🚀 Phase 2 Setup Instructions:');
    console.log('================================');
    console.log('');
    console.log('1. 📦 Install dependencies:');
    console.log('   npm install');
    console.log('');
    console.log('2. 🔑 Set up environment variables:');
    console.log('   Create a .env file with your API keys:');
    console.log('   - OPENAI_API_KEY=your_openai_key');
    console.log('   - ANTHROPIC_API_KEY=your_anthropic_key');
    console.log('');
    console.log('3. 🏗️ Core engine files will be created in Phase 2:');
    console.log('   - src/core/engine.js');
    console.log('   - src/core/config-manager.js');
    console.log('   - src/core/module-loader.js');
    console.log('   - src/core/event-system.js');
    console.log('');
    console.log('4. 🔒 Security system will be initialized');
    console.log('');
    
    // Create .env template
    const envTemplate = `# KevinJr Environment Configuration
# Copy this file to .env and fill in your actual API keys

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# Anthropic Configuration  
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key_here
JWT_SECRET=your_jwt_secret_here

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
PORT=3000

# Module Configuration
MODULES_ENABLED=llm,file-manager
MODULES_DISABLED=

# Browser Automation (for future phases)
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Email Configuration (for future phases)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
`;
    
    await fs.writeFile(path.join(__dirname, '../.env.example'), envTemplate);
    console.log('✅ Created .env.example file');
    
    // Update config to mark Phase 1 as complete
    config.phases = {
      phase1: {
        completed: true,
        completedAt: new Date().toISOString(),
        description: 'Project Foundation & Architecture Setup'
      }
    };
    
    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log('✅ Updated configuration');
    
    console.log('');
    console.log('🎉 Phase 1 setup complete!');
    console.log('');
    console.log('📋 Next Steps:');
    console.log('1. Run: npm install');
    console.log('2. Copy .env.example to .env and add your API keys');
    console.log('3. Ready for Phase 2 development!');
    console.log('');
    console.log('💡 You can now run "npm start" to see the current status');
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
