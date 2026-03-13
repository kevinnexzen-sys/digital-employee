import { createLogger } from '../utils/logger.js';
import speechToText from './speech-to-text.js';
import textToSpeech from './text-to-speech.js';
import executor from '../agent/executor.js';
import config from '../utils/config.js';

const logger = createLogger('BackgroundVoiceService');

class BackgroundVoiceService {
  constructor() {
    this.isRunning = false;
    this.isListening = false;
    this.currentLanguage = 'en';
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Background voice service already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting background voice service');

    this.startListening();
  }

  async startListening() {
    this.isListening = true;
    logger.info('Voice service listening in background');
  }

  async processVoiceInput(audioBuffer) {
    try {
      logger.info('Processing voice input');

      const text = await speechToText.transcribe(audioBuffer, this.currentLanguage);
      
      if (!text || text.trim().length === 0) {
        return { success: false, error: 'No speech detected' };
      }

      logger.info(`Transcribed: ${text}`);

      const response = await executor.execute(text);

      await textToSpeech.speak(response.response, this.currentLanguage);

      return {
        success: true,
        input: text,
        output: response.response
      };
    } catch (error) {
      logger.error('Voice processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  setLanguage(language) {
    this.currentLanguage = language;
    logger.info(`Language set to: ${language}`);
  }

  stop() {
    this.isRunning = false;
    this.isListening = false;
    logger.info('Background voice service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isListening: this.isListening,
      currentLanguage: this.currentLanguage
    };
  }
}

export default new BackgroundVoiceService();
