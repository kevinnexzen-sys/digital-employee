import { createLogger } from '../utils/logger.js';
import database from '../memory/database.js';

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
      
      // Load events from persistent storage
      const stored = await database.getSetting('calendar_events');
      if (stored) {
        this.events = stored;
        logger.info(`Loaded ${this.events.length} calendar events from storage`);
      }
      
      this.isInitialized = true;
      logger.info('Calendar Integration initialized');
    } catch (error) {
      logger.error('Failed to initialize Calendar Integration:', error.message);
      throw error;
    }
  }

  async save() {
    try {
      await database.saveSetting('calendar_events', this.events);
    } catch (error) {
      logger.error('Failed to save calendar events:', error.message);
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
      await this.save();

      return {
        success: true,
        event
      };
    } catch (error) {
      logger.error('Failed to create event:', error.message);
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
      logger.error('Failed to get events:', error.message);
      throw error;
    }
  }

  async updateEvent(eventId, updates) {
    await this.ensureInitialized();

    try {
      const event = this.events.find(e => e.id === eventId);
      if (!event) {
        throw new Error(`Event ${eventId} not found`);
      }

      Object.assign(event, updates);
      await this.save();

      logger.info(`Updated event: ${eventId}`);

      return {
        success: true,
        event
      };
    } catch (error) {
      logger.error('Failed to update event:', error.message);
      throw error;
    }
  }

  async deleteEvent(eventId) {
    await this.ensureInitialized();

    try {
      const index = this.events.findIndex(e => e.id === eventId);
      if (index === -1) {
        throw new Error(`Event ${eventId} not found`);
      }

      this.events.splice(index, 1);
      await this.save();

      logger.info(`Deleted event: ${eventId}`);

      return {
        success: true
      };
    } catch (error) {
      logger.error('Failed to delete event:', error.message);
      throw error;
    }
  }

  async getUpcomingEvents(limit = 10) {
    await this.ensureInitialized();

    try {
      const now = new Date();
      const upcoming = this.events
        .filter(event => new Date(event.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
        .slice(0, limit);

      return {
        success: true,
        events: upcoming
      };
    } catch (error) {
      logger.error('Failed to get upcoming events:', error.message);
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
