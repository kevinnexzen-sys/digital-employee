import { createLogger } from '../utils/logger.js';

const logger = createLogger('LipSync');

class LipSync {
  constructor() {
    this.isActive = false;
    this.currentPhoneme = null;
  }

  start(audioData) {
    this.isActive = true;
    logger.info('Lip sync started');
    
    this.analyzeAudio(audioData);
  }

  analyzeAudio(audioData) {
    const phonemes = this.extractPhonemes(audioData);
    
    phonemes.forEach((phoneme, index) => {
      setTimeout(() => {
        this.currentPhoneme = phoneme;
        this.updateMouth(phoneme);
      }, index * 100);
    });
  }

  extractPhonemes(audioData) {
    return ['A', 'E', 'I', 'O', 'U', 'M', 'B', 'P'];
  }

  updateMouth(phoneme) {
    const mouthShapes = {
      'A': { openness: 0.8, width: 0.6 },
      'E': { openness: 0.5, width: 0.8 },
      'I': { openness: 0.3, width: 0.9 },
      'O': { openness: 0.7, width: 0.4 },
      'U': { openness: 0.4, width: 0.3 },
      'M': { openness: 0.0, width: 0.5 },
      'B': { openness: 0.0, width: 0.5 },
      'P': { openness: 0.0, width: 0.5 }
    };

    const shape = mouthShapes[phoneme] || { openness: 0.2, width: 0.5 };
    logger.debug(`Mouth shape: ${phoneme}`, shape);
    
    return shape;
  }

  stop() {
    this.isActive = false;
    this.currentPhoneme = null;
    logger.info('Lip sync stopped');
  }

  getState() {
    return {
      isActive: this.isActive,
      currentPhoneme: this.currentPhoneme
    };
  }
}

export default new LipSync();
