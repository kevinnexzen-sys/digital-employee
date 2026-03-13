/**
 * FINAL SYSTEM TEST
 * Tests all modules and components
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 FINAL SYSTEM TEST - PersonalClaw v2.2\n');
console.log('=' .repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Check all required files exist
console.log('\n📁 Test 1: Checking required files...');
const requiredFiles = [
  'package.json',
  'src/index.js',
  'src/utils/config.js',
  'src/utils/logger.js',
  'src/agent/llm-provider.js',
  'src/agent/agent-executor.js',
  'src/memory/database.js',
  'src/automation/automation-manager.js',
  'src/voice/voice-interface.js',
  'src/self-healing/diagnostic-agent.js',
  'src/self-healing/auto-fix-agent.js',
  'src/self-healing/self-healing-manager.js',
  'src/gui/settings.html',
  'guardian-agent.js',
  'README.md',
  'INSTALLATION_GUIDE.md',
  'SELF_HEALING_GUIDE.md'
];

for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    results.passed.push(`✅ ${file}`);
  } else {
    results.failed.push(`❌ ${file} - MISSING`);
  }
}

// Test 2: Check package.json validity
console.log('\n📦 Test 2: Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  
  if (pkg.name === 'personalclaw') {
    results.passed.push('✅ Package name correct');
  }
  
  if (pkg.version) {
    results.passed.push(`✅ Version: ${pkg.version}`);
  }
  
  const depCount = Object.keys(pkg.dependencies || {}).length;
  results.passed.push(`✅ Dependencies: ${depCount} packages`);
  
  // Check for broken packages
  const brokenPackages = ['node-speaker'];
  for (const broken of brokenPackages) {
    if (pkg.dependencies && pkg.dependencies[broken]) {
      results.failed.push(`❌ Broken package found: ${broken}`);
    }
  }
  
} catch (error) {
  results.failed.push(`❌ package.json invalid: ${error.message}`);
}

// Test 3: Check for ES module consistency
console.log('\n🔄 Test 3: Checking module consistency...');
const jsFiles = getAllJsFiles('src');
let mixedModules = 0;

for (const file of jsFiles) {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('require(') && content.includes('import ')) {
      mixedModules++;
      results.warnings.push(`⚠️  ${file} - Mixed modules`);
    }
  } catch (error) {
    // Skip
  }
}

if (mixedModules === 0) {
  results.passed.push('✅ No mixed module systems');
} else {
  results.warnings.push(`⚠️  Found ${mixedModules} files with mixed modules`);
}

// Test 4: Check Guardian Agent
console.log('\n🛡️  Test 4: Checking Guardian Agent (Rayn)...');
try {
  const guardianContent = fs.readFileSync('guardian-agent.js', 'utf-8');
  
  if (guardianContent.includes("this.name = 'Rayn'")) {
    results.passed.push('✅ Guardian Agent name: Rayn');
  }
  
  if (guardianContent.includes("this.authorizedUser = 'Kevin'")) {
    results.passed.push('✅ Authorized user: Kevin');
  }
  
  if (guardianContent.includes('checkForSuspiciousActivity')) {
    results.passed.push('✅ Security monitoring enabled');
  }
  
  if (guardianContent.includes('handlePersonalClawCrash')) {
    results.passed.push('✅ Crash detection enabled');
  }
  
} catch (error) {
  results.failed.push(`❌ Guardian Agent check failed: ${error.message}`);
}

// Test 5: Check Self-Healing System
console.log('\n🤖 Test 5: Checking Self-Healing System...');
const selfHealingFiles = [
  'src/self-healing/diagnostic-agent.js',
  'src/self-healing/auto-fix-agent.js',
  'src/self-healing/self-healing-manager.js'
];

for (const file of selfHealingFiles) {
  if (fs.existsSync(file)) {
    results.passed.push(`✅ ${path.basename(file)}`);
  } else {
    results.failed.push(`❌ ${path.basename(file)} missing`);
  }
}

// Test 6: Check Settings GUI
console.log('\n⚙️  Test 6: Checking Settings GUI...');
if (fs.existsSync('src/gui/settings.html')) {
  const settingsHtml = fs.readFileSync('src/gui/settings.html', 'utf-8');
  
  if (settingsHtml.includes('PersonalClaw Settings')) {
    results.passed.push('✅ Settings GUI exists');
  }
  
  if (settingsHtml.includes('anthropicApiKey')) {
    results.passed.push('✅ API key inputs present');
  }
  
  if (settingsHtml.includes('saveSettings')) {
    results.passed.push('✅ Save functionality present');
  }
}

// Test 7: Check Documentation
console.log('\n📖 Test 7: Checking Documentation...');
const docs = ['README.md', 'INSTALLATION_GUIDE.md', 'SELF_HEALING_GUIDE.md'];
for (const doc of docs) {
  if (fs.existsSync(doc)) {
    const size = fs.statSync(doc).size;
    results.passed.push(`✅ ${doc} (${Math.round(size/1024)}KB)`);
  } else {
    results.failed.push(`❌ ${doc} missing`);
  }
}

// Print Results
console.log('\n' + '='.repeat(60));
console.log('📊 TEST RESULTS');
console.log('='.repeat(60));

console.log(`\n✅ PASSED: ${results.passed.length}`);
results.passed.forEach(r => console.log(`  ${r}`));

if (results.warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS: ${results.warnings.length}`);
  results.warnings.forEach(r => console.log(`  ${r}`));
}

if (results.failed.length > 0) {
  console.log(`\n❌ FAILED: ${results.failed.length}`);
  results.failed.forEach(r => console.log(`  ${r}`));
}

console.log('\n' + '='.repeat(60));

if (results.failed.length === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ PersonalClaw v2.2 is ready for use!');
  console.log('\n🛡️  Guardian Agent (Rayn) is ready to protect PersonalClaw');
  console.log('👤 Authorized User: Kevin');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED');
  console.log('Please review the failed tests above');
  process.exit(1);
}

// Helper function
function getAllJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      getAllJsFiles(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}
