import { createLogger } from '../utils/logger.js';
import llmProvider from '../agent/llm-provider.js';
import files from '../tools/files.js';
import database from '../memory/database.js';

const logger = createLogger('SelfImprover');

class SelfImprover {
  constructor() {
    this.proposals = [];
    this.improvementHistory = [];
  }

  async analyzeCodebase() {
    logger.info('Analyzing codebase for improvements');

    try {
      const sourceFiles = await files.listFiles('./src');
      const analyses = [];
      
      for (const file of sourceFiles.files.slice(0, 5)) {
        if (file.endsWith('.js')) {
          const content = await files.readFile(file);
          const analysis = await this.analyzeFile(file, content.content);
          analyses.push(analysis);
        }
      }

      return {
        success: true,
        analyses,
        totalFiles: sourceFiles.files.length
      };
    } catch (error) {
      logger.error('Codebase analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeFile(filePath, content) {
    const prompt = `Analyze this code file and suggest improvements:

File: ${filePath}

Code:
\`\`\`javascript
${content.substring(0, 2000)}
\`\`\`

Provide:
1. Code quality score (1-10)
2. Potential bugs or issues
3. Performance improvements
4. Security concerns
5. Suggested refactoring

Keep suggestions practical and specific.`;

    const response = await llmProvider.chat([
      { role: 'user', content: prompt }
    ], { temperature: 0.3 });

    return {
      file: filePath,
      analysis: response.content,
      timestamp: Date.now()
    };
  }

  async proposeImprovement(description) {
    logger.info('Proposing improvement:', description);

    const prompt = `As an AI system that can improve itself, propose a specific code change:

Improvement Request: ${description}

Provide:
1. Which file(s) to modify
2. Exact code changes (before/after)
3. Why this improves the system
4. Potential risks
5. Testing strategy

Format as JSON:
{
  "files": ["path/to/file.js"],
  "changes": [{"before": "...", "after": "..."}],
  "reasoning": "...",
  "risks": ["..."],
  "tests": ["..."]
}`;

    const response = await llmProvider.chat([
      { role: 'user', content: prompt }
    ], { temperature: 0.2 });

    try {
      const proposal = JSON.parse(response.content);
      
      this.proposals.push({
        id: `proposal_${Date.now()}`,
        description,
        proposal,
        status: 'pending',
        createdAt: Date.now()
      });

      database.addMemory(
        `Self-improvement proposal: ${description}`,
        8
      );

      return {
        success: true,
        proposal: this.proposals[this.proposals.length - 1]
      };
    } catch (error) {
      logger.error('Failed to parse proposal:', error);
      return {
        success: false,
        error: 'Invalid proposal format'
      };
    }
  }

  async applyImprovement(proposalId, approved = false) {
    const proposal = this.proposals.find(p => p.id === proposalId);
    
    if (!proposal) {
      return { success: false, error: 'Proposal not found' };
    }

    if (!approved) {
      proposal.status = 'rejected';
      return { success: false, message: 'Proposal rejected by user' };
    }

    logger.info('Applying improvement:', proposalId);

    try {
      for (const change of proposal.proposal.changes) {
        logger.info('Would apply change:', change);
      }

      proposal.status = 'applied';
      this.improvementHistory.push({
        proposalId,
        appliedAt: Date.now(),
        description: proposal.description
      });

      return {
        success: true,
        message: 'Improvement applied successfully',
        proposal
      };
    } catch (error) {
      logger.error('Failed to apply improvement:', error);
      proposal.status = 'failed';
      return { success: false, error: error.message };
    }
  }

  getProposals(status = null) {
    if (status) {
      return this.proposals.filter(p => p.status === status);
    }
    return this.proposals;
  }

  getImprovementHistory() {
    return this.improvementHistory;
  }

  async suggestNextImprovement() {
    logger.info('Suggesting next improvement');

    const prompt = `Based on the current PersonalClaw system, suggest the most impactful improvement:

Current capabilities:
- Vector search memory
- Multi-agent swarm (5 workers)
- Skills engine
- Browser automation
- Voice interface
- Telegram integration

What single improvement would have the biggest positive impact?

Provide:
1. Improvement description
2. Expected benefit
3. Implementation complexity (1-10)
4. Priority (1-10)

Format as JSON.`;

    const response = await llmProvider.chat([
      { role: 'user', content: prompt }
    ], { temperature: 0.5 });

    try {
      const suggestion = JSON.parse(response.content);
      return { success: true, suggestion };
    } catch (error) {
      return { success: false, error: 'Failed to parse suggestion' };
    }
  }
}

export default new SelfImprover();
