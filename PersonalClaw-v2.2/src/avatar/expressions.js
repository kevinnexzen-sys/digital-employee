import { createLogger } from '../utils/logger.js';

const logger = createLogger('Expressions');

class ExpressionManager {
  constructor() {
    this.expressions = {
      neutral: {
        eyes: { openness: 0.8, direction: 'center' },
        eyebrows: { position: 0.5, angle: 0 },
        mouth: { openness: 0.0, curve: 0.0 }
      },
      happy: {
        eyes: { openness: 0.6, direction: 'center' },
        eyebrows: { position: 0.6, angle: 5 },
        mouth: { openness: 0.3, curve: 0.8 }
      },
      thinking: {
        eyes: { openness: 0.7, direction: 'up-right' },
        eyebrows: { position: 0.6, angle: -5 },
        mouth: { openness: 0.1, curve: -0.2 }
      },
      speaking: {
        eyes: { openness: 0.8, direction: 'center' },
        eyebrows: { position: 0.5, angle: 0 },
        mouth: { openness: 0.5, curve: 0.2 }
      },
      listening: {
        eyes: { openness: 0.9, direction: 'center' },
        eyebrows: { position: 0.6, angle: 3 },
        mouth: { openness: 0.0, curve: 0.1 }
      }
    };
  }

  getExpression(name) {
    return this.expressions[name] || this.expressions.neutral;
  }

  getAllExpressions() {
    return Object.keys(this.expressions);
  }

  blendExpressions(expr1, expr2, weight) {
    const e1 = this.getExpression(expr1);
    const e2 = this.getExpression(expr2);

    return {
      eyes: {
        openness: e1.eyes.openness * (1 - weight) + e2.eyes.openness * weight,
        direction: weight > 0.5 ? e2.eyes.direction : e1.eyes.direction
      },
      eyebrows: {
        position: e1.eyebrows.position * (1 - weight) + e2.eyebrows.position * weight,
        angle: e1.eyebrows.angle * (1 - weight) + e2.eyebrows.angle * weight
      },
      mouth: {
        openness: e1.mouth.openness * (1 - weight) + e2.mouth.openness * weight,
        curve: e1.mouth.curve * (1 - weight) + e2.mouth.curve * weight
      }
    };
  }
}

export default new ExpressionManager();
