/**
 * KevinJr User Analytics
 * User behavior tracking and business intelligence
 */

const winston = require('winston');

class UserAnalytics {
  constructor(config = {}) {
    this.config = config;
    this.logger = null;
    
    // User tracking data
    this.users = {
      active: new Set(),
      sessions: new Map(),
      total: 0,
      new: 0,
      returning: 0
    };
    
    // Event tracking
    this.events = [];
    this.pageViews = [];
    this.conversions = [];
    
    // Business metrics
    this.businessMetrics = {
      revenue: 0,
      conversions: 0,
      conversionRate: 0,
      averageSessionDuration: 0,
      bounceRate: 0,
      retentionRate: 0
    };
    
    // User segments
    this.segments = {
      new: new Set(),
      returning: new Set(),
      premium: new Set(),
      churned: new Set()
    };
    
    // Funnel tracking
    this.funnels = {
      signup: {
        steps: ['landing', 'signup_form', 'verification', 'complete'],
        data: {}
      },
      purchase: {
        steps: ['product_view', 'add_to_cart', 'checkout', 'payment', 'complete'],
        data: {}
      }
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('👥 User Analytics initializing...');
    
    // Start analytics collection
    this._startAnalyticsCollection();
    
    this.logger.info('✅ User Analytics ready');
    return true;
  }

  /**
   * Track user session start
   */
  startSession(userId, metadata = {}) {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      userId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: [],
      metadata,
      status: 'active'
    };
    
    this.users.sessions.set(sessionId, session);
    this.users.active.add(userId);
    
    // Track user type
    if (!this._hasUserVisitedBefore(userId)) {
      this.users.new++;
      this.segments.new.add(userId);
    } else {
      this.users.returning++;
      this.segments.returning.add(userId);
    }
    
    this.users.total++;
    
    this.logger.debug(`👤 Session started: ${sessionId} for user ${userId}`);
    
    return sessionId;
  }

  /**
   * End user session
   */
  endSession(sessionId) {
    const session = this.users.sessions.get(sessionId);
    
    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return;
    }
    
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.status = 'ended';
    
    // Remove from active users
    this.users.active.delete(session.userId);
    
    // Update business metrics
    this._updateSessionMetrics(session);
    
    this.logger.debug(`👤 Session ended: ${sessionId}, duration: ${session.duration}ms`);
    
    return session;
  }

  /**
   * Track page view
   */
  trackPageView(sessionId, page, metadata = {}) {
    const session = this.users.sessions.get(sessionId);
    
    if (!session) {
      this.logger.warn(`Session not found for page view: ${sessionId}`);
      return;
    }
    
    const pageView = {
      sessionId,
      userId: session.userId,
      page,
      timestamp: Date.now(),
      metadata
    };
    
    this.pageViews.push(pageView);
    session.pageViews++;
    session.lastActivity = Date.now();
    
    // Keep only recent page views
    if (this.pageViews.length > 10000) {
      this.pageViews = this.pageViews.slice(-10000);
    }
    
    this.logger.debug(`📄 Page view: ${page} by user ${session.userId}`);
  }

  /**
   * Track custom event
   */
  trackEvent(sessionId, eventName, properties = {}) {
    const session = this.users.sessions.get(sessionId);
    
    if (!session) {
      this.logger.warn(`Session not found for event: ${sessionId}`);
      return;
    }
    
    const event = {
      sessionId,
      userId: session.userId,
      name: eventName,
      properties,
      timestamp: Date.now()
    };
    
    this.events.push(event);
    session.events.push(event);
    session.lastActivity = Date.now();
    
    // Track funnel events
    this._trackFunnelEvent(event);
    
    // Track conversions
    if (this._isConversionEvent(eventName)) {
      this._trackConversion(event);
    }
    
    // Keep only recent events
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
    
    this.logger.debug(`📊 Event: ${eventName} by user ${session.userId}`);
  }

  /**
   * Track conversion
   */
  trackConversion(sessionId, conversionType, value = 0, metadata = {}) {
    const session = this.users.sessions.get(sessionId);
    
    if (!session) {
      this.logger.warn(`Session not found for conversion: ${sessionId}`);
      return;
    }
    
    const conversion = {
      sessionId,
      userId: session.userId,
      type: conversionType,
      value,
      timestamp: Date.now(),
      metadata
    };
    
    this.conversions.push(conversion);
    
    // Update business metrics
    this.businessMetrics.conversions++;
    this.businessMetrics.revenue += value;
    
    this.logger.info(`💰 Conversion: ${conversionType} = $${value} by user ${session.userId}`);
  }

  /**
   * Get analytics data
   */
  async getAnalytics(options = {}) {
    const {
      metric = 'all',
      timeRange = '24h',
      segment = 'all'
    } = options;
    
    const timeRangeMs = this._parseTimeRange(timeRange);
    const since = Date.now() - timeRangeMs;
    
    const analytics = {
      timeRange,
      segment,
      timestamp: new Date().toISOString()
    };
    
    if (metric === 'all' || metric === 'users') {
      analytics.users = this._getUserAnalytics(since, segment);
    }
    
    if (metric === 'all' || metric === 'sessions') {
      analytics.sessions = this._getSessionAnalytics(since, segment);
    }
    
    if (metric === 'all' || metric === 'events') {
      analytics.events = this._getEventAnalytics(since, segment);
    }
    
    if (metric === 'all' || metric === 'conversions') {
      analytics.conversions = this._getConversionAnalytics(since, segment);
    }
    
    if (metric === 'all' || metric === 'funnels') {
      analytics.funnels = this._getFunnelAnalytics(since, segment);
    }
    
    return {
      success: true,
      analytics
    };
  }

  /**
   * Get business metrics
   */
  async getBusinessMetrics() {
    // Calculate real-time business metrics
    const activeSessions = Array.from(this.users.sessions.values()).filter(s => s.status === 'active');
    const totalSessions = this.users.sessions.size;
    
    // Calculate conversion rate
    const conversionRate = totalSessions > 0 ? 
      (this.businessMetrics.conversions / totalSessions) * 100 : 0;
    
    // Calculate average session duration
    const completedSessions = Array.from(this.users.sessions.values()).filter(s => s.duration);
    const avgSessionDuration = completedSessions.length > 0 ?
      completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length : 0;
    
    // Calculate bounce rate (sessions with only 1 page view)
    const bouncedSessions = completedSessions.filter(s => s.pageViews <= 1).length;
    const bounceRate = completedSessions.length > 0 ?
      (bouncedSessions / completedSessions.length) * 100 : 0;
    
    return {
      activeUsers: this.users.active.size,
      totalSessions: totalSessions,
      newUsers: this.users.new,
      returningUsers: this.users.returning,
      conversions: this.businessMetrics.conversions,
      revenue: this.businessMetrics.revenue,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageSessionDuration: Math.round(avgSessionDuration / 1000), // seconds
      bounceRate: Math.round(bounceRate * 100) / 100,
      pageViews: this.pageViews.length,
      events: this.events.length
    };
  }

  /**
   * Get user segments
   */
  getUserSegments() {
    return {
      new: this.segments.new.size,
      returning: this.segments.returning.size,
      premium: this.segments.premium.size,
      churned: this.segments.churned.size,
      total: this.users.total
    };
  }

  /**
   * Get funnel analysis
   */
  getFunnelAnalysis(funnelName = 'signup') {
    const funnel = this.funnels[funnelName];
    
    if (!funnel) {
      return {
        success: false,
        error: `Funnel not found: ${funnelName}`
      };
    }
    
    const analysis = {
      name: funnelName,
      steps: funnel.steps,
      data: {},
      conversionRates: {},
      dropoffRates: {}
    };
    
    // Calculate step completion and conversion rates
    let previousStepCount = 0;
    
    funnel.steps.forEach((step, index) => {
      const stepCount = this._getStepCompletions(funnelName, step);
      analysis.data[step] = stepCount;
      
      if (index === 0) {
        analysis.conversionRates[step] = 100; // First step is 100%
      } else {
        const conversionRate = previousStepCount > 0 ? 
          (stepCount / previousStepCount) * 100 : 0;
        analysis.conversionRates[step] = Math.round(conversionRate * 100) / 100;
        
        const dropoffRate = 100 - conversionRate;
        analysis.dropoffRates[step] = Math.round(dropoffRate * 100) / 100;
      }
      
      previousStepCount = stepCount;
    });
    
    return {
      success: true,
      analysis
    };
  }

  /**
   * Get summary for time range
   */
  async getSummary(timeRange = '7d') {
    const timeRangeMs = this._parseTimeRange(timeRange);
    const since = Date.now() - timeRangeMs;
    
    // Filter data by time range
    const recentSessions = Array.from(this.users.sessions.values())
      .filter(s => s.startTime >= since);
    
    const recentEvents = this.events.filter(e => e.timestamp >= since);
    const recentConversions = this.conversions.filter(c => c.timestamp >= since);
    const recentPageViews = this.pageViews.filter(pv => pv.timestamp >= since);
    
    return {
      timeRange,
      sessions: recentSessions.length,
      events: recentEvents.length,
      conversions: recentConversions.length,
      pageViews: recentPageViews.length,
      revenue: recentConversions.reduce((sum, c) => sum + c.value, 0),
      uniqueUsers: new Set(recentSessions.map(s => s.userId)).size
    };
  }

  async healthCheck() {
    return {
      healthy: true,
      analytics: 'user',
      activeSessions: this.users.sessions.size,
      activeUsers: this.users.active.size,
      totalEvents: this.events.length,
      totalPageViews: this.pageViews.length,
      totalConversions: this.conversions.length
    };
  }

  async cleanup() {
    this.logger.info('🧹 User Analytics cleanup...');
    
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }
    
    this.logger.info('✅ User Analytics cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [UserAnalytics] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _startAnalyticsCollection() {
    // Update analytics every 60 seconds
    this.analyticsInterval = setInterval(() => {
      this._updateBusinessMetrics();
      this._cleanupOldData();
    }, 60000);
  }

  _hasUserVisitedBefore(userId) {
    // Check if user has any previous sessions
    return Array.from(this.users.sessions.values())
      .some(session => session.userId === userId && session.id !== this.users.sessions.get(userId)?.id);
  }

  _updateSessionMetrics(session) {
    // Update average session duration
    const completedSessions = Array.from(this.users.sessions.values())
      .filter(s => s.duration);
    
    if (completedSessions.length > 0) {
      const totalDuration = completedSessions.reduce((sum, s) => sum + s.duration, 0);
      this.businessMetrics.averageSessionDuration = totalDuration / completedSessions.length;
    }
    
    // Update bounce rate
    const bouncedSessions = completedSessions.filter(s => s.pageViews <= 1).length;
    this.businessMetrics.bounceRate = completedSessions.length > 0 ?
      (bouncedSessions / completedSessions.length) * 100 : 0;
  }

  _trackFunnelEvent(event) {
    // Track events that are part of defined funnels
    Object.entries(this.funnels).forEach(([funnelName, funnel]) => {
      if (funnel.steps.includes(event.name)) {
        if (!funnel.data[event.userId]) {
          funnel.data[event.userId] = {};
        }
        funnel.data[event.userId][event.name] = event.timestamp;
      }
    });
  }

  _isConversionEvent(eventName) {
    const conversionEvents = [
      'purchase_complete',
      'signup_complete',
      'subscription_start',
      'trial_start',
      'download_complete'
    ];
    
    return conversionEvents.includes(eventName);
  }

  _trackConversion(event) {
    const conversionValue = event.properties.value || 0;
    
    this.trackConversion(
      event.sessionId,
      event.name,
      conversionValue,
      event.properties
    );
  }

  _getUserAnalytics(since, segment) {
    const filteredSessions = this._filterSessionsBySegment(
      Array.from(this.users.sessions.values()).filter(s => s.startTime >= since),
      segment
    );
    
    const uniqueUsers = new Set(filteredSessions.map(s => s.userId));
    
    return {
      total: uniqueUsers.size,
      new: filteredSessions.filter(s => this.segments.new.has(s.userId)).length,
      returning: filteredSessions.filter(s => this.segments.returning.has(s.userId)).length,
      active: this.users.active.size
    };
  }

  _getSessionAnalytics(since, segment) {
    const filteredSessions = this._filterSessionsBySegment(
      Array.from(this.users.sessions.values()).filter(s => s.startTime >= since),
      segment
    );
    
    const completedSessions = filteredSessions.filter(s => s.duration);
    const avgDuration = completedSessions.length > 0 ?
      completedSessions.reduce((sum, s) => sum + s.duration, 0) / completedSessions.length : 0;
    
    return {
      total: filteredSessions.length,
      completed: completedSessions.length,
      active: filteredSessions.filter(s => s.status === 'active').length,
      averageDuration: Math.round(avgDuration / 1000), // seconds
      totalPageViews: filteredSessions.reduce((sum, s) => sum + s.pageViews, 0)
    };
  }

  _getEventAnalytics(since, segment) {
    const filteredEvents = this.events.filter(e => e.timestamp >= since);
    
    // Count events by type
    const eventCounts = {};
    filteredEvents.forEach(event => {
      eventCounts[event.name] = (eventCounts[event.name] || 0) + 1;
    });
    
    return {
      total: filteredEvents.length,
      unique: Object.keys(eventCounts).length,
      byType: eventCounts,
      topEvents: Object.entries(eventCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    };
  }

  _getConversionAnalytics(since, segment) {
    const filteredConversions = this.conversions.filter(c => c.timestamp >= since);
    
    const totalValue = filteredConversions.reduce((sum, c) => sum + c.value, 0);
    const avgValue = filteredConversions.length > 0 ? totalValue / filteredConversions.length : 0;
    
    // Count conversions by type
    const conversionCounts = {};
    filteredConversions.forEach(conversion => {
      conversionCounts[conversion.type] = (conversionCounts[conversion.type] || 0) + 1;
    });
    
    return {
      total: filteredConversions.length,
      totalValue: Math.round(totalValue * 100) / 100,
      averageValue: Math.round(avgValue * 100) / 100,
      byType: conversionCounts
    };
  }

  _getFunnelAnalytics(since, segment) {
    const funnelAnalytics = {};
    
    Object.keys(this.funnels).forEach(funnelName => {
      funnelAnalytics[funnelName] = this.getFunnelAnalysis(funnelName);
    });
    
    return funnelAnalytics;
  }

  _getStepCompletions(funnelName, step) {
    const funnel = this.funnels[funnelName];
    if (!funnel || !funnel.data) return 0;
    
    return Object.values(funnel.data).filter(userData => userData[step]).length;
  }

  _filterSessionsBySegment(sessions, segment) {
    if (segment === 'all') return sessions;
    
    return sessions.filter(session => {
      switch (segment) {
        case 'new':
          return this.segments.new.has(session.userId);
        case 'returning':
          return this.segments.returning.has(session.userId);
        case 'premium':
          return this.segments.premium.has(session.userId);
        default:
          return true;
      }
    });
  }

  _parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default to 24 hours
    
    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit] || units.h);
  }

  _updateBusinessMetrics() {
    // Recalculate business metrics
    const totalSessions = this.users.sessions.size;
    
    if (totalSessions > 0) {
      this.businessMetrics.conversionRate = 
        (this.businessMetrics.conversions / totalSessions) * 100;
    }
  }

  _cleanupOldData() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Clean up old events
    this.events = this.events.filter(e => e.timestamp > oneWeekAgo);
    
    // Clean up old page views
    this.pageViews = this.pageViews.filter(pv => pv.timestamp > oneWeekAgo);
    
    // Clean up old conversions
    this.conversions = this.conversions.filter(c => c.timestamp > oneWeekAgo);
    
    // Clean up old sessions
    const sessionsToKeep = new Map();
    for (const [sessionId, session] of this.users.sessions) {
      if (session.startTime > oneWeekAgo) {
        sessionsToKeep.set(sessionId, session);
      }
    }
    this.users.sessions = sessionsToKeep;
  }
}

module.exports = UserAnalytics;

