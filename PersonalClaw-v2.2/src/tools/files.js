import fs from 'fs-extra';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Files');

class FileOperations {
  constructor() {
    this.allowedDirectories = [
      process.env.HOME || process.env.USERPROFILE,
      '/tmp',
      './data'
    ];
  }

  async readFile(filepath) {
    try {
      logger.info(`Reading file: ${filepath}`);
      const content = await fs.readFile(filepath, 'utf8');
      return { success: true, content };
    } catch (error) {
      logger.error(`Read file failed: ${error.message}`);
      throw error;
    }
  }

  async writeFile(filepath, content) {
    try {
      logger.info(`Writing file: ${filepath}`);
      await fs.ensureDir(path.dirname(filepath));
      await fs.writeFile(filepath, content, 'utf8');
      return { success: true };
    } catch (error) {
      logger.error(`Write file failed: ${error.message}`);
      throw error;
    }
  }

  async appendFile(filepath, content) {
    try {
      logger.info(`Appending to file: ${filepath}`);
      await fs.appendFile(filepath, content, 'utf8');
      return { success: true };
    } catch (error) {
      logger.error(`Append file failed: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(filepath) {
    try {
      logger.info(`Deleting file: ${filepath}`);
      await fs.remove(filepath);
      return { success: true };
    } catch (error) {
      logger.error(`Delete file failed: ${error.message}`);
      throw error;
    }
  }

  async copyFile(source, destination) {
    try {
      logger.info(`Copying file: ${source} -> ${destination}`);
      await fs.copy(source, destination);
      return { success: true };
    } catch (error) {
      logger.error(`Copy file failed: ${error.message}`);
      throw error;
    }
  }

  async moveFile(source, destination) {
    try {
      logger.info(`Moving file: ${source} -> ${destination}`);
      await fs.move(source, destination);
      return { success: true };
    } catch (error) {
      logger.error(`Move file failed: ${error.message}`);
      throw error;
    }
  }

  async listFiles(directory) {
    try {
      logger.info(`Listing files in: ${directory}`);
      const files = await fs.readdir(directory);
      const fileDetails = await Promise.all(
        files.map(async (file) => {
          const filepath = path.join(directory, file);
          const stats = await fs.stat(filepath);
          return {
            name: file,
            path: filepath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        })
      );
      return { success: true, files: fileDetails };
    } catch (error) {
      logger.error(`List files failed: ${error.message}`);
      throw error;
    }
  }

  async createDirectory(directory) {
    try {
      logger.info(`Creating directory: ${directory}`);
      await fs.ensureDir(directory);
      return { success: true };
    } catch (error) {
      logger.error(`Create directory failed: ${error.message}`);
      throw error;
    }
  }

  async fileExists(filepath) {
    try {
      const exists = await fs.pathExists(filepath);
      return { success: true, exists };
    } catch (error) {
      logger.error(`File exists check failed: ${error.message}`);
      throw error;
    }
  }

  async getFileStats(filepath) {
    try {
      const stats = await fs.stat(filepath);
      return {
        success: true,
        stats: {
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile()
        }
      };
    } catch (error) {
      logger.error(`Get file stats failed: ${error.message}`);
      throw error;
    }
  }
}

export default new FileOperations();
