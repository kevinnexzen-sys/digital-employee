import { createLogger } from '../utils/logger.js';
import config from '../utils/config.js';
import fs from 'fs-extra';
import path from 'path';

const logger = createLogger('TextToSpeech');

class TextToSpeech {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Text-to-Speech...');
      
      if (!config.voice.elevenlabs.apiKey) {
        logger.warn('ElevenLabs API key not configured');
        return;
      }

      this.isInitialized = true;
      logger.info('Text-to-Speech initialized');
    } catch (error) {
      logger.error('Failed to initialize Text-to-Speech:', error);
      throw error;
    }
  }

  async speak(text, options = {}) {
    await this.ensureInitialized();

    try {
      logger.info(`Converting text to speech: ${text.substring(0, 50)}...`);

      // Use ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voice.elevenlabs.voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.voice.elevenlabs.apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || 0.5,
            similarity_boost: options.similarityBoost || 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.statusText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      
      // Save to file if requested
      if (options.saveToFile) {
        const outputPath = options.outputPath || path.join('./data/audio', `speech_${Date.now()}.mp3`);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, Buffer.from(audioBuffer));
        
        return {
          success: true,
          audioPath: outputPath,
          audioBuffer
        };
      }

      return {
        success: true,
        audioBuffer
      };
    } catch (error) {
      logger.error('Text-to-speech failed:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default new TextToSpeech();
