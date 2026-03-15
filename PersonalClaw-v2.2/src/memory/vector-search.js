import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import database from './database.js';

const logger = createLogger('VectorSearch');

class VectorSearch {
  constructor() {
    this.embeddings = [];
    this.embeddingCache = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Load embeddings from database
    const stored = await database.getSetting('embeddings');
    if (stored) {
      this.embeddings = stored;
    }
    
    this.initialized = true;
    logger.info('Vector search initialized (JSON-based)');
  }

  async save() {
    await database.saveSetting('embeddings', this.embeddings);
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
      logger.error('Failed to generate embedding:', error.message);
      return null;
    }
  }

  async addEmbedding(contentType, contentId, text) {
    const embedding = await this.generateEmbedding(text);
    if (!embedding) return false;

    // Remove existing embedding for this content
    this.embeddings = this.embeddings.filter(
      e => !(e.content_type === contentType && e.content_id === contentId)
    );

    // Add new embedding
    this.embeddings.push({
      id: Date.now(),
      content_type: contentType,
      content_id: contentId,
      embedding: embedding,
      created_at: new Date().toISOString()
    });

    await this.save();
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

    let results = this.embeddings;

    // Filter by content type if specified
    if (contentType) {
      results = results.filter(e => e.content_type === contentType);
    }

    // Calculate similarities
    results = results.map(item => {
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);

      return {
        content_type: item.content_type,
        content_id: item.content_id,
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
      const conversations = await database.getConversations(100);
      keywordResults = conversations
        .filter(c => JSON.stringify(c).toLowerCase().includes(query.toLowerCase()))
        .slice(0, limit);
    } else if (contentType === 'memory') {
      const memories = await database.searchMemories(query);
      keywordResults = memories.slice(0, limit);
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
