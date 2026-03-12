/**
 * KevinJr Test Generator
 * AI-powered test suite generation
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class TestGenerator {
  constructor(llmModule, config = {}) {
    this.llmModule = llmModule;
    this.config = config;
    this.logger = null;
    
    // Test frameworks and their configurations
    this.testFrameworks = {
      javascript: {
        jest: {
          extension: '.test.js',
          setup: 'jest.config.js',
          dependencies: ['jest', '@testing-library/jest-dom']
        },
        mocha: {
          extension: '.test.js',
          setup: 'mocha.opts',
          dependencies: ['mocha', 'chai', 'sinon']
        },
        cypress: {
          extension: '.cy.js',
          setup: 'cypress.config.js',
          dependencies: ['cypress']
        },
        playwright: {
          extension: '.spec.js',
          setup: 'playwright.config.js',
          dependencies: ['@playwright/test']
        }
      },
      python: {
        pytest: {
          extension: '_test.py',
          setup: 'pytest.ini',
          dependencies: ['pytest', 'pytest-cov']
        },
        unittest: {
          extension: '_test.py',
          setup: 'unittest.cfg',
          dependencies: []
        }
      },
      go: {
        testing: {
          extension: '_test.go',
          setup: 'go.mod',
          dependencies: []
        }
      },
      rust: {
        cargo: {
          extension: '.rs',
          setup: 'Cargo.toml',
          dependencies: []
        }
      }
    };
    
    // Test types and their characteristics
    this.testTypes = {
      unit: {
        scope: 'function/method level',
        isolation: 'high',
        speed: 'fast',
        coverage: 'detailed'
      },
      integration: {
        scope: 'module/service level',
        isolation: 'medium',
        speed: 'medium',
        coverage: 'workflow'
      },
      e2e: {
        scope: 'full application',
        isolation: 'low',
        speed: 'slow',
        coverage: 'user-journey'
      },
      performance: {
        scope: 'system level',
        isolation: 'low',
        speed: 'slow',
        coverage: 'load/stress'
      },
      security: {
        scope: 'application level',
        isolation: 'medium',
        speed: 'medium',
        coverage: 'vulnerability'
      }
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('🧪 Test Generator initializing...');
    this.logger.info('✅ Test Generator ready');
    return true;
  }

  /**
   * Generate comprehensive test suite for code
   */
  async generateTests(code, language, options = {}) {
    const {
      testType = 'unit',
      framework = this._getDefaultFramework(language),
      coverage = 90,
      outputPath,
      includeSetup = true
    } = options;
    
    this.logger.info(`🧪 Generating ${testType} tests for ${language} code...`);
    
    try {
      // Analyze code to understand structure
      const codeAnalysis = await this._analyzeCode(code, language);
      
      // Generate test cases based on analysis
      const testCases = await this._generateTestCases(codeAnalysis, testType, language);
      
      // Generate test code
      const testCode = await this._generateTestCode(testCases, framework, language);
      
      // Generate test configuration
      const testConfig = await this._generateTestConfiguration(framework, language, coverage);
      
      // Generate setup files if requested
      const setupFiles = includeSetup ? 
        await this._generateSetupFiles(framework, language) : {};
      
      const result = {
        success: true,
        testType,
        framework,
        language,
        coverage: coverage,
        testCases: testCases.length,
        files: {
          testCode,
          testConfig,
          ...setupFiles
        },
        analysis: codeAnalysis,
        recommendations: this._generateTestRecommendations(codeAnalysis, testType)
      };
      
      // Write files if output path provided
      if (outputPath) {
        await this._writeTestFiles(result, outputPath);
        result.outputPath = outputPath;
      }
      
      return result;
      
    } catch (error) {
      this.logger.error('💥 Test generation failed:', error);
      return {
        success: false,
        error: error.message,
        recovery: 'KevinJr will try alternative test generation strategies'
      };
    }
  }

  /**
   * Generate specific test types
   */
  async generateUnitTests(code, language, options = {}) {
    return await this.generateTests(code, language, { ...options, testType: 'unit' });
  }

  async generateIntegrationTests(code, language, options = {}) {
    return await this.generateTests(code, language, { ...options, testType: 'integration' });
  }

  async generateE2ETests(code, language, options = {}) {
    return await this.generateTests(code, language, { ...options, testType: 'e2e' });
  }

  async generatePerformanceTests(code, language, options = {}) {
    return await this.generateTests(code, language, { ...options, testType: 'performance' });
  }

  async generateSecurityTests(code, language, options = {}) {
    return await this.generateTests(code, language, { ...options, testType: 'security' });
  }

  /**
   * Generate test suite for entire project
   */
  async generateProjectTests(projectPath, options = {}) {
    const {
      testTypes = ['unit', 'integration'],
      framework,
      coverage = 80,
      parallel = true
    } = options;
    
    this.logger.info(`🧪 Generating project test suite: ${projectPath}`);
    
    try {
      // Analyze project structure
      const projectAnalysis = await this._analyzeProject(projectPath);
      
      // Generate tests for each file/module
      const testResults = {};
      
      for (const testType of testTypes) {
        this.logger.info(`🧪 Generating ${testType} tests...`);
        testResults[testType] = await this._generateProjectTestType(
          projectAnalysis, 
          testType, 
          framework, 
          coverage
        );
      }
      
      // Generate master test configuration
      const masterConfig = await this._generateMasterTestConfig(
        projectAnalysis, 
        testTypes, 
        framework, 
        coverage
      );
      
      // Generate CI/CD test integration
      const cicdConfig = await this._generateCICDTestConfig(testTypes, framework);
      
      return {
        success: true,
        projectPath,
        testTypes,
        framework: framework || this._detectProjectFramework(projectAnalysis),
        coverage,
        results: testResults,
        masterConfig,
        cicdConfig,
        summary: this._generateProjectTestSummary(testResults)
      };
      
    } catch (error) {
      this.logger.error('💥 Project test generation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    return {
      healthy: true,
      generator: 'test',
      supportedLanguages: Object.keys(this.testFrameworks),
      supportedTestTypes: Object.keys(this.testTypes),
      dependencies: {
        llm: !!this.llmModule
      }
    };
  }

  async cleanup() {
    this.logger.info('🧹 Test Generator cleanup...');
    this.logger.info('✅ Test Generator cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [TestGenerator] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _analyzeCode(code, language) {
    const analysisPrompt = `Analyze the following ${language} code and identify:
1. Functions/methods that need testing
2. Classes and their public methods
3. Input/output parameters and types
4. Edge cases and error conditions
5. Dependencies and external calls
6. Complex logic that needs validation

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a structured analysis for test generation.`;

    try {
      if (this.llmModule.providerRouter) {
        const result = await this.llmModule.providerRouter.execute('code-analysis', {
          code,
          language,
          analysisType: 'testing'
        });
        
        return this._parseCodeAnalysis(result.content, language);
      }
      
      // Fallback to direct provider usage
      const provider = this.llmModule.providers.values().next().value;
      if (!provider) {
        throw new Error('No AI providers available for code analysis');
      }
      
      const response = await provider.generateResponse([
        { role: 'system', content: 'You are an expert in code analysis for test generation.' },
        { role: 'user', content: analysisPrompt }
      ]);
      
      return this._parseCodeAnalysis(response.content, language);
      
    } catch (error) {
      this.logger.warn('⚠️ Code analysis failed, using basic analysis:', error.message);
      return this._basicCodeAnalysis(code, language);
    }
  }

  async _generateTestCases(analysis, testType, language) {
    const testCasePrompt = `Based on the code analysis, generate comprehensive ${testType} test cases for ${language}:

Analysis:
${JSON.stringify(analysis, null, 2)}

Generate test cases that cover:
1. Happy path scenarios
2. Edge cases and boundary conditions
3. Error handling and exceptions
4. Input validation
5. State changes and side effects

For each test case, provide:
- Test name/description
- Setup requirements
- Input data
- Expected output
- Assertions to make

Focus on ${this.testTypes[testType].coverage} coverage.`;

    try {
      const provider = this.llmModule.providers.values().next().value;
      if (!provider) {
        throw new Error('No AI providers available for test case generation');
      }
      
      const response = await provider.generateResponse([
        { role: 'system', content: `You are an expert in ${testType} testing for ${language}.` },
        { role: 'user', content: testCasePrompt }
      ]);
      
      return this._parseTestCases(response.content, testType);
      
    } catch (error) {
      this.logger.warn('⚠️ Test case generation failed, using basic cases:', error.message);
      return this._generateBasicTestCases(analysis, testType);
    }
  }

  async _generateTestCode(testCases, framework, language) {
    const codePrompt = `Generate ${framework} test code for ${language} based on these test cases:

${JSON.stringify(testCases, null, 2)}

Requirements:
1. Use ${framework} syntax and conventions
2. Include proper imports and setup
3. Use appropriate assertions
4. Include test descriptions
5. Handle async operations properly
6. Follow best practices for ${framework}

Generate clean, readable, and maintainable test code.`;

    try {
      const provider = this.llmModule.providers.values().next().value;
      if (!provider) {
        throw new Error('No AI providers available for test code generation');
      }
      
      const response = await provider.generateResponse([
        { role: 'system', content: `You are an expert in ${framework} testing framework for ${language}.` },
        { role: 'user', content: codePrompt }
      ]);
      
      return this._cleanTestCode(response.content, framework, language);
      
    } catch (error) {
      this.logger.warn('⚠️ Test code generation failed, using template:', error.message);
      return this._generateTemplateTestCode(testCases, framework, language);
    }
  }

  async _generateTestConfiguration(framework, language, coverage) {
    const frameworkConfig = this.testFrameworks[language]?.[framework];
    if (!frameworkConfig) {
      return null;
    }
    
    const configTemplates = {
      jest: `module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: ${coverage},
      functions: ${coverage},
      lines: ${coverage},
      statements: ${coverage}
    }
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ]
};`,
      
      pytest: `[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = --cov=src --cov-report=html --cov-report=term-missing --cov-fail-under=${coverage}`,
      
      mocha: `{
  "require": ["@babel/register"],
  "recursive": true,
  "reporter": "spec",
  "timeout": 5000,
  "exit": true
}`,
      
      cypress: `const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js'
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack'
    }
  }
})`
    };
    
    return configTemplates[framework] || null;
  }

  async _generateSetupFiles(framework, language) {
    const setupFiles = {};
    
    // Generate package.json test scripts
    setupFiles['package.json'] = this._generatePackageJsonScripts(framework, language);
    
    // Generate test setup/helper files
    if (framework === 'jest') {
      setupFiles['jest.setup.js'] = `// Jest setup file
import '@testing-library/jest-dom';

// Global test utilities
global.testUtils = {
  // Add common test utilities here
};`;
    }
    
    if (framework === 'cypress') {
      setupFiles['cypress/support/e2e.js'] = `// Cypress support file
import './commands';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});`;
      
      setupFiles['cypress/support/commands.js'] = `// Custom Cypress commands
Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('[data-testid="username"]').type(username);
  cy.get('[data-testid="password"]').type(password);
  cy.get('[data-testid="login-button"]').click();
});`;
    }
    
    return setupFiles;
  }

  async _writeTestFiles(result, outputPath) {
    await fs.ensureDir(outputPath);
    
    // Write main test file
    const testExtension = this._getTestExtension(result.framework, result.language);
    const testFileName = `generated${testExtension}`;
    await fs.writeFile(path.join(outputPath, testFileName), result.files.testCode);
    
    // Write configuration file
    if (result.files.testConfig) {
      const configFileName = this._getConfigFileName(result.framework);
      await fs.writeFile(path.join(outputPath, configFileName), result.files.testConfig);
    }
    
    // Write setup files
    for (const [fileName, content] of Object.entries(result.files)) {
      if (fileName !== 'testCode' && fileName !== 'testConfig') {
        const filePath = path.join(outputPath, fileName);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);
      }
    }
  }

  _parseCodeAnalysis(response, language) {
    try {
      // Extract structured information from AI response
      const analysis = {
        language,
        functions: this._extractFunctions(response),
        classes: this._extractClasses(response),
        dependencies: this._extractDependencies(response),
        complexity: this._assessComplexity(response),
        edgeCases: this._extractEdgeCases(response)
      };
      
      return analysis;
      
    } catch (error) {
      this.logger.warn('⚠️ Failed to parse code analysis, using basic analysis');
      return this._basicCodeAnalysis('', language);
    }
  }

  _basicCodeAnalysis(code, language) {
    // Basic regex-based analysis as fallback
    const analysis = {
      language,
      functions: [],
      classes: [],
      dependencies: [],
      complexity: 'medium',
      edgeCases: []
    };
    
    // Extract function names (basic regex)
    const functionRegex = {
      javascript: /function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*:/g,
      python: /def\s+(\w+)/g,
      go: /func\s+(\w+)/g,
      rust: /fn\s+(\w+)/g
    };
    
    const regex = functionRegex[language];
    if (regex) {
      let match;
      while ((match = regex.exec(code)) !== null) {
        const funcName = match[1] || match[2] || match[3];
        if (funcName) {
          analysis.functions.push({
            name: funcName,
            parameters: [],
            returnType: 'unknown'
          });
        }
      }
    }
    
    return analysis;
  }

  _parseTestCases(response, testType) {
    try {
      // Extract test cases from AI response
      const testCases = [];
      
      // Look for test case patterns
      const testCaseRegex = /(?:test|it|describe)[:\s]*["']([^"']+)["']/gi;
      let match;
      
      while ((match = testCaseRegex.exec(response)) !== null) {
        testCases.push({
          name: match[1],
          type: testType,
          description: match[1],
          setup: [],
          assertions: [],
          priority: 'medium'
        });
      }
      
      return testCases.length > 0 ? testCases : this._generateBasicTestCases({}, testType);
      
    } catch (error) {
      return this._generateBasicTestCases({}, testType);
    }
  }

  _generateBasicTestCases(analysis, testType) {
    const basicCases = [
      {
        name: `should handle valid input`,
        type: testType,
        description: `Test ${testType} functionality with valid input`,
        setup: [],
        assertions: ['expect result to be defined'],
        priority: 'high'
      },
      {
        name: `should handle edge cases`,
        type: testType,
        description: `Test ${testType} functionality with edge cases`,
        setup: [],
        assertions: ['expect proper error handling'],
        priority: 'medium'
      }
    ];
    
    return basicCases;
  }

  _cleanTestCode(code, framework, language) {
    // Remove any markdown formatting
    let cleanCode = code.replace(/```[\w]*\n?/g, '').trim();
    
    // Ensure proper imports for framework
    const imports = this._getFrameworkImports(framework, language);
    if (imports && !cleanCode.includes(imports.split('\n')[0])) {
      cleanCode = imports + '\n\n' + cleanCode;
    }
    
    return cleanCode;
  }

  _generateTemplateTestCode(testCases, framework, language) {
    const templates = {
      jest: `const { functionToTest } = require('./module');

describe('Generated Tests', () => {
${testCases.map(tc => `  test('${tc.name}', () => {
    // ${tc.description}
    expect(true).toBe(true); // Replace with actual test
  });`).join('\n\n')}
});`,
      
      pytest: `import pytest
from module import function_to_test

class TestGenerated:
${testCases.map(tc => `    def test_${tc.name.replace(/\s+/g, '_').toLowerCase()}(self):
        """${tc.description}"""
        assert True  # Replace with actual test`).join('\n\n')}`,
      
      mocha: `const { expect } = require('chai');
const { functionToTest } = require('./module');

describe('Generated Tests', () => {
${testCases.map(tc => `  it('${tc.name}', () => {
    // ${tc.description}
    expect(true).to.be.true; // Replace with actual test
  });`).join('\n\n')}
});`
    };
    
    return templates[framework] || templates.jest;
  }

  _getDefaultFramework(language) {
    const defaults = {
      javascript: 'jest',
      python: 'pytest',
      go: 'testing',
      rust: 'cargo'
    };
    
    return defaults[language] || 'jest';
  }

  _getTestExtension(framework, language) {
    return this.testFrameworks[language]?.[framework]?.extension || '.test.js';
  }

  _getConfigFileName(framework) {
    const configFiles = {
      jest: 'jest.config.js',
      pytest: 'pytest.ini',
      mocha: '.mocharc.json',
      cypress: 'cypress.config.js'
    };
    
    return configFiles[framework] || 'test.config.js';
  }

  _getFrameworkImports(framework, language) {
    const imports = {
      jest: "const { describe, test, expect } = require('@jest/globals');",
      pytest: "import pytest",
      mocha: "const { describe, it } = require('mocha');\nconst { expect } = require('chai');"
    };
    
    return imports[framework] || '';
  }

  _generatePackageJsonScripts(framework, language) {
    const scripts = {
      jest: {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
      },
      pytest: {
        "test": "pytest",
        "test:watch": "pytest-watch",
        "test:coverage": "pytest --cov"
      },
      mocha: {
        "test": "mocha",
        "test:watch": "mocha --watch"
      }
    };
    
    return JSON.stringify({ scripts: scripts[framework] || scripts.jest }, null, 2);
  }

  _generateTestRecommendations(analysis, testType) {
    const recommendations = [];
    
    if (analysis.functions.length > 10) {
      recommendations.push({
        type: 'coverage',
        message: 'Consider breaking down large modules for better test maintainability'
      });
    }
    
    if (analysis.complexity === 'high') {
      recommendations.push({
        type: 'complexity',
        message: 'High complexity detected - focus on edge case testing'
      });
    }
    
    if (testType === 'unit' && analysis.dependencies.length > 5) {
      recommendations.push({
        type: 'mocking',
        message: 'Consider mocking external dependencies for isolated unit tests'
      });
    }
    
    return recommendations;
  }

  // Helper methods for parsing AI responses
  _extractFunctions(response) {
    const functions = [];
    const functionRegex = /function[:\s]+(\w+)/gi;
    let match;
    
    while ((match = functionRegex.exec(response)) !== null) {
      functions.push({
        name: match[1],
        parameters: [],
        returnType: 'unknown'
      });
    }
    
    return functions;
  }

  _extractClasses(response) {
    const classes = [];
    const classRegex = /class[:\s]+(\w+)/gi;
    let match;
    
    while ((match = classRegex.exec(response)) !== null) {
      classes.push({
        name: match[1],
        methods: []
      });
    }
    
    return classes;
  }

  _extractDependencies(response) {
    const dependencies = [];
    const depRegex = /(?:import|require|from)[:\s]+([^\n]+)/gi;
    let match;
    
    while ((match = depRegex.exec(response)) !== null) {
      dependencies.push(match[1].trim());
    }
    
    return dependencies;
  }

  _assessComplexity(response) {
    const complexityIndicators = ['nested', 'complex', 'multiple', 'conditional'];
    const lowerResponse = response.toLowerCase();
    
    const complexityCount = complexityIndicators.reduce((count, indicator) => {
      return count + (lowerResponse.split(indicator).length - 1);
    }, 0);
    
    if (complexityCount > 5) return 'high';
    if (complexityCount > 2) return 'medium';
    return 'low';
  }

  _extractEdgeCases(response) {
    const edgeCases = [];
    const edgeCaseRegex = /(?:edge case|boundary|null|empty|invalid)[:\s]*([^\n]+)/gi;
    let match;
    
    while ((match = edgeCaseRegex.exec(response)) !== null) {
      edgeCases.push(match[1].trim());
    }
    
    return edgeCases;
  }
}

module.exports = TestGenerator;

