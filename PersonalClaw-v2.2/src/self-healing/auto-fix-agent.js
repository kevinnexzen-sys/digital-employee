import { createLogger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('AutoFixAgent');

class AutoFixAgent {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
    this.fixHistory = [];
    this.pendingFixes = [];
  }

  /**
   * Analyze issue and search for solution online
   */
  async analyzeAndFindSolution(issue) {
    logger.info(`🔍 Analyzing issue: ${issue.type}`);

    try {
      // Build search query based on issue type
      const searchQuery = this.buildSearchQuery(issue);
      
      // Search for solution (using AI to search and analyze)
      const solution = await this.searchForSolution(searchQuery, issue);

      return {
        success: true,
        issue: issue,
        solution: solution,
        confidence: solution.confidence
      };
    } catch (error) {
      logger.error('Failed to find solution:', error);
      return {
        success: false,
        issue: issue,
        error: error.message
      };
    }
  }

  /**
   * Build search query based on issue type
   */
  buildSearchQuery(issue) {
    const queries = {
      'MISSING_DEPENDENCY': `npm install ${issue.package} fix missing dependency`,
      'MIXED_MODULES': `convert require to import ES modules Node.js`,
      'INVALID_CONFIG_PATH': `fix config path ${issue.configPath} Node.js`,
      'MODULE_IMPORT_ERROR': `fix import error ${issue.module} Node.js`,
      'MISSING_FILE': `restore missing file ${issue.file}`,
      'MISSING_CONFIG': `create .env file Node.js configuration`,
      'MISSING_API_KEY': `configure ${issue.key} API key`
    };

    return queries[issue.type] || `fix ${issue.type} Node.js`;
  }

  /**
   * Search for solution using AI
   */
  async searchForSolution(query, issue) {
    logger.info(`🌐 Searching for solution: ${query}`);

    // Use AI to analyze the issue and suggest a fix
    const prompt = `You are a code repair expert. Analyze this issue and provide a fix.

Issue Type: ${issue.type}
Severity: ${issue.severity}
Message: ${issue.message}
${issue.file ? `File: ${issue.file}` : ''}
${issue.error ? `Error: ${issue.error}` : ''}

Provide a JSON response with:
1. "diagnosis": Brief explanation of the problem
2. "solution": Step-by-step fix instructions
3. "code": Actual code fix (if applicable)
4. "command": Shell command to run (if applicable)
5. "confidence": Your confidence level (0-100)
6. "resources": URLs or documentation references

Format as valid JSON.`;

    try {
      const response = await this.llmProvider.chat([
        { role: 'user', content: prompt }
      ]);

      // Parse AI response
      const solutionText = response.content;
      let solution;

      try {
        // Try to extract JSON from response
        const jsonMatch = solutionText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          solution = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: create structured solution from text
          solution = {
            diagnosis: 'AI analysis completed',
            solution: solutionText,
            confidence: 70,
            resources: []
          };
        }
      } catch (parseError) {
        solution = {
          diagnosis: 'AI analysis completed',
          solution: solutionText,
          confidence: 70,
          resources: []
        };
      }

      return solution;
    } catch (error) {
      logger.error('AI solution search failed:', error);
      
      // Fallback to predefined solutions
      return this.getFallbackSolution(issue);
    }
  }

  /**
   * Get fallback solution for common issues
   */
  getFallbackSolution(issue) {
    const fallbacks = {
      'MISSING_DEPENDENCY': {
        diagnosis: 'NPM package is not installed',
        solution: `Run: npm install ${issue.package}`,
        command: `npm install ${issue.package}`,
        confidence: 90,
        resources: ['https://docs.npmjs.com/cli/install']
      },
      'MIXED_MODULES': {
        diagnosis: 'File mixes CommonJS and ES modules',
        solution: 'Convert all require() statements to import statements',
        code: 'Replace require() with import statements',
        confidence: 85,
        resources: ['https://nodejs.org/api/esm.html']
      },
      'MISSING_CONFIG': {
        diagnosis: '.env file is missing',
        solution: 'Create .env file with required configuration',
        command: 'Use Settings GUI to configure API keys',
        confidence: 95,
        resources: []
      }
    };

    return fallbacks[issue.type] || {
      diagnosis: 'Unknown issue type',
      solution: 'Manual intervention required',
      confidence: 30,
      resources: []
    };
  }

  /**
   * Apply fix with user permission
   */
  async applyFix(issue, solution, userApproved = false) {
    if (!userApproved) {
      logger.warn('Fix requires user approval');
      return {
        success: false,
        message: 'User approval required',
        requiresApproval: true
      };
    }

    logger.info(`🔧 Applying fix for: ${issue.type}`);

    try {
      let result;

      // Apply fix based on issue type
      switch (issue.type) {
        case 'MISSING_DEPENDENCY':
          result = await this.fixMissingDependency(issue, solution);
          break;

        case 'MIXED_MODULES':
          result = await this.fixMixedModules(issue, solution);
          break;

        case 'INVALID_CONFIG_PATH':
          result = await this.fixConfigPath(issue, solution);
          break;

        case 'MISSING_CONFIG':
          result = await this.fixMissingConfig(issue, solution);
          break;

        default:
          result = {
            success: false,
            message: 'No automatic fix available for this issue type'
          };
      }

      // Record fix in history
      if (result.success) {
        this.fixHistory.push({
          timestamp: new Date().toISOString(),
          issue: issue,
          solution: solution,
          result: result
        });
      }

      return result;
    } catch (error) {
      logger.error('Fix application failed:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Fix missing dependency
   */
  async fixMissingDependency(issue, solution) {
    try {
      logger.info(`📦 Installing ${issue.package}...`);
      
      const command = solution.command || `npm install ${issue.package}`;
      const { stdout, stderr } = await execAsync(command);

      logger.info(`✅ Installed ${issue.package}`);
      
      return {
        success: true,
        message: `Successfully installed ${issue.package}`,
        output: stdout
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to install ${issue.package}: ${error.message}`
      };
    }
  }

  /**
   * Fix mixed modules (require + import)
   */
  async fixMixedModules(issue, solution) {
    try {
      logger.info(`🔄 Converting require() to import in ${issue.file}...`);

      const content = fs.readFileSync(issue.file, 'utf-8');
      
      // Convert require() to import
      let fixed = content;
      
      // Pattern: const x = require('y')
      fixed = fixed.replace(
        /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
        "import $1 from '$2'"
      );
      
      // Pattern: require('y').method()
      fixed = fixed.replace(
        /require\(['"]fs['"]\)\./g,
        'fs.'
      );

      // Add fs import if needed
      if (fixed.includes('fs.') && !fixed.includes("import fs from 'fs'")) {
        fixed = "import fs from 'fs';\n" + fixed;
      }

      // Backup original file
      fs.writeFileSync(`${issue.file}.backup`, content);
      
      // Write fixed file
      fs.writeFileSync(issue.file, fixed);

      logger.info(`✅ Fixed ${issue.file}`);

      return {
        success: true,
        message: `Converted require() to import in ${issue.file}`,
        backup: `${issue.file}.backup`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fix ${issue.file}: ${error.message}`
      };
    }
  }

  /**
   * Fix invalid config path
   */
  async fixConfigPath(issue, solution) {
    try {
      logger.info(`🔧 Fixing config path in ${issue.file}...`);

      const content = fs.readFileSync(issue.file, 'utf-8');
      
      // Map old paths to new paths
      const pathMappings = {
        'config.anthropic.apiKey': 'config.llm.anthropic.apiKey',
        'config.openai.apiKey': 'config.llm.openai.apiKey',
        'config.elevenlabs.apiKey': 'config.voice.elevenlabs.apiKey'
      };

      let fixed = content;
      for (const [oldPath, newPath] of Object.entries(pathMappings)) {
        fixed = fixed.replace(new RegExp(oldPath.replace(/\./g, '\\.'), 'g'), newPath);
      }

      // Backup original
      fs.writeFileSync(`${issue.file}.backup`, content);
      
      // Write fixed file
      fs.writeFileSync(issue.file, fixed);

      logger.info(`✅ Fixed config paths in ${issue.file}`);

      return {
        success: true,
        message: `Updated config paths in ${issue.file}`,
        backup: `${issue.file}.backup`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fix config paths: ${error.message}`
      };
    }
  }

  /**
   * Fix missing config
   */
  async fixMissingConfig(issue, solution) {
    return {
      success: false,
      message: 'Please use Settings GUI to configure API keys',
      requiresManualAction: true
    };
  }

  /**
   * Get fix history
   */
  getFixHistory() {
    return this.fixHistory;
  }

  /**
   * Generate fix report
   */
  generateFixReport() {
    return {
      timestamp: new Date().toISOString(),
      totalFixes: this.fixHistory.length,
      successfulFixes: this.fixHistory.filter(f => f.result.success).length,
      failedFixes: this.fixHistory.filter(f => !f.result.success).length,
      fixes: this.fixHistory
    };
  }
}

export default AutoFixAgent;
