/**
 * KevinJr Multi-AI Validator
 * Cross-provider consensus validation system
 */

const winston = require('winston');

class MultiAIValidator {
  constructor(llmModule, config = {}) {
    this.llmModule = llmModule;
    this.config = config;
    this.logger = null;
    
    // Validation categories and weights
    this.validationCategories = {
      'code-quality': {
        weight: 0.25,
        criteria: ['readability', 'maintainability', 'complexity', 'documentation']
      },
      'security': {
        weight: 0.30,
        criteria: ['input-validation', 'authentication', 'authorization', 'data-protection']
      },
      'performance': {
        weight: 0.25,
        criteria: ['efficiency', 'scalability', 'memory-usage', 'optimization']
      },
      'best-practices': {
        weight: 0.20,
        criteria: ['conventions', 'error-handling', 'testing', 'structure']
      }
    };
    
    // Provider specializations
    this.providerSpecializations = {
      'openai': ['code-quality', 'best-practices', 'documentation'],
      'anthropic': ['security', 'logic-analysis', 'edge-cases'],
      'groq': ['performance', 'optimization', 'efficiency'],
      'cohere': ['readability', 'maintainability', 'structure'],
      'huggingface': ['code-patterns', 'language-specific', 'frameworks'],
      'together': ['scalability', 'architecture', 'design-patterns'],
      'replicate': ['creative-solutions', 'alternative-approaches', 'innovation']
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('🧠 Multi-AI Validator initializing...');
    this.logger.info('✅ Multi-AI Validator ready');
    return true;
  }

  /**
   * Validate code using multiple AI providers with consensus
   */
  async consensusValidation(code, language, options = {}) {
    const {
      providers = [],
      consensus = 'majority',
      standards = {},
      detailed = true
    } = options;
    
    this.logger.info(`🧠 Starting consensus validation with ${providers.length || 'all'} providers...`);
    
    try {
      // Get available providers
      const availableProviders = this._getAvailableProviders(providers);
      
      if (availableProviders.length < 2) {
        this.logger.warn('⚠️ Need at least 2 providers for consensus validation');
        return await this.validateCode(code, language, options);
      }
      
      // Run validation across multiple providers
      const validationResults = await this._runMultiProviderValidation(
        code, 
        language, 
        availableProviders,
        standards
      );
      
      // Calculate consensus
      const consensusResult = this._calculateConsensus(validationResults, consensus);
      
      // Generate detailed report
      const report = this._generateConsensusReport(validationResults, consensusResult, detailed);
      
      return {
        success: true,
        consensusType: consensus,
        providersUsed: availableProviders,
        consensusScore: consensusResult.overallScore,
        agreement: consensusResult.agreement,
        results: validationResults,
        consensus: consensusResult,
        report: report,
        recommendations: this._generateRecommendations(consensusResult)
      };
      
    } catch (error) {
      this.logger.error('💥 Consensus validation failed:', error);
      return {
        success: false,
        error: error.message,
        fallback: 'Attempting single-provider validation...'
      };
    }
  }

  /**
   * Validate code using single or multiple providers
   */
  async validateCode(code, language, options = {}) {
    const { rules = [], strict = false, standards = {} } = options;
    
    this.logger.info(`🔍 Validating ${language} code...`);
    
    try {
      // Use provider router for intelligent provider selection
      if (this.llmModule.providerRouter) {
        const result = await this.llmModule.providerRouter.execute('code-review', {
          code,
          language,
          rules,
          standards
        });
        
        return this._processValidationResult(result, language, standards);
      }
      
      // Fallback to direct provider usage
      const provider = this.llmModule.providers.values().next().value;
      if (!provider) {
        throw new Error('No AI providers available for validation');
      }
      
      const validationPrompt = this._buildValidationPrompt(code, language, rules, standards);
      const response = await provider.generateResponse([
        { role: 'system', content: 'You are an expert code reviewer and quality assurance specialist.' },
        { role: 'user', content: validationPrompt }
      ]);
      
      return this._parseValidationResponse(response.content, language, standards);
      
    } catch (error) {
      this.logger.error('💥 Code validation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Specialized validation for specific aspects
   */
  async validateAspect(code, language, aspect, options = {}) {
    const { depth = 'standard', context = {} } = options;
    
    this.logger.info(`🎯 Validating ${aspect} aspect for ${language} code...`);
    
    try {
      // Select best provider for this aspect
      const bestProvider = this._selectProviderForAspect(aspect);
      
      if (!bestProvider) {
        throw new Error(`No suitable provider found for ${aspect} validation`);
      }
      
      const aspectPrompt = this._buildAspectPrompt(code, language, aspect, depth, context);
      const response = await bestProvider.generateResponse([
        { role: 'system', content: `You are a specialist in ${aspect} analysis for ${language} code.` },
        { role: 'user', content: aspectPrompt }
      ]);
      
      return this._parseAspectResponse(response.content, aspect);
      
    } catch (error) {
      this.logger.error(`💥 ${aspect} validation failed:`, error);
      return {
        success: false,
        aspect,
        error: error.message
      };
    }
  }

  async healthCheck() {
    return {
      healthy: true,
      validator: 'multi-ai',
      availableProviders: this._getAvailableProviders().length,
      validationCategories: Object.keys(this.validationCategories),
      providerSpecializations: this.providerSpecializations
    };
  }

  async cleanup() {
    this.logger.info('🧹 Multi-AI Validator cleanup...');
    this.logger.info('✅ Multi-AI Validator cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [MultiAIValidator] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _getAvailableProviders(requestedProviders = []) {
    if (!this.llmModule || !this.llmModule.providers) {
      return [];
    }
    
    const available = Array.from(this.llmModule.providers.keys());
    
    if (requestedProviders.length > 0) {
      return requestedProviders.filter(p => available.includes(p));
    }
    
    return available;
  }

  async _runMultiProviderValidation(code, language, providers, standards) {
    const results = {};
    
    for (const providerName of providers) {
      try {
        this.logger.info(`🔍 Running validation with ${providerName}...`);
        
        const provider = this.llmModule.providers.get(providerName);
        if (!provider) continue;
        
        const validationPrompt = this._buildValidationPrompt(code, language, [], standards);
        const response = await provider.generateResponse([
          { role: 'system', content: 'You are an expert code reviewer. Provide detailed analysis.' },
          { role: 'user', content: validationPrompt }
        ]);
        
        results[providerName] = this._parseValidationResponse(response.content, language, standards);
        results[providerName].provider = providerName;
        results[providerName].responseTime = response.duration || 0;
        
      } catch (error) {
        this.logger.warn(`⚠️ Provider ${providerName} validation failed:`, error.message);
        results[providerName] = {
          success: false,
          provider: providerName,
          error: error.message
        };
      }
    }
    
    return results;
  }

  _calculateConsensus(results, consensusType) {
    const successfulResults = Object.values(results).filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        overallScore: 0,
        agreement: 0,
        consensus: 'failed',
        issues: ['All providers failed validation']
      };
    }
    
    const scores = successfulResults.map(r => r.overallScore || 0);
    const issues = successfulResults.flatMap(r => r.issues || []);
    
    let consensusScore;
    let agreement;
    
    switch (consensusType) {
      case 'unanimous':
        consensusScore = Math.min(...scores);
        agreement = this._calculateAgreement(scores, 'unanimous');
        break;
        
      case 'majority':
        consensusScore = this._calculateMajorityScore(scores);
        agreement = this._calculateAgreement(scores, 'majority');
        break;
        
      case 'average':
        consensusScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        agreement = this._calculateAgreement(scores, 'average');
        break;
        
      case 'optimistic':
        consensusScore = Math.max(...scores);
        agreement = this._calculateAgreement(scores, 'optimistic');
        break;
        
      default:
        consensusScore = this._calculateMajorityScore(scores);
        agreement = this._calculateAgreement(scores, 'majority');
    }
    
    return {
      overallScore: Math.round(consensusScore),
      agreement: Math.round(agreement),
      consensus: consensusType,
      providersAgreed: successfulResults.length,
      totalProviders: Object.keys(results).length,
      scoreRange: {
        min: Math.min(...scores),
        max: Math.max(...scores),
        variance: this._calculateVariance(scores)
      },
      commonIssues: this._findCommonIssues(issues),
      conflictingOpinions: this._findConflictingOpinions(successfulResults)
    };
  }

  _calculateMajorityScore(scores) {
    // Group scores into ranges and find the majority
    const ranges = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 70 && s < 90).length,
      fair: scores.filter(s => s >= 50 && s < 70).length,
      poor: scores.filter(s => s < 50).length
    };
    
    const maxRange = Object.entries(ranges).reduce((a, b) => ranges[a[0]] > ranges[b[0]] ? a : b);
    
    // Return average of scores in the majority range
    switch (maxRange[0]) {
      case 'excellent':
        return scores.filter(s => s >= 90).reduce((sum, s) => sum + s, 0) / ranges.excellent;
      case 'good':
        return scores.filter(s => s >= 70 && s < 90).reduce((sum, s) => sum + s, 0) / ranges.good;
      case 'fair':
        return scores.filter(s => s >= 50 && s < 70).reduce((sum, s) => sum + s, 0) / ranges.fair;
      default:
        return scores.filter(s => s < 50).reduce((sum, s) => sum + s, 0) / ranges.poor;
    }
  }

  _calculateAgreement(scores, type) {
    if (scores.length <= 1) return 100;
    
    const variance = this._calculateVariance(scores);
    const maxVariance = 2500; // Max possible variance for 0-100 scale
    
    return Math.max(0, 100 - (variance / maxVariance) * 100);
  }

  _calculateVariance(scores) {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  }

  _findCommonIssues(allIssues) {
    const issueCounts = {};
    
    allIssues.forEach(issue => {
      const key = issue.type || issue.category || 'general';
      issueCounts[key] = (issueCounts[key] || 0) + 1;
    });
    
    // Return issues mentioned by multiple providers
    return Object.entries(issueCounts)
      .filter(([_, count]) => count > 1)
      .map(([issue, count]) => ({ issue, mentionedBy: count }));
  }

  _findConflictingOpinions(results) {
    const conflicts = [];
    
    // Compare security assessments
    const securityScores = results.map(r => r.security?.score || 0);
    if (this._calculateVariance(securityScores) > 400) { // High variance
      conflicts.push({
        aspect: 'security',
        variance: this._calculateVariance(securityScores),
        scores: securityScores
      });
    }
    
    // Compare performance assessments
    const performanceScores = results.map(r => r.performance?.score || 0);
    if (this._calculateVariance(performanceScores) > 400) {
      conflicts.push({
        aspect: 'performance',
        variance: this._calculateVariance(performanceScores),
        scores: performanceScores
      });
    }
    
    return conflicts;
  }

  _selectProviderForAspect(aspect) {
    const availableProviders = this._getAvailableProviders();
    
    // Find providers specialized in this aspect
    for (const [provider, specializations] of Object.entries(this.providerSpecializations)) {
      if (specializations.includes(aspect) && availableProviders.includes(provider)) {
        return this.llmModule.providers.get(provider);
      }
    }
    
    // Fallback to any available provider
    return availableProviders.length > 0 ? 
      this.llmModule.providers.get(availableProviders[0]) : null;
  }

  _buildValidationPrompt(code, language, rules, standards) {
    return `Please perform a comprehensive code review of the following ${language} code:

\`\`\`${language}
${code}
\`\`\`

Analyze the code for:
1. **Code Quality** (25%): Readability, maintainability, complexity, documentation
2. **Security** (30%): Input validation, authentication, authorization, data protection
3. **Performance** (25%): Efficiency, scalability, memory usage, optimization opportunities
4. **Best Practices** (20%): Language conventions, error handling, testing, structure

${rules.length > 0 ? `\nSpecific rules to check: ${rules.join(', ')}` : ''}

${Object.keys(standards).length > 0 ? `\nQuality standards to meet: ${JSON.stringify(standards, null, 2)}` : ''}

Please provide:
1. Overall score (0-100)
2. Category scores for each area
3. Specific issues found with severity levels
4. Recommendations for improvement
5. Code examples for fixes where applicable

Format your response as structured analysis with clear sections.`;
  }

  _buildAspectPrompt(code, language, aspect, depth, context) {
    const aspectPrompts = {
      'security': `Perform a thorough security analysis of this ${language} code. Look for vulnerabilities, security anti-patterns, and potential attack vectors.`,
      'performance': `Analyze the performance characteristics of this ${language} code. Identify bottlenecks, inefficiencies, and optimization opportunities.`,
      'accessibility': `Review this code for accessibility compliance. Check for WCAG guidelines adherence and inclusive design patterns.`,
      'maintainability': `Evaluate the maintainability of this ${language} code. Assess code structure, documentation, and long-term sustainability.`
    };
    
    const basePrompt = aspectPrompts[aspect] || `Analyze the ${aspect} aspects of this ${language} code.`;
    
    return `${basePrompt}

\`\`\`${language}
${code}
\`\`\`

Analysis depth: ${depth}
${Object.keys(context).length > 0 ? `\nContext: ${JSON.stringify(context, null, 2)}` : ''}

Provide detailed findings with:
1. Score (0-100) for this aspect
2. Specific issues identified
3. Risk assessment
4. Actionable recommendations
5. Code examples for improvements`;
  }

  _parseValidationResponse(response, language, standards) {
    try {
      // Extract scores and issues from AI response
      // This is a simplified parser - in production would use more sophisticated NLP
      
      const overallScoreMatch = response.match(/overall score[:\s]*(\d+)/i);
      const overallScore = overallScoreMatch ? parseInt(overallScoreMatch[1]) : 75;
      
      const issues = this._extractIssues(response);
      const recommendations = this._extractRecommendations(response);
      
      return {
        success: true,
        overallScore,
        language,
        security: this._extractCategoryScore(response, 'security'),
        performance: this._extractCategoryScore(response, 'performance'),
        codeQuality: this._extractCategoryScore(response, 'code quality'),
        bestPractices: this._extractCategoryScore(response, 'best practices'),
        issues,
        recommendations,
        rawResponse: response
      };
      
    } catch (error) {
      this.logger.error('💥 Failed to parse validation response:', error);
      return {
        success: false,
        error: 'Failed to parse validation response',
        rawResponse: response
      };
    }
  }

  _parseAspectResponse(response, aspect) {
    try {
      const scoreMatch = response.match(/score[:\s]*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
      
      const issues = this._extractIssues(response);
      const recommendations = this._extractRecommendations(response);
      
      return {
        success: true,
        aspect,
        score,
        issues,
        recommendations,
        rawResponse: response
      };
      
    } catch (error) {
      return {
        success: false,
        aspect,
        error: 'Failed to parse aspect response',
        rawResponse: response
      };
    }
  }

  _extractCategoryScore(response, category) {
    const regex = new RegExp(`${category}[:\\s]*(?:score[:\\s]*)?(\\d+)`, 'i');
    const match = response.match(regex);
    return match ? parseInt(match[1]) : 75;
  }

  _extractIssues(response) {
    const issues = [];
    
    // Look for common issue patterns
    const issuePatterns = [
      /(?:issue|problem|vulnerability|concern)[:\s]*(.+?)(?:\n|$)/gi,
      /(?:warning|error|critical)[:\s]*(.+?)(?:\n|$)/gi,
      /(?:fix|improve|address)[:\s]*(.+?)(?:\n|$)/gi
    ];
    
    issuePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        issues.push({
          type: 'general',
          message: match[1].trim(),
          severity: this._determineSeverity(match[1])
        });
      }
    });
    
    return issues.slice(0, 10); // Limit to top 10 issues
  }

  _extractRecommendations(response) {
    const recommendations = [];
    
    const recPatterns = [
      /(?:recommend|suggest|should)[:\s]*(.+?)(?:\n|$)/gi,
      /(?:consider|try|use)[:\s]*(.+?)(?:\n|$)/gi
    ];
    
    recPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        recommendations.push({
          message: match[1].trim(),
          priority: this._determinePriority(match[1])
        });
      }
    });
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  _determineSeverity(text) {
    const criticalWords = ['critical', 'severe', 'dangerous', 'vulnerability'];
    const highWords = ['important', 'significant', 'major'];
    const mediumWords = ['moderate', 'minor', 'consider'];
    
    const lowerText = text.toLowerCase();
    
    if (criticalWords.some(word => lowerText.includes(word))) return 'critical';
    if (highWords.some(word => lowerText.includes(word))) return 'high';
    if (mediumWords.some(word => lowerText.includes(word))) return 'medium';
    return 'low';
  }

  _determinePriority(text) {
    const highWords = ['must', 'should', 'critical', 'important'];
    const mediumWords = ['consider', 'recommend', 'suggest'];
    
    const lowerText = text.toLowerCase();
    
    if (highWords.some(word => lowerText.includes(word))) return 'high';
    if (mediumWords.some(word => lowerText.includes(word))) return 'medium';
    return 'low';
  }

  _generateConsensusReport(results, consensus, detailed) {
    const report = {
      summary: `Consensus validation completed with ${consensus.agreement}% agreement among ${consensus.providersAgreed} providers.`,
      overallScore: consensus.overallScore,
      grade: this._calculateGrade(consensus.overallScore),
      agreement: consensus.agreement,
      providers: Object.keys(results).filter(p => results[p].success)
    };
    
    if (detailed) {
      report.detailed = {
        providerResults: results,
        scoreVariance: consensus.scoreRange.variance,
        commonIssues: consensus.commonIssues,
        conflicts: consensus.conflictingOpinions
      };
    }
    
    return report;
  }

  _generateRecommendations(consensus) {
    const recommendations = [];
    
    if (consensus.agreement < 70) {
      recommendations.push({
        type: 'consensus',
        priority: 'high',
        message: 'Low agreement between AI providers suggests complex issues that need human review'
      });
    }
    
    if (consensus.overallScore < 70) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Code quality below acceptable threshold - requires significant improvements'
      });
    }
    
    consensus.commonIssues.forEach(issue => {
      recommendations.push({
        type: 'common-issue',
        priority: 'medium',
        message: `Multiple providers identified: ${issue.issue}`
      });
    });
    
    return recommendations;
  }

  _calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    if (score >= 50) return 'D';
    return 'F';
  }

  _processValidationResult(result, language, standards) {
    // Process result from provider router
    return {
      success: true,
      overallScore: result.score || 75,
      language,
      provider: result.provider,
      duration: result.duration,
      routing: result.routing,
      issues: result.issues || [],
      recommendations: result.recommendations || []
    };
  }
}

module.exports = MultiAIValidator;

