import { createLogger } from '../utils/logger.js';

const logger = createLogger('LanguageDetector');

class LanguageDetector {
  constructor() {
    this.supportedLanguages = {
      'en': { name: 'English', patterns: /\b(the|is|are|was|were|have|has)\b/i },
      'bn': { name: 'Bangla', patterns: /[\u0980-\u09FF]/ },
      'es': { name: 'Spanish', patterns: /\b(el|la|los|las|es|son|está|están)\b/i }
    };
  }

  detect(text) {
    logger.info('Detecting language');

    for (const [code, lang] of Object.entries(this.supportedLanguages)) {
      if (lang.patterns.test(text)) {
        logger.info(`Detected language: ${lang.name}`);
        return code;
      }
    }

    logger.info('Defaulting to English');
    return 'en';
  }

  getSupportedLanguages() {
    return Object.entries(this.supportedLanguages).map(([code, lang]) => ({
      code,
      name: lang.name
    }));
  }

  isSupported(languageCode) {
    return languageCode in this.supportedLanguages;
  }
}

export default new LanguageDetector();
