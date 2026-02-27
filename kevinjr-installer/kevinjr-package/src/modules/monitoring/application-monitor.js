/**
 * KevinJr Application Performance Monitor
 * Real-time APM with performance tracking and optimization
 */

const winston = require('winston');
const { performance } = require('perf_hooks');

class ApplicationMonitor {
  constructor(config = {}) {
    this.config = config;
    this.logger = null;
    
    // Performance metrics storage
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rate: 0
      },
      responseTime: {
        current: 0,
        average: 0,
        p95: 0,
        p99: 0,
        min: Infinity,
        max: 0
      },
      throughput: {
        current: 0,
        peak: 0,
        average: 0
      },
      errors: {
        total: 0,
        rate: 0,
        types: {}
      },
      uptime: {
        start: Date.now(),
        current: 0,
        percentage: 100
      }
    };
    
    // Performance history for trending
    this.history = {
      responseTime: [],
      throughput: [],
      errorRate: [],
      timestamps: []
    };
    
    // Transaction tracking
    this.activeTransactions = new Map();
    this.completedTransactions = [];
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('📊 Application Monitor initializing...');
    
    // Start metrics collection
    this._startMetricsCollection();
    
    this.logger.info('✅ Application Monitor ready');
    return true;
  }

  /**
   * Start tracking a transaction
   */
  startTransaction(name, metadata = {}) {
    const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = {
      id: transactionId,
      name,
      startTime: performance.now(),
      metadata,
      spans: [],
      status: 'active'
    };
    
    this.activeTransactions.set(transactionId, transaction);
    
    return transactionId;
  }

  /**
   * End a transaction
   */
  endTransaction(transactionId, status = 'success', error = null) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (!transaction) {
      this.logger.warn(`Transaction not found: ${transactionId}`);
      return;
    }
    
    const endTime = performance.now();
    const duration = endTime - transaction.startTime;
    
    transaction.endTime = endTime;
    transaction.duration = duration;
    transaction.status = status;
    transaction.error = error;
    
    // Update metrics
    this._updateMetrics(transaction);
    
    // Move to completed transactions
    this.activeTransactions.delete(transactionId);
    this.completedTransactions.push(transaction);
    
    // Keep only recent transactions
    if (this.completedTransactions.length > 1000) {
      this.completedTransactions = this.completedTransactions.slice(-1000);
    }
    
    return transaction;
  }

  /**
   * Add a span to a transaction
   */
  addSpan(transactionId, name, operation, duration, metadata = {}) {
    const transaction = this.activeTransactions.get(transactionId);
    
    if (transaction) {
      transaction.spans.push({
        name,
        operation,
        duration,
        metadata,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Record custom metric
   */
  recordMetric(name, value, tags = {}) {
    const metric = {
      name,
      value,
      tags,
      timestamp: Date.now()
    };
    
    // Store custom metrics (in production would send to metrics backend)
    this.logger.debug(`📈 Custom metric: ${name} = ${value}`);
  }

  /**
   * Get current metrics
   */
  async getMetrics() {
    return {
      ...this.metrics,
      activeTransactions: this.activeTransactions.size,
      completedTransactions: this.completedTransactions.length
    };
  }

  /**
   * Get performance summary
   */
  async getSummary(timeRange = '1h') {
    const now = Date.now();
    const timeRangeMs = this._parseTimeRange(timeRange);
    const since = now - timeRangeMs;
    
    // Filter transactions by time range
    const recentTransactions = this.completedTransactions.filter(
      t => t.endTime && (t.startTime + since) >= since
    );
    
    if (recentTransactions.length === 0) {
      return {
        timeRange,
        transactions: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0
      };
    }
    
    // Calculate summary metrics
    const totalTransactions = recentTransactions.length;
    const successfulTransactions = recentTransactions.filter(t => t.status === 'success').length;
    const failedTransactions = totalTransactions - successfulTransactions;
    
    const responseTimes = recentTransactions.map(t => t.duration);
    const averageResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    
    const errorRate = (failedTransactions / totalTransactions) * 100;
    const throughput = totalTransactions / (timeRangeMs / 1000); // transactions per second
    
    return {
      timeRange,
      transactions: totalTransactions,
      successful: successfulTransactions,
      failed: failedTransactions,
      averageResponseTime: Math.round(averageResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      throughput: Math.round(throughput * 100) / 100,
      p95ResponseTime: this._calculatePercentile(responseTimes, 95),
      p99ResponseTime: this._calculatePercentile(responseTimes, 99)
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const recommendations = [];
    const metrics = this.metrics;
    
    // Response time recommendations
    if (metrics.responseTime.average > 1000) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        message: 'High average response time detected',
        action: 'Consider implementing caching, optimizing database queries, or scaling resources',
        metric: 'responseTime',
        current: metrics.responseTime.average,
        target: 500
      });
    }
    
    // Error rate recommendations
    if (metrics.errors.rate > 5) {
      recommendations.push({
        category: 'reliability',
        priority: 'critical',
        message: 'High error rate detected',
        action: 'Investigate error logs and implement better error handling',
        metric: 'errorRate',
        current: metrics.errors.rate,
        target: 1
      });
    }
    
    // Throughput recommendations
    if (metrics.throughput.current < 10) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        message: 'Low throughput detected',
        action: 'Consider optimizing application performance or scaling horizontally',
        metric: 'throughput',
        current: metrics.throughput.current,
        target: 50
      });
    }
    
    // Memory leak detection
    const memoryTrend = this._analyzeMemoryTrend();
    if (memoryTrend === 'increasing') {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        message: 'Potential memory leak detected',
        action: 'Review memory usage patterns and implement proper cleanup',
        metric: 'memory',
        trend: 'increasing'
      });
    }
    
    return recommendations;
  }

  /**
   * Get transaction details
   */
  getTransactionDetails(transactionId) {
    // Check active transactions first
    const activeTransaction = this.activeTransactions.get(transactionId);
    if (activeTransaction) {
      return {
        ...activeTransaction,
        duration: performance.now() - activeTransaction.startTime,
        status: 'active'
      };
    }
    
    // Check completed transactions
    const completedTransaction = this.completedTransactions.find(t => t.id === transactionId);
    return completedTransaction || null;
  }

  /**
   * Get slow transactions
   */
  getSlowTransactions(threshold = 2000, limit = 10) {
    return this.completedTransactions
      .filter(t => t.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        name: t.name,
        duration: Math.round(t.duration),
        timestamp: new Date(t.startTime).toISOString(),
        spans: t.spans.length
      }));
  }

  async healthCheck() {
    return {
      healthy: true,
      monitor: 'application',
      activeTransactions: this.activeTransactions.size,
      completedTransactions: this.completedTransactions.length,
      uptime: Math.round((Date.now() - this.metrics.uptime.start) / 1000),
      metrics: {
        responseTime: this.metrics.responseTime.average,
        errorRate: this.metrics.errors.rate,
        throughput: this.metrics.throughput.current
      }
    };
  }

  async cleanup() {
    this.logger.info('🧹 Application Monitor cleanup...');
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.logger.info('✅ Application Monitor cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [AppMonitor] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _startMetricsCollection() {
    // Update metrics every 10 seconds
    this.metricsInterval = setInterval(() => {
      this._updateAggregateMetrics();
      this._updateHistory();
    }, 10000);
  }

  _updateMetrics(transaction) {
    // Update request counts
    this.metrics.requests.total++;
    
    if (transaction.status === 'success') {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
      this.metrics.errors.total++;
      
      // Track error types
      const errorType = transaction.error?.type || 'unknown';
      this.metrics.errors.types[errorType] = (this.metrics.errors.types[errorType] || 0) + 1;
    }
    
    // Update response time metrics
    const duration = transaction.duration;
    this.metrics.responseTime.current = duration;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);
    
    // Calculate running average
    const totalRequests = this.metrics.requests.total;
    this.metrics.responseTime.average = 
      ((this.metrics.responseTime.average * (totalRequests - 1)) + duration) / totalRequests;
  }

  _updateAggregateMetrics() {
    // Calculate error rate
    const totalRequests = this.metrics.requests.total;
    if (totalRequests > 0) {
      this.metrics.errors.rate = (this.metrics.errors.total / totalRequests) * 100;
    }
    
    // Calculate request rate (requests per second)
    const uptime = (Date.now() - this.metrics.uptime.start) / 1000;
    this.metrics.requests.rate = totalRequests / uptime;
    
    // Update uptime
    this.metrics.uptime.current = uptime;
    
    // Calculate throughput based on recent activity
    const recentTransactions = this.completedTransactions.slice(-100);
    if (recentTransactions.length > 1) {
      const timeSpan = (recentTransactions[recentTransactions.length - 1].endTime - 
                      recentTransactions[0].startTime) / 1000;
      this.metrics.throughput.current = recentTransactions.length / timeSpan;
      this.metrics.throughput.peak = Math.max(this.metrics.throughput.peak, this.metrics.throughput.current);
    }
    
    // Calculate percentiles
    const recentResponseTimes = recentTransactions.map(t => t.duration);
    if (recentResponseTimes.length > 0) {
      this.metrics.responseTime.p95 = this._calculatePercentile(recentResponseTimes, 95);
      this.metrics.responseTime.p99 = this._calculatePercentile(recentResponseTimes, 99);
    }
  }

  _updateHistory() {
    const now = Date.now();
    
    // Add current metrics to history
    this.history.responseTime.push(this.metrics.responseTime.average);
    this.history.throughput.push(this.metrics.throughput.current);
    this.history.errorRate.push(this.metrics.errors.rate);
    this.history.timestamps.push(now);
    
    // Keep only last 100 data points (about 16 minutes at 10s intervals)
    const maxPoints = 100;
    if (this.history.timestamps.length > maxPoints) {
      this.history.responseTime = this.history.responseTime.slice(-maxPoints);
      this.history.throughput = this.history.throughput.slice(-maxPoints);
      this.history.errorRate = this.history.errorRate.slice(-maxPoints);
      this.history.timestamps = this.history.timestamps.slice(-maxPoints);
    }
  }

  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[Math.max(0, index)]);
  }

  _parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // Default to 1 hour
    
    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit] || units.h);
  }

  _analyzeMemoryTrend() {
    // Analyze memory usage trend over time
    // In production, would track actual memory metrics
    const memoryUsage = process.memoryUsage();
    const currentHeap = memoryUsage.heapUsed;
    
    // Simple trend analysis (would be more sophisticated in production)
    if (!this.lastMemoryCheck) {
      this.lastMemoryCheck = currentHeap;
      return 'stable';
    }
    
    const growth = (currentHeap - this.lastMemoryCheck) / this.lastMemoryCheck;
    this.lastMemoryCheck = currentHeap;
    
    if (growth > 0.1) return 'increasing'; // 10% growth
    if (growth < -0.1) return 'decreasing';
    return 'stable';
  }
}

module.exports = ApplicationMonitor;

