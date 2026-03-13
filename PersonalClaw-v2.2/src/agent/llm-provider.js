import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('LLMProvider');

class LLMProvider {
  constructor() {
    this.anthropic = null;
    this.openai = null;
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
  }

  async chat(messages, options = {}) {
    const provider = options.provider || config.llm.provider;

    if (provider === 'anthropic' && this.anthropic) {
      return this.chatAnthropic(messages, options);
    } else if (provider === 'openai' && this.openai) {
      return this.chatOpenAI(messages, options);
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

  async stream(messages, onChunk, options = {}) {
    const provider = options.provider || config.llm.provider;

    if (provider === 'anthropic' && this.anthropic) {
      return this.streamAnthropic(messages, onChunk, options);
    } else if (provider === 'openai' && this.openai) {
      return this.streamOpenAI(messages, onChunk, options);
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

  isAvailable(provider = null) {
    const targetProvider = provider || config.llm.provider;
    
    if (targetProvider === 'anthropic') {
      return this.anthropic !== null;
    } else if (targetProvider === 'openai') {
      return this.openai !== null;
    }
    
    return false;
  }

  getAvailableProviders() {
    const providers = [];
    if (this.anthropic) providers.push('anthropic');
    if (this.openai) providers.push('openai');
    return providers;
  }
}

// Export singleton instance
const llmProvider = new LLMProvider();
export default llmProvider;
