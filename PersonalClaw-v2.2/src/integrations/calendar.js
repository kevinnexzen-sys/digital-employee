import { createLogger } from '../utils/logger.js';

const logger = createLogger('Calendar');

class CalendarIntegration {
  constructor() {
    this.isInitialized = false;
    this.events = [];
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Calendar Integration...');
      this.isInitialized = true;
      logger.info('Calendar Integration initialized');
    } catch (error) {
      logger.error('Failed to initialize Calendar Integration:', error);
      throw error;
    }
  }

  async createEvent(title, startTime, endTime, description = '') {
    await this.ensureInitialized();

    try {
      logger.info(`Creating calendar event: ${title}`);

      const event = {
        id: `event_${Date.now()}`,
        title,
        startTime,
        endTime,
        description,
        createdAt: new Date().toISOString()
      };

      this.events.push(event);

      return {
        success: true,
        event
      };
    } catch (error) {
      logger.error('Failed to create event:', error);
      throw error;
    }
  }

  async getEvents(startDate, endDate) {
    await this.ensureInitialized();

    try {
      const filtered = this.events.filter(event => {
        const eventStart = new Date(event.startTime);
        return eventStart >= startDate && eventStart <= endDate;
      });

      return {
        success: true,
        events: filtered
      };
    } catch (error) {
      logger.error('Failed to get events:', error);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

export default new CalendarIntegration();
