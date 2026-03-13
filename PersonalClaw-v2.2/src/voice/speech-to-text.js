import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import fs from 'fs-extra';
import path from 'path';

const logger = createLogger('SpeechToText');

class SpeechToText {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Speech-to-Text...');
      
      if (!config.llm.openai.apiKey) {
        logger.warn('OpenAI API key not configured for Whisper');
        return;
      }

      this.isInitialized = true;
      logger.info('Speech-to-Text initialized');
    } catch (error) {
      logger.error('Failed to initialize Speech-to-Text:', error);
      throw error;
    }
  }

  async transcribe(audioFilePath) {
    await this.ensureInitialized();

    try {
      logger.info(`Transcribing audio: ${audioFilePath}`);

      const exists = await fs.pathExists(audioFilePath);
      if (!exists) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: config.llm.openai.apiKey });

      const audioFile = fs.createReadStream(audioFilePath);
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en'
      });

      logger.info('Transcription completed');
      return {
        success: true,
        text: response.text,
        language: 'en'
      };
    } catch (error) {
      logger.error('Transcription failed:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default new SpeechToText();
