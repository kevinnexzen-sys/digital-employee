/**
 * Database Module - Simple JSON-based storage (Windows-friendly)
 * No C++ compilation required!
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/personalclaw.json');
    this.data = {
      conversations: [],
      memories: [],
      tasks: [],
      automations: [],
      settings: {}
    };
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.ensureDir(path.dirname(this.dbPath));
      
      if (await fs.pathExists(this.dbPath)) {
        const content = await fs.readFile(this.dbPath, 'utf-8');
        this.data = JSON.parse(content);
        // Ensure automations array exists
        if (!this.data.automations) {
          this.data.automations = [];
        }
      } else {
        await this.save();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Database init error:', error.message);
      throw error;
    }
  }

  async save() {
    try {
      await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Database save error:', error.message);
    }
  }

  // Conversations
  async saveConversation(conversation) {
    this.data.conversations.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...conversation
    });
    await this.save();
  }

  async getConversations(limit = 10) {
    return this.data.conversations.slice(-limit);
  }

  // Memories
  async saveMemory(memory) {
    this.data.memories.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...memory
    });
    await this.save();
  }

  async searchMemories(query) {
    return this.data.memories.filter(m => 
      JSON.stringify(m).toLowerCase().includes(query.toLowerCase())
    );
  }

  // Tasks
  async saveTask(task) {
    this.data.tasks.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...task
    });
    await this.save();
  }

  async getTasks(status = null) {
    if (status) {
      return this.data.tasks.filter(t => t.status === status);
    }
    return this.data.tasks;
  }

  async updateTask(id, updates) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      await this.save();
    }
  }

  // Automations
  async saveAutomation(automation) {
    this.data.automations.push({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      enabled: true,
      ...automation
    });
    await this.save();
    return this.data.automations[this.data.automations.length - 1];
  }

  async getAutomations(enabledOnly = false) {
    if (enabledOnly) {
      return this.data.automations.filter(a => a.enabled);
    }
    return this.data.automations;
  }

  async updateAutomation(id, updates) {
    const automation = this.data.automations.find(a => a.id === id);
    if (automation) {
      Object.assign(automation, updates);
      await this.save();
    }
  }

  async deleteAutomation(id) {
    this.data.automations = this.data.automations.filter(a => a.id !== id);
    await this.save();
  }

  // Settings
  async saveSetting(key, value) {
    this.data.settings[key] = value;
    await this.save();
  }

  async getSetting(key) {
    return this.data.settings[key];
  }

  // Clear data
  async clear() {
    this.data = {
      conversations: [],
      memories: [],
      tasks: [],
      automations: [],
      settings: {}
    };
    await this.save();
  }

  // Close (for compatibility)
  close() {
    // JSON-based storage doesn't need closing
  }
}

export default new Database();
