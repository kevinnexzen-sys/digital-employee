import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('LLMProvider');

class LLMProvider {
  constructor() {
    this.anthropic = null;
    this.openai = null;
    this.ollama = null;
    this.gemini = null;
    this.initializeProviders();
  }

  initializeProviders() {
    // Initialize Anthropic
    if (config.llm.anthropic.apiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.llm.anthropic.apiKey
      });
      logger.info('Anthropic initialized');
    } else {
      logger.warn('Anthropic API key not found');
    }

    // Initialize OpenAI
    if (config.llm.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.llm.openai.apiKey
      });
      logger.info('OpenAI initialized');
    } else {
      logger.warn('OpenAI API key not found');
    }

    // Initialize Ollama (local, no API key needed)
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ollama = {
      baseUrl: ollamaUrl,
      model: process.env.OLLAMA_MODEL || 'llama2'
    };
    logger.info(`Ollama configured at ${ollamaUrl}`);

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      this.gemini = {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-pro'
      };
      logger.info('Gemini initialized');
    } else {
      logger.warn('Gemini API key not found');
    }
  }

  async chat(messages, options = {}) {
    const provider = options.provider || config.llm.provider;

    if (provider === 'anthropic' && this.anthropic) {
      return this.chatAnthropic(messages, options);
    } else if (provider === 'openai' && this.openai) {
      return this.chatOpenAI(messages, options);
    } else if (provider === 'ollama') {
      return this.chatOllama(messages, options);
    } else if (provider === 'gemini' && this.gemini) {
      return this.chatGemini(messages, options);
    } else {
      throw new Error(`Provider ${provider} not available or not initialized`);
    }
  }

  async chatAnthropic(messages, options = {}) {
    try {
      const response = await this.anthropic.messages.create({
        model: options.model || config.llm.anthropic.model,
        max_tokens: options.maxTokens || config.llm.anthropic.maxTokens,
        messages: messages
      });

      return {
        content: response.content[0].text,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('Anthropic chat error:', error);
      throw error;
    }
  }

  async chatOpenAI(messages, options = {}) {
    try {
      const response = await this.openai.chat.completions.create({
        model: options.model || config.llm.openai.model,
        max_tokens: options.maxTokens || config.llm.openai.maxTokens,
        messages: messages
      });

      return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model: response.model
      };
    } catch (error) {
      logger.error('OpenAI chat error:', error);
      throw error;
    }
  }

  async chatOllama(messages, options = {}) {
    try {
      const response = await fetch(`${this.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || this.ollama.model,
          messages: messages,
          stream: false
        })
      });

      const data = await response.json();
      
      return {
        content: data.message.content,
        model: data.model
      };
    } catch (error) {
      logger.error('Ollama chat error:', error);
      throw error;
    }
  }

  async chatGemini(messages, options = {}) {
    try {
      // Convert messages to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.gemini.model}:generateContent?key=${this.gemini.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents
          })
        }
      );

      const data = await response.json();
      
      return {
        content: data.candidates[0].content.parts[0].text,
        model: this.gemini.model
      };
    } catch (error) {
      logger.error('Gemini chat error:', error);
      throw error;
    }
  }

  async stream(messages, onChunk, options = {}) {
    const provider = options.provider || config.llm.provider;

    if (provider === 'anthropic' && this.anthropic) {
      return this.streamAnthropic(messages, onChunk, options);
    } else if (provider === 'openai' && this.openai) {
      return this.streamOpenAI(messages, onChunk, options);
    } else if (provider === 'ollama') {
      return this.streamOllama(messages, onChunk, options);
    } else if (provider === 'gemini' && this.gemini) {
      return this.streamGemini(messages, onChunk, options);
    } else {
      throw new Error(`Provider ${provider} not available or not initialized`);
    }
  }

  async streamAnthropic(messages, onChunk, options = {}) {
    try {
      const stream = await this.anthropic.messages.create({
        model: options.model || config.llm.anthropic.model,
        max_tokens: options.maxTokens || config.llm.anthropic.maxTokens,
        messages: messages,
        stream: true
      });

      let fullContent = '';
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullContent += text;
          onChunk(text);
        }
      }

      return { content: fullContent };
    } catch (error) {
      logger.error('Anthropic stream error:', error);
      throw error;
    }
  }

  async streamOpenAI(messages, onChunk, options = {}) {
    try {
      const stream = await this.openai.chat.completions.create({
        model: options.model || config.llm.openai.model,
        max_tokens: options.maxTokens || config.llm.openai.maxTokens,
        messages: messages,
        stream: true
      });

      let fullContent = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          fullContent += text;
          onChunk(text);
        }
      }

      return { content: fullContent };
    } catch (error) {
      logger.error('OpenAI stream error:', error);
      throw error;
    }
  }

  async streamOllama(messages, onChunk, options = {}) {
    try {
      const response = await fetch(`${this.ollama.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model || this.ollama.model,
          messages: messages,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullContent += data.message.content;
              onChunk(data.message.content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      return { content: fullContent };
    } catch (error) {
      logger.error('Ollama stream error:', error);
      throw error;
    }
  }

  async streamGemini(messages, onChunk, options = {}) {
    try {
      // Gemini streaming requires different endpoint
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.gemini.model}:streamGenerateContent?key=${this.gemini.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: contents
          })
        }
      );

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              const text = data.candidates[0].content.parts[0].text;
              fullContent += text;
              onChunk(text);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }

      return { content: fullContent };
    } catch (error) {
      logger.error('Gemini stream error:', error);
      throw error;
    }
  }

  isAvailable(provider = null) {
    const targetProvider = provider || config.llm.provider;
    
    if (targetProvider === 'anthropic') {
      return this.anthropic !== null;
    } else if (targetProvider === 'openai') {
      return this.openai !== null;
    } else if (targetProvider === 'ollama') {
      return this.ollama !== null;
    } else if (targetProvider === 'gemini') {
      return this.gemini !== null;
    }
    
    return false;
  }

  getAvailableProviders() {
    const providers = [];
    if (this.anthropic) providers.push('anthropic');
    if (this.openai) providers.push('openai');
    if (this.ollama) providers.push('ollama');
    if (this.gemini) providers.push('gemini');
    return providers;
  }
}

// Export singleton instance
const llmProvider = new LLMProvider();
export default llmProvider;
