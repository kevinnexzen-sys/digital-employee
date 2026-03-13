import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import vectorSearch from './vector-search.js';

const logger = createLogger('Database');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.vectorSearchEnabled = false;
  }

  initialize() {
    try {
      const dbPath = config.database.path || './data/personalclaw.db';
      
      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      // Set file permissions (owner only)
      fs.chmodSync(dbPath, 0o600);

      this.createTables();
      
      // Initialize vector search
      this.initializeVectorSearch();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async initializeVectorSearch() {
    try {
      await vectorSearch.initialize(this.db);
      this.vectorSearchEnabled = true;
      logger.info('Vector search enabled');
    } catch (error) {
      logger.warn('Vector search initialization failed, continuing without it:', error);
      this.vectorSearchEnabled = false;
    }
  }

  createTables() {
    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Memories table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        importance INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    // Automations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS automations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        trigger TEXT NOT NULL,
        action TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database tables created');
  }

  // Conversation methods
  addConversation(role, message) {
    const stmt = this.db.prepare(`
      INSERT INTO conversations (role, message) VALUES (?, ?)
    `);
    const result = stmt.run(role, message);

    // Add to vector search if enabled
    if (this.vectorSearchEnabled) {
      vectorSearch.addEmbedding('conversation', result.lastInsertRowid, message)
        .catch(err => logger.warn('Failed to add embedding:', err));
    }

    return result.lastInsertRowid;
  }

  getConversations(limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  async searchConversations(query, limit = 10) {
    if (this.vectorSearchEnabled) {
      // Use hybrid search (vector + keyword)
      const results = await vectorSearch.hybridSearch(query, 'conversation', limit);
      
      // Get full conversation data
      const ids = results.map(r => r.content_id);
      if (ids.length === 0) return [];

      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        SELECT * FROM conversations 
        WHERE id IN (${placeholders})
      `);
      return stmt.all(...ids);
    } else {
      // Fallback to keyword search
      const stmt = this.db.prepare(`
        SELECT * FROM conversations 
        WHERE message LIKE ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      return stmt.all(`%${query}%`, limit);
    }
  }

  clearConversations() {
    this.db.exec('DELETE FROM conversations');
    logger.info('Conversations cleared');
  }

  // Memory methods
  addMemory(content, importance = 5) {
    const stmt = this.db.prepare(`
      INSERT INTO memories (content, importance) VALUES (?, ?)
    `);
    const result = stmt.run(content, importance);

    // Add to vector search if enabled
    if (this.vectorSearchEnabled) {
      vectorSearch.addEmbedding('memory', result.lastInsertRowid, content)
        .catch(err => logger.warn('Failed to add embedding:', err));
    }

    return result.lastInsertRowid;
  }

  async searchMemories(query, limit = 10) {
    if (this.vectorSearchEnabled) {
      // Use hybrid search
      const results = await vectorSearch.hybridSearch(query, 'memory', limit);
      
      const ids = results.map(r => r.content_id);
      if (ids.length === 0) return [];

      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE id IN (${placeholders})
      `);
      return stmt.all(...ids);
    } else {
      // Fallback to keyword search
      const stmt = this.db.prepare(`
        SELECT * FROM memories 
        WHERE content LIKE ? 
        ORDER BY importance DESC 
        LIMIT ?
      `);
      return stmt.all(`%${query}%`, limit);
    }
  }

  getMemories(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM memories 
      ORDER BY importance DESC, created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  // Task methods
  addTask(description) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (description) VALUES (?)
    `);
    return stmt.run(description).lastInsertRowid;
  }

  getTasks(status = null) {
    let sql = 'SELECT * FROM tasks';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  updateTaskStatus(id, status) {
    const stmt = this.db.prepare(`
      UPDATE tasks 
      SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `);
    stmt.run(status, status, id);
  }

  // Automation methods
  addAutomation(name, trigger, action) {
    const stmt = this.db.prepare(`
      INSERT INTO automations (name, trigger, action) VALUES (?, ?, ?)
    `);
    return stmt.run(name, trigger, action).lastInsertRowid;
  }

  getAutomations(enabledOnly = true) {
    let sql = 'SELECT * FROM automations';
    if (enabledOnly) {
      sql += ' WHERE enabled = 1';
    }
    sql += ' ORDER BY created_at DESC';

    const stmt = this.db.prepare(sql);
    return stmt.all();
  }

  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database closed');
    }
  }
}

export default new DatabaseManager();
