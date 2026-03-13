import Database from 'better-sqlite3';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('VectorSearch');

class VectorSearch {
  constructor() {
    this.db = null;
    this.embeddingCache = new Map();
  }

  async initialize(db) {
    this.db = db;
    
    // Create vector search tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_type TEXT NOT NULL,
        content_id INTEGER NOT NULL,
        embedding BLOB NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_type, content_id)
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_type 
      ON embeddings(content_type)
    `);

    logger.info('Vector search initialized');
  }

  async generateEmbedding(text) {
    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text);
    }

    try {
      // Use OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.llm.openai.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // Cache it
      this.embeddingCache.set(text, embedding);

      return embedding;
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      return null;
    }
  }

  async addEmbedding(contentType, contentId, text) {
    const embedding = await this.generateEmbedding(text);
    if (!embedding) return false;

    const embeddingBlob = Buffer.from(new Float32Array(embedding).buffer);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embeddings (content_type, content_id, embedding)
      VALUES (?, ?, ?)
    `);

    stmt.run(contentType, contentId, embeddingBlob);
    return true;
  }

  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(query, contentType = null, limit = 10) {
    const queryEmbedding = await this.generateEmbedding(query);
    if (!queryEmbedding) return [];

    let sql = 'SELECT * FROM embeddings';
    const params = [];

    if (contentType) {
      sql += ' WHERE content_type = ?';
      params.push(contentType);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params);

    // Calculate similarities
    const results = rows.map(row => {
      const embedding = new Float32Array(row.embedding.buffer);
      const similarity = this.cosineSimilarity(queryEmbedding, Array.from(embedding));

      return {
        content_type: row.content_type,
        content_id: row.content_id,
        similarity
      };
    });

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async hybridSearch(query, contentType, limit = 10) {
    // Combine vector search with keyword search
    const vectorResults = await this.search(query, contentType, limit * 2);
    
    // Get actual content for keyword matching
    let keywordResults = [];
    
    if (contentType === 'conversation') {
      const stmt = this.db.prepare(`
        SELECT id, message FROM conversations 
        WHERE message LIKE ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      keywordResults = stmt.all(`%${query}%`, limit);
    } else if (contentType === 'memory') {
      const stmt = this.db.prepare(`
        SELECT id, content FROM memories 
        WHERE content LIKE ? 
        ORDER BY importance DESC 
        LIMIT ?
      `);
      keywordResults = stmt.all(`%${query}%`, limit);
    }

    // Merge results (vector 60%, keyword 40%)
    const merged = new Map();

    vectorResults.forEach(result => {
      merged.set(result.content_id, {
        ...result,
        score: result.similarity * 0.6
      });
    });

    keywordResults.forEach(result => {
      const existing = merged.get(result.id);
      if (existing) {
        existing.score += 0.4;
      } else {
        merged.set(result.id, {
          content_type: contentType,
          content_id: result.id,
          score: 0.4
        });
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

export default new VectorSearch();
