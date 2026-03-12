/**
 * KevinJr Cost Optimizer
 * Cloud resource cost optimization and management
 */

const winston = require('winston');

class CostOptimizer {
  constructor(config = {}) {
    this.config = config;
    this.logger = null;
    
    // Cost tracking data
    this.costs = {
      current: {
        total: 0,
        byService: {},
        byRegion: {},
        byEnvironment: {}
      },
      historical: [],
      projections: {},
      budgets: {},
      alerts: []
    };
    
    // Resource utilization tracking
    this.utilization = {
      compute: {},
      storage: {},
      network: {},
      database: {}
    };
    
    // Optimization recommendations
    this.recommendations = [];
    
    // Cost optimization rules
    this.optimizationRules = {
      'idle-resources': {
        name: 'Idle Resource Detection',
        description: 'Identify and recommend removal of idle resources',
        threshold: 5, // % utilization
        savings: 'high'
      },
      'oversized-instances': {
        name: 'Oversized Instance Detection',
        description: 'Identify instances that can be downsized',
        threshold: 30, // % utilization
        savings: 'medium'
      },
      'unused-storage': {
        name: 'Unused Storage Detection',
        description: 'Identify unused storage volumes',
        threshold: 1, // % utilization
        savings: 'medium'
      },
      'reserved-instances': {
        name: 'Reserved Instance Opportunities',
        description: 'Recommend reserved instances for stable workloads',
        threshold: 80, // % uptime
        savings: 'high'
      },
      'spot-instances': {
        name: 'Spot Instance Opportunities',
        description: 'Recommend spot instances for fault-tolerant workloads',
        threshold: 50, // % fault tolerance
        savings: 'high'
      }
    };
    
    // Cloud provider pricing (simplified)
    this.pricing = {
      aws: {
        ec2: {
          't3.micro': 0.0104,   // per hour
          't3.small': 0.0208,
          't3.medium': 0.0416,
          't3.large': 0.0832
        },
        rds: {
          'db.t3.micro': 0.017,
          'db.t3.small': 0.034
        },
        s3: {
          'standard': 0.023,    // per GB/month
          'ia': 0.0125,
          'glacier': 0.004
        }
      },
      gcp: {
        compute: {
          'e2-micro': 0.008,
          'e2-small': 0.016,
          'e2-medium': 0.032
        },
        storage: {
          'standard': 0.020,
          'nearline': 0.010,
          'coldline': 0.004
        }
      },
      azure: {
        vm: {
          'B1s': 0.0104,
          'B1ms': 0.0208,
          'B2s': 0.0416
        },
        storage: {
          'hot': 0.0184,
          'cool': 0.0100,
          'archive': 0.00099
        }
      }
    };
    
    this._setupLogger();
  }

  async initialize() {
    this.logger.info('💰 Cost Optimizer initializing...');
    
    // Start cost monitoring
    this._startCostMonitoring();
    
    this.logger.info('✅ Cost Optimizer ready');
    return true;
  }

  /**
   * Track resource cost
   */
  trackCost(service, amount, metadata = {}) {
    const cost = {
      service,
      amount,
      timestamp: Date.now(),
      metadata
    };
    
    // Update current costs
    this.costs.current.total += amount;
    this.costs.current.byService[service] = 
      (this.costs.current.byService[service] || 0) + amount;
    
    if (metadata.region) {
      this.costs.current.byRegion[metadata.region] = 
        (this.costs.current.byRegion[metadata.region] || 0) + amount;
    }
    
    if (metadata.environment) {
      this.costs.current.byEnvironment[metadata.environment] = 
        (this.costs.current.byEnvironment[metadata.environment] || 0) + amount;
    }
    
    // Add to historical data
    this.costs.historical.push(cost);
    
    // Keep only recent history
    if (this.costs.historical.length > 10000) {
      this.costs.historical = this.costs.historical.slice(-10000);
    }
    
    this.logger.debug(`💰 Cost tracked: ${service} = $${amount}`);
  }

  /**
   * Track resource utilization
   */
  trackUtilization(resourceType, resourceId, utilization, metadata = {}) {
    if (!this.utilization[resourceType]) {
      this.utilization[resourceType] = {};
    }
    
    this.utilization[resourceType][resourceId] = {
      utilization,
      timestamp: Date.now(),
      metadata
    };
    
    // Check for optimization opportunities
    this._checkOptimizationOpportunities(resourceType, resourceId, utilization, metadata);
  }

  /**
   * Set budget alert
   */
  setBudget(name, amount, period = 'monthly', alertThreshold = 80) {
    const budget = {
      name,
      amount,
      period,
      alertThreshold,
      spent: 0,
      remaining: amount,
      created: Date.now()
    };
    
    this.costs.budgets[name] = budget;
    
    this.logger.info(`💰 Budget set: ${name} = $${amount}/${period}`);
    
    return budget;
  }

  /**
   * Get cost analysis
   */
  async getCostAnalysis(options = {}) {
    const {
      service = 'all',
      timeRange = '30d',
      breakdown = 'service'
    } = options;
    
    const timeRangeMs = this._parseTimeRange(timeRange);
    const since = Date.now() - timeRangeMs;
    
    // Filter historical costs by time range
    const recentCosts = this.costs.historical.filter(c => c.timestamp >= since);
    
    const analysis = {
      timeRange,
      breakdown,
      timestamp: new Date().toISOString(),
      total: 0,
      breakdown_data: {},
      trends: {},
      projections: {}
    };
    
    // Calculate total and breakdown
    recentCosts.forEach(cost => {
      if (service === 'all' || cost.service === service) {
        analysis.total += cost.amount;
        
        let breakdownKey;
        switch (breakdown) {
          case 'service':
            breakdownKey = cost.service;
            break;
          case 'region':
            breakdownKey = cost.metadata.region || 'unknown';
            break;
          case 'environment':
            breakdownKey = cost.metadata.environment || 'unknown';
            break;
          default:
            breakdownKey = 'total';
        }
        
        analysis.breakdown_data[breakdownKey] = 
          (analysis.breakdown_data[breakdownKey] || 0) + cost.amount;
      }
    });
    
    // Calculate trends
    analysis.trends = this._calculateCostTrends(recentCosts, timeRange);
    
    // Calculate projections
    analysis.projections = this._calculateCostProjections(recentCosts);
    
    return {
      success: true,
      analysis
    };
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const recommendations = [...this.recommendations];
    
    // Add budget-based recommendations
    Object.values(this.costs.budgets).forEach(budget => {
      const spentPercentage = (budget.spent / budget.amount) * 100;
      
      if (spentPercentage > budget.alertThreshold) {
        recommendations.push({
          category: 'budget',
          priority: spentPercentage > 100 ? 'critical' : 'high',
          message: `Budget ${budget.name} is ${Math.round(spentPercentage)}% spent`,
          action: 'Review spending and consider cost optimization measures',
          potentialSavings: 0,
          effort: 'low'
        });
      }
    });
    
    // Add utilization-based recommendations
    this._generateUtilizationRecommendations(recommendations);
    
    // Sort by potential savings
    recommendations.sort((a, b) => (b.potentialSavings || 0) - (a.potentialSavings || 0));
    
    return recommendations;
  }

  /**
   * Get cost summary
   */
  async getSummary(timeRange = '7d') {
    const timeRangeMs = this._parseTimeRange(timeRange);
    const since = Date.now() - timeRangeMs;
    
    const recentCosts = this.costs.historical.filter(c => c.timestamp >= since);
    const totalCost = recentCosts.reduce((sum, c) => sum + c.amount, 0);
    
    // Calculate daily average
    const days = timeRangeMs / (24 * 60 * 60 * 1000);
    const dailyAverage = totalCost / days;
    
    // Top spending services
    const serviceSpending = {};
    recentCosts.forEach(cost => {
      serviceSpending[cost.service] = (serviceSpending[cost.service] || 0) + cost.amount;
    });
    
    const topServices = Object.entries(serviceSpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([service, amount]) => ({ service, amount: Math.round(amount * 100) / 100 }));
    
    return {
      timeRange,
      totalCost: Math.round(totalCost * 100) / 100,
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      topServices,
      budgets: Object.keys(this.costs.budgets).length,
      recommendations: this.recommendations.length
    };
  }

  /**
   * Simulate cost optimization
   */
  async simulateOptimization(recommendations) {
    const simulation = {
      currentCost: this.costs.current.total,
      optimizedCost: this.costs.current.total,
      totalSavings: 0,
      savingsBreakdown: {},
      implementationEffort: 'low',
      riskLevel: 'low'
    };
    
    recommendations.forEach(rec => {
      if (rec.potentialSavings) {
        simulation.optimizedCost -= rec.potentialSavings;
        simulation.totalSavings += rec.potentialSavings;
        
        simulation.savingsBreakdown[rec.category] = 
          (simulation.savingsBreakdown[rec.category] || 0) + rec.potentialSavings;
        
        // Update effort and risk levels
        if (rec.effort === 'high') simulation.implementationEffort = 'high';
        else if (rec.effort === 'medium' && simulation.implementationEffort === 'low') {
          simulation.implementationEffort = 'medium';
        }
        
        if (rec.risk === 'high') simulation.riskLevel = 'high';
        else if (rec.risk === 'medium' && simulation.riskLevel === 'low') {
          simulation.riskLevel = 'medium';
        }
      }
    });
    
    simulation.savingsPercentage = simulation.currentCost > 0 ?
      (simulation.totalSavings / simulation.currentCost) * 100 : 0;
    
    return {
      success: true,
      simulation
    };
  }

  async healthCheck() {
    return {
      healthy: true,
      optimizer: 'cost',
      totalCost: this.costs.current.total,
      budgets: Object.keys(this.costs.budgets).length,
      recommendations: this.recommendations.length,
      trackedResources: Object.keys(this.utilization).reduce(
        (sum, type) => sum + Object.keys(this.utilization[type]).length, 0
      )
    };
  }

  async cleanup() {
    this.logger.info('🧹 Cost Optimizer cleanup...');
    
    if (this.costInterval) {
      clearInterval(this.costInterval);
    }
    
    this.logger.info('✅ Cost Optimizer cleanup completed');
  }

  // Private methods

  _setupLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [CostOptimizer] [${level}] ${message}`;
        })
      ),
      transports: [
        new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })
      ]
    });
  }

  _startCostMonitoring() {
    // Update cost analysis every 5 minutes
    this.costInterval = setInterval(() => {
      this._updateBudgetTracking();
      this._generateCostAlerts();
    }, 300000);
  }

  _checkOptimizationOpportunities(resourceType, resourceId, utilization, metadata) {
    // Check against optimization rules
    Object.entries(this.optimizationRules).forEach(([ruleId, rule]) => {
      let shouldRecommend = false;
      let potentialSavings = 0;
      
      switch (ruleId) {
        case 'idle-resources':
          if (utilization < rule.threshold) {
            shouldRecommend = true;
            potentialSavings = this._estimateResourceCost(resourceType, resourceId, metadata);
          }
          break;
          
        case 'oversized-instances':
          if (utilization < rule.threshold && resourceType === 'compute') {
            shouldRecommend = true;
            potentialSavings = this._estimateDownsizingSavings(resourceId, metadata);
          }
          break;
          
        case 'unused-storage':
          if (utilization < rule.threshold && resourceType === 'storage') {
            shouldRecommend = true;
            potentialSavings = this._estimateResourceCost(resourceType, resourceId, metadata);
          }
          break;
      }
      
      if (shouldRecommend) {
        this._addRecommendation({
          category: 'utilization',
          priority: rule.savings === 'high' ? 'high' : 'medium',
          message: `${rule.name}: ${resourceType}/${resourceId} (${utilization}% utilization)`,
          action: rule.description,
          potentialSavings,
          effort: 'low',
          risk: 'low',
          resourceType,
          resourceId,
          rule: ruleId
        });
      }
    });
  }

  _addRecommendation(recommendation) {
    // Check if similar recommendation already exists
    const exists = this.recommendations.some(rec => 
      rec.resourceType === recommendation.resourceType &&
      rec.resourceId === recommendation.resourceId &&
      rec.rule === recommendation.rule
    );
    
    if (!exists) {
      this.recommendations.push({
        ...recommendation,
        id: Date.now().toString(),
        created: Date.now()
      });
      
      // Keep only recent recommendations
      if (this.recommendations.length > 100) {
        this.recommendations = this.recommendations.slice(-100);
      }
    }
  }

  _estimateResourceCost(resourceType, resourceId, metadata) {
    // Simplified cost estimation
    const provider = metadata.provider || 'aws';
    const instanceType = metadata.instanceType || 't3.micro';
    
    let hourlyCost = 0;
    
    switch (resourceType) {
      case 'compute':
        hourlyCost = this.pricing[provider]?.ec2?.[instanceType] || 
                    this.pricing[provider]?.compute?.[instanceType] ||
                    this.pricing[provider]?.vm?.[instanceType] || 0.01;
        break;
      case 'storage':
        const storageGB = metadata.size || 100;
        const monthlyCostPerGB = this.pricing[provider]?.s3?.standard ||
                               this.pricing[provider]?.storage?.standard || 0.023;
        hourlyCost = (storageGB * monthlyCostPerGB) / (30 * 24);
        break;
      case 'database':
        hourlyCost = this.pricing[provider]?.rds?.[instanceType] || 0.017;
        break;
    }
    
    // Estimate monthly savings
    return Math.round(hourlyCost * 24 * 30 * 100) / 100;
  }

  _estimateDownsizingSavings(resourceId, metadata) {
    const currentType = metadata.instanceType || 't3.medium';
    const provider = metadata.provider || 'aws';
    
    // Simple downsizing logic
    const downsizeMap = {
      't3.large': 't3.medium',
      't3.medium': 't3.small',
      't3.small': 't3.micro'
    };
    
    const newType = downsizeMap[currentType];
    if (!newType) return 0;
    
    const currentCost = this.pricing[provider]?.ec2?.[currentType] || 0;
    const newCost = this.pricing[provider]?.ec2?.[newType] || 0;
    
    const hourlySavings = currentCost - newCost;
    return Math.round(hourlySavings * 24 * 30 * 100) / 100; // Monthly savings
  }

  _generateUtilizationRecommendations(recommendations) {
    // Analyze overall utilization patterns
    Object.entries(this.utilization).forEach(([resourceType, resources]) => {
      const utilizationValues = Object.values(resources).map(r => r.utilization);
      
      if (utilizationValues.length === 0) return;
      
      const avgUtilization = utilizationValues.reduce((sum, u) => sum + u, 0) / utilizationValues.length;
      
      if (avgUtilization < 20) {
        recommendations.push({
          category: 'utilization',
          priority: 'medium',
          message: `Low average ${resourceType} utilization (${Math.round(avgUtilization)}%)`,
          action: `Consider consolidating or downsizing ${resourceType} resources`,
          potentialSavings: this._estimateConsolidationSavings(resourceType, resources),
          effort: 'medium',
          risk: 'medium'
        });
      }
    });
  }

  _estimateConsolidationSavings(resourceType, resources) {
    // Estimate savings from consolidating underutilized resources
    const underutilized = Object.entries(resources).filter(([, data]) => data.utilization < 30);
    const potentialSavings = underutilized.length * 50; // $50 per resource per month
    
    return Math.round(potentialSavings * 100) / 100;
  }

  _calculateCostTrends(costs, timeRange) {
    if (costs.length < 2) {
      return { trend: 'stable', change: 0 };
    }
    
    // Simple trend calculation
    const timeRangeMs = this._parseTimeRange(timeRange);
    const halfPoint = Date.now() - (timeRangeMs / 2);
    
    const firstHalf = costs.filter(c => c.timestamp < halfPoint);
    const secondHalf = costs.filter(c => c.timestamp >= halfPoint);
    
    const firstHalfTotal = firstHalf.reduce((sum, c) => sum + c.amount, 0);
    const secondHalfTotal = secondHalf.reduce((sum, c) => sum + c.amount, 0);
    
    if (firstHalfTotal === 0) {
      return { trend: 'new', change: 0 };
    }
    
    const change = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
    
    let trend;
    if (change > 10) trend = 'increasing';
    else if (change < -10) trend = 'decreasing';
    else trend = 'stable';
    
    return {
      trend,
      change: Math.round(change * 100) / 100
    };
  }

  _calculateCostProjections(costs) {
    if (costs.length < 7) {
      return { nextMonth: 0, nextQuarter: 0 };
    }
    
    // Simple linear projection based on recent trend
    const dailyCosts = this._groupCostsByDay(costs);
    const recentDays = dailyCosts.slice(-7); // Last 7 days
    
    const avgDailyCost = recentDays.reduce((sum, day) => sum + day.total, 0) / recentDays.length;
    
    return {
      nextMonth: Math.round(avgDailyCost * 30 * 100) / 100,
      nextQuarter: Math.round(avgDailyCost * 90 * 100) / 100
    };
  }

  _groupCostsByDay(costs) {
    const dailyCosts = {};
    
    costs.forEach(cost => {
      const day = new Date(cost.timestamp).toDateString();
      if (!dailyCosts[day]) {
        dailyCosts[day] = { day, total: 0, costs: [] };
      }
      dailyCosts[day].total += cost.amount;
      dailyCosts[day].costs.push(cost);
    });
    
    return Object.values(dailyCosts).sort((a, b) => new Date(a.day) - new Date(b.day));
  }

  _updateBudgetTracking() {
    // Update budget spending
    Object.values(this.costs.budgets).forEach(budget => {
      const period = budget.period;
      const periodStart = this._getPeriodStart(period);
      
      const periodCosts = this.costs.historical.filter(c => c.timestamp >= periodStart);
      budget.spent = periodCosts.reduce((sum, c) => sum + c.amount, 0);
      budget.remaining = Math.max(0, budget.amount - budget.spent);
    });
  }

  _generateCostAlerts() {
    // Check budget alerts
    Object.values(this.costs.budgets).forEach(budget => {
      const spentPercentage = (budget.spent / budget.amount) * 100;
      
      if (spentPercentage >= budget.alertThreshold) {
        this.costs.alerts.push({
          type: 'budget-alert',
          budget: budget.name,
          spentPercentage: Math.round(spentPercentage),
          amount: budget.spent,
          limit: budget.amount,
          timestamp: Date.now()
        });
      }
    });
    
    // Keep only recent alerts
    if (this.costs.alerts.length > 100) {
      this.costs.alerts = this.costs.alerts.slice(-100);
    }
  }

  _getPeriodStart(period) {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart.getTime();
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1).getTime();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }
  }

  _parseTimeRange(timeRange) {
    const units = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000; // Default to 30 days
    
    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit] || units.d);
  }
}

module.exports = CostOptimizer;

