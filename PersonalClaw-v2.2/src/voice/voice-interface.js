import speechToText from './speech-to-text.js';
import textToSpeech from './text-to-speech.js';
import agentExecutor from '../agent/executor.js';
import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';

const logger = createLogger('VoiceInterface');

class VoiceInterface {
  constructor() {
    this.isListening = false;
    this.wakeWordDetected = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Voice Interface...');
      
      await speechToText.initialize();
      await textToSpeech.initialize();
      
      logger.info('Voice Interface initialized');
    } catch (error) {
      logger.error('Failed to initialize Voice Interface:', error);
      throw error;
    }
  }

  async processVoiceCommand(audioFilePath) {
    try {
      logger.info('Processing voice command...');

      // Transcribe audio
      const transcription = await speechToText.transcribe(audioFilePath);
      
      if (!transcription.success) {
        throw new Error('Transcription failed');
      }

      logger.info(`Transcribed: ${transcription.text}`);

      // Check for wake word
      if (config.wakeWord.enabled) {
        const hasWakeWord = transcription.text.toLowerCase().includes(config.wakeWord.word.toLowerCase());
        if (!hasWakeWord && !this.wakeWordDetected) {
          logger.info('Wake word not detected, ignoring command');
          return {
            success: false,
            reason: 'Wake word not detected'
          };
        }
        this.wakeWordDetected = true;
      }

      // Execute command with agent
      const response = await agentExecutor.execute(transcription.text);

      // Convert response to speech
      const speech = await textToSpeech.speak(response.response, {
        saveToFile: true
      });

      return {
        success: true,
        transcription: transcription.text,
        response: response.response,
        audioPath: speech.audioPath
      };
    } catch (error) {
      logger.error('Voice command processing failed:', error);
      throw error;
    }
  }

  async startListening() {
    if (this.isListening) {
      logger.warn('Already listening');
      return;
    }

    logger.info('Started listening for voice commands');
    this.isListening = true;
  }

  stopListening() {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopped listening for voice commands');
    this.isListening = false;
    this.wakeWordDetected = false;
  }
}

export default new VoiceInterface();
