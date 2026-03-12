/**
 * KevinJr GitHub Integration Module
 * Automated repository management and CI/CD pipeline setup
 */

const winston = require('winston');
const { Octokit } = require('@octokit/rest');
const RepositoryManager = require('./repository-manager');
const CICDGenerator = require('./cicd-generator');

class GitHubModule {
  constructor(engine) {
    this.engine = engine;
    this.name = 'github';
    this.version = '1.0.0';
    this.logger = null;
    
    // GitHub API client
    this.octokit = null;
    this.repositoryManager = null;
    this.cicdGenerator = null;
    
    // Configuration
    this.config = {
      token: null,
      owner: null,
      defaultBranch: 'main',
      autoSetupCI: true,
      enableSecurity: true
    };
    
    this._setupLogger();
  }

  /**
   * Initialize the GitHub module
   */
  async initialize() {
    try {
      this.logger.info('🐙 GitHub module initializing...');
      
      // Get module configuration
      const config = this.engine.config.getModuleConfig('github');
      this.config = { ...this.config, ...config };
      
      // Get GitHub token
      this.config.token = this.engine.config.getSecret('github.token');
      if (!this.config.token) {
        this.logger.warn('⚠️ GitHub token not configured - some features will be limited');
        return true; // Allow graceful degradation
      }
      
      // Initialize Octokit
      this.octokit = new Octokit({
        auth: this.config.token,
        userAgent: 'KevinJr/1.0.0'
      });
      
      // Test GitHub connection
      await this._testConnection();
      
      // Initialize sub-modules
      this.repositoryManager = new RepositoryManager(this.octokit, this.config);
      await this.repositoryManager.initialize();
      
      this.cicdGenerator = new CICDGenerator(this.octokit, this.config);
      await this.cicdGenerator.initialize();
      
      this.logger.info('✅ GitHub module ready');
      return true;
      
    } catch (error) {
      this.logger.error('💥 GitHub module initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute GitHub commands
   */
  async execute(command, params = {}, context = {}) {
    try {
      switch (command) {
        case 'create-repo':
        case 'create-repository':
          return await this._handleRepositoryCreation(params, context);
          
        case 'setup-cicd':
        case 'setup-ci':
          return await this._handleCICDSetup(params, context);
          
        case 'create-branch':
          return await this._handleBranchCreation(params, context);
          
        case 'create-pr':
        case 'create-pull-request':
          return await this._handlePullRequestCreation(params, context);
          
        case 'setup-security':
          return await this._handleSecuritySetup(params, context);
          
        case 'generate-docs':
          return await this._handleDocumentationGeneration(params, context);
          
        case 'status':
          return this._getStatus();
          
        case 'repos':
        case 'repositories':
          return await this._listRepositories(params);
          
        default:
          return {
            success: false,
            error: `Unknown GitHub command: ${command}`,
            suggestions: [
              'create-repo - Create a new repository',
              'setup-cicd - Setup CI/CD pipeline',
              'create-branch - Create a new branch',
              'create-pr - Create a pull request',
              'setup-security - Setup security scanning'
            ]
          };
      }
      
    } catch (error) {
      this.logger.error(`💥 GitHub command failed: ${command}`, error);
      
      return {
        success: false,
        error: error.message,
        recovery: 'KevinJr never gives up! Try checking your GitHub token and permissions.',
        motto: 'Never says no - always finds a way!'
      };
    }
  }

  /**
   * Check if module can handle a command
   */
  canHandle(command) {
    const supportedCommands = [
      'create-repo', 'create-repository', 'setup-cicd', 'setup-ci',
      'create-branch', 'create-pr', 'create-pull-request', 'setup-security',
      'generate-docs', 'status', 'repos', 'repositories'
    ];
    
    return supportedCommands.includes(command) || 
           command.startsWith('github:') ||
           command.startsWith('repo:') ||
           command.startsWith('git:');
  }

  /**
   * Get module capabilities
   */
  getCapabilities() {
    return [
      'Repository creation and management',
      'Automated CI/CD pipeline setup',
      'Branch and pull request management',
      'Security scanning configuration',
      'Documentation generation',
      'Issue and project management',
      'Code review automation',
      'Dependency management'
    ];
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      healthy: true,
      authenticated: !!this.config.token,
      components: {}
    };
    
    try {
      if (this.octokit) {
        const { data: user } = await this.octokit.rest.users.getAuthenticated();
        health.user = user.login;
        health.rateLimit = await this._getRateLimit();
      }
      
      if (this.repositoryManager) {
        health.components.repositoryManager = await this.repositoryManager.healthCheck();
      }
      
      if (this.cicdGenerator) {
        health.components.cicdGenerator = await this.cicdGenerator.healthCheck();
      }
      
    } catch (error) {
      health.healthy = false;
      health.error = error.message;
    }
    
    return health;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.logger.info('🧹 GitHub module cleanup...');
    
    if (this.repositoryManager) {
      await this.repositoryManager.cleanup();
    }
    
    if (this.cicdGenerator) {
      await this.cicdGenerator.cleanup();
    }
    
    this.logger.info('✅ GitHub module cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [GitHub] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  async _testConnection() {
    try {
      const { data: user } = await this.octokit.rest.users.getAuthenticated();
      this.config.owner = user.login;
      this.logger.info(`🐙 Connected to GitHub as: ${user.login}`);
      return true;
    } catch (error) {
      throw new Error(`GitHub connection test failed: ${error.message}`);
    }
  }

  async _handleRepositoryCreation(params, context) {
    const {
      name,
      description,
      private: isPrivate = false,
      template,
      features = []
    } = params;
    
    if (!name) {
      return {
        success: false,
        error: 'Repository name is required'
      };
    }
    
    this.logger.info(`🐙 Creating repository: ${name}`);
    
    const result = await this.repositoryManager.createRepository({
      name,
      description,
      private: isPrivate,
      template,
      features
    });
    
    return result;
  }

  async _handleCICDSetup(params, context) {
    const {
      repository,
      framework = 'node',
      deployTarget = 'vercel',
      testFramework = 'jest',
      features = []
    } = params;
    
    if (!repository) {
      return {
        success: false,
        error: 'Repository name is required'
      };
    }
    
    this.logger.info(`🔄 Setting up CI/CD for: ${repository}`);
    
    const result = await this.cicdGenerator.setupCICD({
      repository,
      framework,
      deployTarget,
      testFramework,
      features
    });
    
    return result;
  }

  async _handleBranchCreation(params, context) {
    const { repository, branch, from = 'main' } = params;
    
    if (!repository || !branch) {
      return {
        success: false,
        error: 'Repository and branch name are required'
      };
    }
    
    this.logger.info(`🌿 Creating branch: ${branch} in ${repository}`);
    
    const result = await this.repositoryManager.createBranch({
      repository,
      branch,
      from
    });
    
    return result;
  }

  async _handlePullRequestCreation(params, context) {
    const {
      repository,
      title,
      body,
      head,
      base = 'main',
      draft = false
    } = params;
    
    if (!repository || !title || !head) {
      return {
        success: false,
        error: 'Repository, title, and head branch are required'
      };
    }
    
    this.logger.info(`📝 Creating pull request: ${title}`);
    
    const result = await this.repositoryManager.createPullRequest({
      repository,
      title,
      body,
      head,
      base,
      draft
    });
    
    return result;
  }

  async _handleSecuritySetup(params, context) {
    const { repository, features = ['dependabot', 'codeql', 'secrets'] } = params;
    
    if (!repository) {
      return {
        success: false,
        error: 'Repository name is required'
      };
    }
    
    this.logger.info(`🔒 Setting up security for: ${repository}`);
    
    const result = await this.repositoryManager.setupSecurity({
      repository,
      features
    });
    
    return result;
  }

  async _handleDocumentationGeneration(params, context) {
    const {
      repository,
      type = 'readme',
      framework,
      features = []
    } = params;
    
    if (!repository) {
      return {
        success: false,
        error: 'Repository name is required'
      };
    }
    
    this.logger.info(`📚 Generating documentation for: ${repository}`);
    
    const result = await this.repositoryManager.generateDocumentation({
      repository,
      type,
      framework,
      features
    });
    
    return result;
  }

  async _listRepositories(params) {
    const { type = 'owner', sort = 'updated', per_page = 30 } = params;
    
    try {
      const { data: repos } = await this.octokit.rest.repos.listForAuthenticatedUser({
        type,
        sort,
        per_page
      });
      
      return {
        success: true,
        repositories: repos.map(repo => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          url: repo.html_url,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          updatedAt: repo.updated_at
        })),
        total: repos.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async _getRateLimit() {
    try {
      const { data: rateLimit } = await this.octokit.rest.rateLimit.get();
      return {
        limit: rateLimit.rate.limit,
        remaining: rateLimit.rate.remaining,
        reset: new Date(rateLimit.rate.reset * 1000)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  _getStatus() {
    return {
      module: this.name,
      version: this.version,
      authenticated: !!this.config.token,
      owner: this.config.owner,
      components: {
        repositoryManager: !!this.repositoryManager,
        cicdGenerator: !!this.cicdGenerator
      }
    };
  }
}

module.exports = GitHubModule;

