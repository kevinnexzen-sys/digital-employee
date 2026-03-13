import { createLogger } from '../utils/logger.js';
import languageDetector from './language-detector.js';

const logger = createLogger('MultiLanguage');

class MultiLanguageSupport {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {
      en: {
        greeting: 'Hello! How can I help you?',
        listening: 'I am listening...',
        processing: 'Processing your request...',
        error: 'Sorry, I encountered an error.'
      },
      bn: {
        greeting: 'হ্যালো! আমি কিভাবে আপনাকে সাহায্য করতে পারি?',
        listening: 'আমি শুনছি...',
        processing: 'আপনার অনুরোধ প্রক্রিয়া করছি...',
        error: 'দুঃখিত, একটি ত্রুটি হয়েছে।'
      },
      es: {
        greeting: '¡Hola! ¿Cómo puedo ayudarte?',
        listening: 'Estoy escuchando...',
        processing: 'Procesando tu solicitud...',
        error: 'Lo siento, encontré un error.'
      }
    };
  }

  setLanguage(languageCode) {
    if (languageDetector.isSupported(languageCode)) {
      this.currentLanguage = languageCode;
      logger.info(`Language set to: ${languageCode}`);
      return true;
    }
    logger.warn(`Unsupported language: ${languageCode}`);
    return false;
  }

  translate(key) {
    const translation = this.translations[this.currentLanguage];
    return translation && translation[key] ? translation[key] : this.translations.en[key];
  }

  detectAndSet(text) {
    const detected = languageDetector.detect(text);
    this.setLanguage(detected);
    return detected;
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getSupportedLanguages() {
    return languageDetector.getSupportedLanguages();
  }
}

export default new MultiLanguageSupport();
