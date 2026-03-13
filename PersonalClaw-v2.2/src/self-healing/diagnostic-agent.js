import { createLogger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('DiagnosticAgent');

class DiagnosticAgent {
  constructor() {
    this.issues = [];
    this.fixHistory = [];
    this.isRunning = false;
  }

  /**
   * Run comprehensive diagnostics on PersonalClaw
   */
  async runDiagnostics() {
    logger.info('🔍 Starting diagnostic scan...');
    this.issues = [];

    try {
      // Check 1: Verify all required files exist
      await this.checkRequiredFiles();

      // Check 2: Verify dependencies are installed
      await this.checkDependencies();

      // Check 3: Check for syntax errors
      await this.checkSyntaxErrors();

      // Check 4: Verify configuration
      await this.checkConfiguration();

      // Check 5: Test core modules
      await this.testCoreModules();

      // Check 6: Verify API connectivity
      await this.checkApiConnectivity();

      logger.info(`✅ Diagnostic scan complete. Found ${this.issues.length} issues.`);
      return {
        success: true,
        issuesFound: this.issues.length,
        issues: this.issues
      };
    } catch (error) {
      logger.error('Diagnostic scan failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if all required files exist
   */
  async checkRequiredFiles() {
    const requiredFiles = [
      'src/index.js',
      'src/utils/config.js',
      'src/utils/logger.js',
      'src/agent/llm-provider.js',
      'src/memory/database.js',
      'package.json'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.issues.push({
          type: 'MISSING_FILE',
          severity: 'HIGH',
          file: file,
          message: `Required file missing: ${file}`,
          fixable: true,
          suggestedFix: 'Download missing file from repository'
        });
      }
    }
  }

  /**
   * Check if dependencies are properly installed
   */
  async checkDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      for (const [pkg, version] of Object.entries(dependencies)) {
        const pkgPath = path.join('node_modules', pkg);
        if (!fs.existsSync(pkgPath)) {
          this.issues.push({
            type: 'MISSING_DEPENDENCY',
            severity: 'HIGH',
            package: pkg,
            version: version,
            message: `Missing dependency: ${pkg}@${version}`,
            fixable: true,
            suggestedFix: `npm install ${pkg}@${version}`
          });
        }
      }
    } catch (error) {
      this.issues.push({
        type: 'PACKAGE_JSON_ERROR',
        severity: 'CRITICAL',
        message: 'Cannot read package.json',
        fixable: false
      });
    }
  }

  /**
   * Check for syntax errors in JavaScript files
   */
  async checkSyntaxErrors() {
    const jsFiles = this.getAllJsFiles('src');

    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for common syntax issues
        if (content.includes('require(') && content.includes('import ')) {
          this.issues.push({
            type: 'MIXED_MODULES',
            severity: 'MEDIUM',
            file: file,
            message: `File mixes CommonJS (require) and ES modules (import)`,
            fixable: true,
            suggestedFix: 'Convert all require() to import statements'
          });
        }

        // Check for undefined config paths
        const configMatches = content.match(/config\.\w+\.\w+/g);
        if (configMatches) {
          for (const match of configMatches) {
            if (!this.isValidConfigPath(match)) {
              this.issues.push({
                type: 'INVALID_CONFIG_PATH',
                severity: 'MEDIUM',
                file: file,
                configPath: match,
                message: `Potentially invalid config path: ${match}`,
                fixable: true,
                suggestedFix: 'Update config path to match config.js structure'
              });
            }
          }
        }
      } catch (error) {
        this.issues.push({
          type: 'FILE_READ_ERROR',
          severity: 'MEDIUM',
          file: file,
          message: `Cannot read file: ${error.message}`,
          fixable: false
        });
      }
    }
  }

  /**
   * Check configuration validity
   */
  async checkConfiguration() {
    try {
      const envExists = fs.existsSync('.env');
      
      if (!envExists) {
        this.issues.push({
          type: 'MISSING_CONFIG',
          severity: 'HIGH',
          message: '.env file not found',
          fixable: true,
          suggestedFix: 'Create .env file with required API keys'
        });
      } else {
        const envContent = fs.readFileSync('.env', 'utf-8');
        
        // Check for required keys
        const requiredKeys = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'];
        for (const key of requiredKeys) {
          if (!envContent.includes(key) || envContent.includes(`${key}=`)) {
            this.issues.push({
              type: 'MISSING_API_KEY',
              severity: 'HIGH',
              key: key,
              message: `API key not configured: ${key}`,
              fixable: true,
              suggestedFix: 'Add API key in Settings GUI'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Configuration check failed:', error);
    }
  }

  /**
   * Test core modules can be imported
   */
  async testCoreModules() {
    const coreModules = [
      'src/utils/config.js',
      'src/utils/logger.js',
      'src/agent/llm-provider.js'
    ];

    for (const module of coreModules) {
      try {
        await import(`../../${module}`);
      } catch (error) {
        this.issues.push({
          type: 'MODULE_IMPORT_ERROR',
          severity: 'HIGH',
          module: module,
          message: `Cannot import module: ${error.message}`,
          error: error.stack,
          fixable: true,
          suggestedFix: 'Fix syntax or dependency issues in module'
        });
      }
    }
  }

  /**
   * Check API connectivity
   */
  async checkApiConnectivity() {
    // This will be checked when user adds API keys
    logger.info('API connectivity will be tested when keys are configured');
  }

  /**
   * Get all JavaScript files recursively
   */
  getAllJsFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && file !== 'node_modules') {
        this.getAllJsFiles(filePath, fileList);
      } else if (file.endsWith('.js')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  }

  /**
   * Check if config path is valid
   */
  isValidConfigPath(configPath) {
    const validPaths = [
      'config.llm.anthropic',
      'config.llm.openai',
      'config.llm.provider',
      'config.search.provider',
      'config.search.apiKey',
      'config.telegram.botToken',
      'config.telegram.chatId',
      'config.voice.elevenlabs',
      'config.voice.whisper',
      'config.server.port',
      'config.server.host',
      'config.database.path',
      'config.browser.headless',
      'config.browser.timeout',
      'config.screenWatch.enabled',
      'config.screenWatch.interval',
      'config.logging.level',
      'config.logging.file',
      'config.memory.maxContextMessages',
      'config.security.enableFinancialBlocker'
    ];

    return validPaths.some(valid => configPath.startsWith(valid));
  }

  /**
   * Get issues summary
   */
  getIssuesSummary() {
    const summary = {
      total: this.issues.length,
      critical: this.issues.filter(i => i.severity === 'CRITICAL').length,
      high: this.issues.filter(i => i.severity === 'HIGH').length,
      medium: this.issues.filter(i => i.severity === 'MEDIUM').length,
      fixable: this.issues.filter(i => i.fixable).length
    };

    return summary;
  }

  /**
   * Get detailed report
   */
  getDetailedReport() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getIssuesSummary(),
      issues: this.issues,
      fixHistory: this.fixHistory
    };
  }
}

export default DiagnosticAgent;
