import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('SkillManager');

class SkillManager {
  constructor() {
    this.skillsDir = './skills';
    this.metadataDir = './skills/.metadata';
    this.versionsDir = './skills/.versions';
    this.initialize();
  }

  async initialize() {
    await fs.ensureDir(this.skillsDir);
    await fs.ensureDir(this.metadataDir);
    await fs.ensureDir(this.versionsDir);
    logger.info('Skill manager initialized');
  }

  async saveSkill(name, code, language, metadata, dependencies = []) {
    try {
      logger.info(`Saving skill: ${name}`);

      const skillId = this.generateSkillId(name);
      const extension = this.getExtension(language);
      const skillPath = path.join(this.skillsDir, `${skillId}${extension}`);

      // Save code file
      await fs.writeFile(skillPath, code, 'utf8');

      // Save metadata
      const metadataPath = path.join(this.metadataDir, `${skillId}.json`);
      await fs.writeJson(metadataPath, {
        id: skillId,
        name,
        language,
        ...metadata,
        dependencies,
        filePath: skillPath,
        versions: [
          {
            version: 1,
            createdAt: new Date().toISOString(),
            code
          }
        ]
      }, { spaces: 2 });

      // Install dependencies if needed
      if (dependencies.length > 0) {
        await this.installDependencies(language, dependencies);
      }

      logger.info(`Skill saved: ${skillId}`);

      return {
        success: true,
        skillId,
        path: skillPath,
        metadata: metadataPath
      };
    } catch (error) {
      logger.error('Failed to save skill:', error);
      throw error;
    }
  }

  async getSkill(skillId) {
    try {
      const metadataPath = path.join(this.metadataDir, `${skillId}.json`);
      
      if (!await fs.pathExists(metadataPath)) {
        throw new Error(`Skill not found: ${skillId}`);
      }

      const metadata = await fs.readJson(metadataPath);
      const code = await fs.readFile(metadata.filePath, 'utf8');

      return {
        success: true,
        skill: {
          ...metadata,
          code
        }
      };
    } catch (error) {
      logger.error('Failed to get skill:', error);
      throw error;
    }
  }

  async listSkills() {
    try {
      const metadataFiles = await fs.readdir(this.metadataDir);
      const skills = [];

      for (const file of metadataFiles) {
        if (file.endsWith('.json')) {
          const metadata = await fs.readJson(path.join(this.metadataDir, file));
          skills.push({
            id: metadata.id,
            name: metadata.name,
            description: metadata.description,
            language: metadata.language,
            version: metadata.version,
            createdAt: metadata.createdAt
          });
        }
      }

      return {
        success: true,
        skills,
        count: skills.length
      };
    } catch (error) {
      logger.error('Failed to list skills:', error);
      throw error;
    }
  }

  async executeSkill(skillId, params = {}) {
    try {
      logger.info(`Executing skill: ${skillId}`);

      const { skill } = await this.getSkill(skillId);

      let result;
      switch (skill.language) {
        case 'python':
          result = await this.executePython(skill.filePath, params);
          break;
        case 'javascript':
          result = await this.executeJavaScript(skill.filePath, params);
          break;
        case 'bash':
          result = await this.executeBash(skill.filePath, params);
          break;
        default:
          throw new Error(`Unsupported language: ${skill.language}`);
      }

      logger.info(`Skill executed successfully: ${skillId}`);

      return {
        success: true,
        skillId,
        output: result.stdout,
        error: result.stderr,
        exitCode: result.exitCode
      };
    } catch (error) {
      logger.error('Skill execution failed:', error);
      throw error;
    }
  }

  async executePython(filePath, params) {
    const paramsJson = JSON.stringify(params);
    const command = `python3 ${filePath} '${paramsJson}'`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60 second timeout
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }

  async executeJavaScript(filePath, params) {
    const paramsJson = JSON.stringify(params);
    const command = `node ${filePath} '${paramsJson}'`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }

  async executeBash(filePath, params) {
    const paramsStr = Object.entries(params)
      .map(([key, value]) => `--${key} ${value}`)
      .join(' ');
    
    const command = `bash ${filePath} ${paramsStr}`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1
      };
    }
  }

  async customizeSkill(skillId, newCode, changes) {
    try {
      logger.info(`Customizing skill: ${skillId}`);

      const { skill } = await this.getSkill(skillId);

      // Save current version to versions directory
      const versionPath = path.join(
        this.versionsDir,
        `${skillId}_v${skill.version}.${this.getExtension(skill.language)}`
      );
      await fs.writeFile(versionPath, skill.code, 'utf8');

      // Update skill file
      await fs.writeFile(skill.filePath, newCode, 'utf8');

      // Update metadata
      const metadataPath = path.join(this.metadataDir, `${skillId}.json`);
      skill.version += 1;
      skill.versions.push({
        version: skill.version,
        createdAt: new Date().toISOString(),
        changes,
        code: newCode
      });
      delete skill.code; // Don't store code in metadata
      await fs.writeJson(metadataPath, skill, { spaces: 2 });

      logger.info(`Skill customized: ${skillId} (v${skill.version})`);

      return {
        success: true,
        skillId,
        version: skill.version,
        changes
      };
    } catch (error) {
      logger.error('Skill customization failed:', error);
      throw error;
    }
  }

  async deleteSkill(skillId) {
    try {
      logger.info(`Deleting skill: ${skillId}`);

      const { skill } = await this.getSkill(skillId);

      // Delete skill file
      await fs.remove(skill.filePath);

      // Delete metadata
      const metadataPath = path.join(this.metadataDir, `${skillId}.json`);
      await fs.remove(metadataPath);

      // Delete versions
      const versionFiles = await fs.readdir(this.versionsDir);
      for (const file of versionFiles) {
        if (file.startsWith(skillId)) {
          await fs.remove(path.join(this.versionsDir, file));
        }
      }

      logger.info(`Skill deleted: ${skillId}`);

      return {
        success: true,
        skillId
      };
    } catch (error) {
      logger.error('Skill deletion failed:', error);
      throw error;
    }
  }

  async getHistory(skillId) {
    try {
      const { skill } = await this.getSkill(skillId);

      return {
        success: true,
        skillId,
        versions: skill.versions
      };
    } catch (error) {
      logger.error('Failed to get history:', error);
      throw error;
    }
  }

  async exportSkill(skillId, outputPath) {
    try {
      const { skill } = await this.getSkill(skillId);

      await fs.writeFile(outputPath, skill.code, 'utf8');

      logger.info(`Skill exported: ${skillId} -> ${outputPath}`);

      return {
        success: true,
        skillId,
        exportPath: outputPath
      };
    } catch (error) {
      logger.error('Skill export failed:', error);
      throw error;
    }
  }

  async installDependencies(language, dependencies) {
    try {
      logger.info(`Installing dependencies for ${language}: ${dependencies.join(', ')}`);

      if (language === 'python') {
        const command = `pip3 install ${dependencies.join(' ')}`;
        await execAsync(command);
      } else if (language === 'javascript') {
        const command = `npm install ${dependencies.join(' ')}`;
        await execAsync(command);
      }

      logger.info('Dependencies installed successfully');
    } catch (error) {
      logger.warn('Failed to install dependencies:', error.message);
      // Don't throw - dependencies might already be installed
    }
  }

  generateSkillId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  getExtension(language) {
    const extensions = {
      python: '.py',
      javascript: '.js',
      bash: '.sh'
    };
    return extensions[language] || '.txt';
  }
}

export default new SkillManager();
