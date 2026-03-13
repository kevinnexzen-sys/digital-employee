import { createLogger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const logger = createLogger('Translator');

class Translator {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = {};
    this.loadTranslations();
  }

  loadTranslations() {
    const languagesDir = path.join(process.cwd(), 'src/i18n/languages');
    
    try {
      const files = fs.readdirSync(languagesDir);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const lang = file.replace('.json', '');
          const filePath = path.join(languagesDir, file);
          this.translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          logger.info(`Loaded translations for: ${lang}`);
        }
      });
    } catch (error) {
      logger.error('Failed to load translations:', error);
    }
  }

  setLanguage(languageCode) {
    if (this.translations[languageCode]) {
      this.currentLanguage = languageCode;
      logger.info(`Language set to: ${languageCode}`);
      return true;
    }
    
    logger.warn(`Language not found: ${languageCode}`);
    return false;
  }

  translate(key, params = {}) {
    const translation = this.translations[this.currentLanguage];
    
    if (!translation || !translation[key]) {
      logger.warn(`Translation not found: ${key} (${this.currentLanguage})`);
      return key;
    }

    let text = translation[key];

    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });

    return text;
  }

  t(key, params) {
    return this.translate(key, params);
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getSupportedLanguages() {
    return Object.keys(this.translations);
  }
}

export default new Translator();
