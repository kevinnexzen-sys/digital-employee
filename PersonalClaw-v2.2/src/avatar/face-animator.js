import { createLogger } from '../utils/logger.js';

const logger = createLogger('FaceAnimator');

class FaceAnimator {
  constructor() {
    this.currentExpression = 'neutral';
    this.isSpeaking = false;
    this.animationFrame = null;
  }

  setExpression(expression) {
    const validExpressions = ['neutral', 'happy', 'thinking', 'speaking', 'listening'];
    
    if (validExpressions.includes(expression)) {
      this.currentExpression = expression;
      logger.info(`Expression set to: ${expression}`);
      return true;
    }
    
    logger.warn(`Invalid expression: ${expression}`);
    return false;
  }

  startSpeaking() {
    this.isSpeaking = true;
    this.setExpression('speaking');
    logger.info('Started speaking animation');
  }

  stopSpeaking() {
    this.isSpeaking = false;
    this.setExpression('neutral');
    logger.info('Stopped speaking animation');
  }

  startListening() {
    this.setExpression('listening');
    logger.info('Started listening animation');
  }

  startThinking() {
    this.setExpression('thinking');
    logger.info('Started thinking animation');
  }

  getState() {
    return {
      expression: this.currentExpression,
      isSpeaking: this.isSpeaking
    };
  }
}

export default new FaceAnimator();
