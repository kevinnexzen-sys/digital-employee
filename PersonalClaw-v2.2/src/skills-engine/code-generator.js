import llmProvider from '../agent/llm-provider.js';
import { createLogger } from '../utils/logger.js';
import fs from 'fs-extra';
import path from 'path';

const logger = createLogger('CodeGenerator');

class CodeGenerator {
  constructor() {
    this.skillsDir = './skills';
  }

  async generateSkill(request, searchResults) {
    try {
      logger.info(`Generating skill for: ${request}`);

      // Build context from search results
      const context = this.buildContext(searchResults);

      // Generate code using LLM
      const code = await this.generateCode(request, context);

      // Extract metadata
      const metadata = this.extractMetadata(code);

      // Validate code
      await this.validateCode(code.code, code.language);

      return {
        success: true,
        code: code.code,
        language: code.language,
        metadata,
        dependencies: code.dependencies || []
      };
    } catch (error) {
      logger.error('Code generation failed:', error);
      throw error;
    }
  }

  buildContext(searchResults) {
    let context = 'Based on web search results:\n\n';
    
    searchResults.results.forEach((result, i) => {
      context += `[${i + 1}] ${result.title}\n`;
      context += `${result.content}\n`;
      context += `Source: ${result.url}\n\n`;
    });

    return context;
  }

  async generateCode(request, context) {
    const prompt = `You are a code generation expert. Generate PRODUCTION-READY, EXECUTABLE code based on this request.

REQUEST: ${request}

CONTEXT FROM WEB SEARCH:
${context}

REQUIREMENTS:
1. Generate REAL, WORKING code - no simulations or placeholders
2. Include proper error handling
3. Add comprehensive comments
4. Include all necessary imports
5. Make it immediately executable
6. Add parameter validation
7. Include usage examples in comments

OUTPUT FORMAT (JSON):
{
  "language": "python" or "javascript" or "bash",
  "code": "actual executable code here",
  "dependencies": ["list", "of", "required", "packages"],
  "description": "what this skill does",
  "usage": "how to use it",
  "parameters": [{"name": "param1", "type": "string", "required": true}]
}

Generate the code now:`;

    const response = await llmProvider.chat(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3 }
    );

    // Parse JSON response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse code generation response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  extractMetadata(codeData) {
    return {
      description: codeData.description,
      usage: codeData.usage,
      parameters: codeData.parameters || [],
      language: codeData.language,
      createdAt: new Date().toISOString(),
      version: 1
    };
  }

  async validateCode(code, language) {
    // Basic validation - check for dangerous operations
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /eval\(/,
      /exec\(/,
      /system\(/,
      /os\.system/,
      /subprocess\.call.*shell=True/
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`Dangerous operation detected: ${pattern}`);
      }
    }

    logger.info('Code validation passed');
    return true;
  }

  async customizeSkill(skillName, instructions, currentCode) {
    try {
      logger.info(`Customizing skill: ${skillName}`);

      const prompt = `You are modifying existing code based on user instructions.

CURRENT CODE:
${currentCode}

USER INSTRUCTIONS:
${instructions}

REQUIREMENTS:
1. Modify the code to implement the requested changes
2. Maintain all existing functionality unless explicitly asked to remove
3. Keep error handling and comments
4. Ensure the modified code is still production-ready
5. Update dependencies if needed

OUTPUT FORMAT (JSON):
{
  "code": "modified executable code",
  "dependencies": ["updated", "list"],
  "changes": "description of what was changed"
}

Generate the modified code now:`;

      const response = await llmProvider.chat(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3 }
      );

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse customization response');
      }

      const result = JSON.parse(jsonMatch[0]);

      await this.validateCode(result.code, 'python'); // Assume Python for now

      return {
        success: true,
        code: result.code,
        dependencies: result.dependencies,
        changes: result.changes
      };
    } catch (error) {
      logger.error('Skill customization failed:', error);
      throw error;
    }
  }
}

export default new CodeGenerator();
