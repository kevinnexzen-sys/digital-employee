import searchProvider from './search-provider.js';
import codeGenerator from './code-generator.js';
import skillManager from './skill-manager.js';
import { createLogger } from '../utils/logger.js';
import telegram from '../channels/telegram.js';

const logger = createLogger('CommandInterface');

class CommandInterface {
  constructor() {
    this.commands = {
      'new': this.handleNew.bind(this),
      'list': this.handleList.bind(this),
      'run': this.handleRun.bind(this),
      'customize': this.handleCustomize.bind(this),
      'delete': this.handleDelete.bind(this),
      'history': this.handleHistory.bind(this),
      'export': this.handleExport.bind(this),
      'help': this.handleHelp.bind(this)
    };
  }

  async processCommand(input) {
    try {
      logger.info(`Processing command: ${input}`);

      // Parse command
      const parsed = this.parseCommand(input);
      
      if (!parsed) {
        return {
          success: false,
          error: 'Invalid command format. Type "help" for usage.'
        };
      }

      const { command, args } = parsed;

      // Execute command
      if (this.commands[command]) {
        return await this.commands[command](args);
      } else {
        return {
          success: false,
          error: `Unknown command: ${command}. Type "help" for available commands.`
        };
      }
    } catch (error) {
      logger.error('Command processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseCommand(input) {
    // Handle "new: <request>" format
    if (input.startsWith('new:')) {
      return {
        command: 'new',
        args: { request: input.substring(4).trim() }
      };
    }

    // Handle "customize <skill> <instructions>" format
    if (input.startsWith('customize ')) {
      const parts = input.substring(10).split(' ');
      const skillName = parts[0];
      const instructions = parts.slice(1).join(' ');
      return {
        command: 'customize',
        args: { skillName, instructions }
      };
    }

    // Handle "run <skill> [params]" format
    if (input.startsWith('run ')) {
      const parts = input.substring(4).split(' ');
      const skillName = parts[0];
      const params = this.parseParams(parts.slice(1));
      return {
        command: 'run',
        args: { skillName, params }
      };
    }

    // Handle simple commands
    const simpleCommands = ['list', 'help'];
    if (simpleCommands.includes(input.trim())) {
      return {
        command: input.trim(),
        args: {}
      };
    }

    // Handle commands with single argument
    const singleArgCommands = ['delete', 'history', 'export'];
    for (const cmd of singleArgCommands) {
      if (input.startsWith(cmd + ' ')) {
        return {
          command: cmd,
          args: { skillName: input.substring(cmd.length + 1).trim() }
        };
      }
    }

    return null;
  }

  parseParams(parts) {
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith('--')) {
        const key = parts[i].substring(2);
        const value = parts[i + 1] || true;
        params[key] = value;
        i++;
      }
    }
    return params;
  }

  // COMMAND: new: <request>
  async handleNew(args) {
    try {
      const { request } = args;
      
      logger.info(`Creating new skill: ${request}`);

      // Step 1: Search the web
      logger.info('🔍 Searching web for information...');
      const searchResults = await searchProvider.search(request, {
        maxResults: 5,
        depth: 'basic'
      });

      // Step 2: Generate code
      logger.info('🤖 Generating code...');
      const generated = await codeGenerator.generateSkill(request, searchResults);

      // Step 3: Request confirmation via Telegram
      logger.info('📱 Requesting confirmation...');
      const confirmation = await telegram.requestConfirmation(
        `Create skill: ${generated.metadata.description}`,
        {
          language: generated.language,
          dependencies: generated.dependencies,
          linesOfCode: generated.code.split('\n').length
        }
      );

      if (!confirmation.approved) {
        return {
          success: false,
          message: 'Skill creation cancelled by user'
        };
      }

      // Step 4: Save skill
      logger.info('💾 Saving skill...');
      const skillName = this.generateSkillName(request);
      const saved = await skillManager.saveSkill(
        skillName,
        generated.code,
        generated.language,
        generated.metadata,
        generated.dependencies
      );

      return {
        success: true,
        message: `✅ Skill created: ${skillName}`,
        skillId: saved.skillId,
        path: saved.path,
        language: generated.language,
        dependencies: generated.dependencies
      };
    } catch (error) {
      logger.error('Failed to create skill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: list
  async handleList(args) {
    try {
      const result = await skillManager.listSkills();

      if (result.count === 0) {
        return {
          success: true,
          message: 'No skills found. Create one with "new: <request>"',
          skills: []
        };
      }

      return {
        success: true,
        message: `Found ${result.count} skill(s)`,
        skills: result.skills
      };
    } catch (error) {
      logger.error('Failed to list skills:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: run <skill> [params]
  async handleRun(args) {
    try {
      const { skillName, params } = args;

      logger.info(`Running skill: ${skillName}`);

      // Request confirmation via Telegram
      const confirmation = await telegram.requestConfirmation(
        `Run skill: ${skillName}`,
        { parameters: params }
      );

      if (!confirmation.approved) {
        return {
          success: false,
          message: 'Skill execution cancelled by user'
        };
      }

      // Execute skill
      const result = await skillManager.executeSkill(skillName, params);

      return {
        success: result.success,
        message: result.success ? '✅ Skill executed successfully' : '❌ Skill execution failed',
        output: result.output,
        error: result.error,
        exitCode: result.exitCode
      };
    } catch (error) {
      logger.error('Failed to run skill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: customize <skill> <instructions>
  async handleCustomize(args) {
    try {
      const { skillName, instructions } = args;

      logger.info(`Customizing skill: ${skillName}`);

      // Get current skill
      const { skill } = await skillManager.getSkill(skillName);

      // Search for additional information
      const searchResults = await searchProvider.search(instructions, {
        maxResults: 3
      });

      // Generate modified code
      const modified = await codeGenerator.customizeSkill(
        skillName,
        instructions,
        skill.code
      );

      // Request confirmation
      const confirmation = await telegram.requestConfirmation(
        `Customize skill: ${skillName}`,
        {
          changes: modified.changes,
          newDependencies: modified.dependencies
        }
      );

      if (!confirmation.approved) {
        return {
          success: false,
          message: 'Customization cancelled by user'
        };
      }

      // Save customized skill
      const result = await skillManager.customizeSkill(
        skillName,
        modified.code,
        modified.changes
      );

      return {
        success: true,
        message: `✅ Skill customized: ${skillName} (v${result.version})`,
        version: result.version,
        changes: modified.changes
      };
    } catch (error) {
      logger.error('Failed to customize skill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: delete <skill>
  async handleDelete(args) {
    try {
      const { skillName } = args;

      // Request confirmation
      const confirmation = await telegram.requestConfirmation(
        `Delete skill: ${skillName}`,
        { warning: 'This action cannot be undone' }
      );

      if (!confirmation.approved) {
        return {
          success: false,
          message: 'Deletion cancelled by user'
        };
      }

      await skillManager.deleteSkill(skillName);

      return {
        success: true,
        message: `✅ Skill deleted: ${skillName}`
      };
    } catch (error) {
      logger.error('Failed to delete skill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: history <skill>
  async handleHistory(args) {
    try {
      const { skillName } = args;

      const result = await skillManager.getHistory(skillName);

      return {
        success: true,
        message: `History for ${skillName}`,
        versions: result.versions
      };
    } catch (error) {
      logger.error('Failed to get history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: export <skill>
  async handleExport(args) {
    try {
      const { skillName } = args;

      const outputPath = `./exports/${skillName}_export.py`;
      const result = await skillManager.exportSkill(skillName, outputPath);

      return {
        success: true,
        message: `✅ Skill exported to: ${outputPath}`,
        path: result.exportPath
      };
    } catch (error) {
      logger.error('Failed to export skill:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // COMMAND: help
  async handleHelp(args) {
    return {
      success: true,
      message: `
🦞 PersonalClaw Skills Engine - Command Reference

COMMANDS:

  new: <request>
    Create a new skill from a natural language request
    Example: new: create a function that checks website uptime

  list
    Show all saved skills
    Example: list

  run <skill_name> [--param value]
    Execute a skill with optional parameters
    Example: run uptime_monitor --url https://mysite.com --interval 60

  customize <skill_name> <instructions>
    Modify an existing skill
    Example: customize uptime_monitor add slack notifications

  delete <skill_name>
    Remove a skill permanently
    Example: delete uptime_monitor

  history <skill_name>
    Show version history of a skill
    Example: history uptime_monitor

  export <skill_name>
    Export skill as standalone file
    Example: export uptime_monitor

  help
    Show this help message

WORKFLOW:
1. Create: new: <what you want>
2. Test: run <skill_name>
3. Modify: customize <skill_name> <changes>
4. Use: run <skill_name> with real parameters

All actions require Telegram confirmation for safety!
      `.trim()
    };
  }

  generateSkillName(request) {
    // Generate a clean skill name from request
    return request
      .toLowerCase()
      .replace(/create|function|that|checks?|monitors?/gi, '')
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50) || 'custom_skill';
  }
}

export default new CommandInterface();
