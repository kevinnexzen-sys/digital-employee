import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('SearchProvider');

class SearchProvider {
  constructor() {
    this.provider = config.search.provider || 'tavily'; // tavily, serpapi, or bing
    this.apiKey = config.search.apiKey;
  }

  async search(query, options = {}) {
    try {
      logger.info(`Searching: "${query}" via ${this.provider}`);

      let results;
      switch (this.provider) {
        case 'tavily':
          results = await this.searchTavily(query, options);
          break;
        case 'serpapi':
          results = await this.searchSerpAPI(query, options);
          break;
        case 'bing':
          results = await this.searchBing(query, options);
          break;
        default:
          throw new Error(`Unknown search provider: ${this.provider}`);
      }

      logger.info(`Found ${results.length} results`);
      return {
        success: true,
        query,
        results,
        provider: this.provider
      };
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  async searchTavily(query, options = {}) {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        search_depth: options.depth || 'basic',
        include_answer: true,
        include_raw_content: options.includeRaw || false,
        max_results: options.maxResults || 5
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return data.results.map(result => ({
      title: result.title,
      url: result.url,
      content: result.content,
      score: result.score,
      raw: result.raw_content
    }));
  }

  async searchSerpAPI(query, options = {}) {
    const params = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      num: options.maxResults || 5
    });

    const response = await fetch(`https://serpapi.com/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.organic_results || []).map(result => ({
      title: result.title,
      url: result.link,
      content: result.snippet,
      score: result.position
    }));
  }

  async searchBing(query, options = {}) {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${options.maxResults || 5}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.webPages?.value || []).map(result => ({
      title: result.name,
      url: result.url,
      content: result.snippet,
      score: 1
    }));
  }

  async multiSearch(queries) {
    const results = await Promise.all(
      queries.map(q => this.search(q))
    );

    return {
      success: true,
      searches: results
    };
  }
}

export default new SearchProvider();
