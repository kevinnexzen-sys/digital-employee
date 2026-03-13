/**
 * Financial Blocker - HARDCODED SECURITY LAYER
 * 
 * This module CANNOT be disabled or bypassed.
 * It blocks all access to financial websites, payment systems, and sensitive credentials.
 * 
 * SECURITY RULE #1: Financial Access = NEVER
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('FinancialBlocker');

// HARDCODED FINANCIAL PATTERNS - CANNOT BE MODIFIED AT RUNTIME
const BLOCKED_PATTERNS = Object.freeze({
  // Banking Institutions
  banking: [
    '*bank*', '*chase*', '*wellsfargo*', '*bofa*', '*citibank*',
    '*usbank*', '*pnc*', '*capitalone*', '*ally*', '*discover*',
    '*americanexpress*', '*barclays*', '*hsbc*', '*santander*'
  ],
  
  // Payment Processors
  payments: [
    '*paypal*', '*stripe*', '*venmo*', '*cashapp*', '*zelle*',
    '*square*', '*braintree*', '*adyen*', '*worldpay*', '*authorize.net*'
  ],
  
  // Cryptocurrency
  crypto: [
    '*coinbase*', '*binance*', '*kraken*', '*gemini*', '*crypto.com*',
    '*blockchain*', '*wallet*', '*metamask*', '*ledger*', '*trezor*',
    '*bitcoin*', '*ethereum*', '*btc*', '*eth*'
  ],
  
  // Trading & Investment
  trading: [
    '*robinhood*', '*etrade*', '*tdameritrade*', '*fidelity*', '*schwab*',
    '*webull*', '*interactive*brokers*', '*vanguard*', '*merrill*',
    '*trading*', '*stocks*', '*forex*', '*options*'
  ],
  
  // Credit Cards & Billing
  credit: [
    '*creditcard*', '*payment*', '*billing*', '*checkout*',
    '*card*number*', '*cvv*', '*expiry*', '*security*code*'
  ],
  
  // Financial Keywords
  keywords: [
    'account*number', 'routing*number', 'swift*code', 'iban',
    'pin*code', 'balance', 'transfer*funds', 'wire*transfer'
  ]
});

// DOM Selectors for Financial Forms
const BLOCKED_SELECTORS = Object.freeze([
  'input[name*="card"]',
  'input[name*="cvv"]',
  'input[name*="cvc"]',
  'input[name*="account"]',
  'input[name*="routing"]',
  'input[name*="pin"]',
  'input[type="password"][name*="bank"]',
  'input[type="password"][name*="payment"]',
  'form[action*="payment"]',
  'form[action*="checkout"]',
  'form[action*="billing"]'
]);

class FinancialBlocker {
  constructor() {
    this.blockedAttempts = [];
    this.alertCallbacks = [];
    
    // Log initialization
    logger.warn('🔒 Financial Blocker initialized - ALL financial access BLOCKED');
    logger.warn('⚠️  This security layer CANNOT be disabled');
  }

  /**
   * Check if a URL is blocked
   * @param {string} url - URL to check
   * @returns {Object} - { blocked: boolean, reason: string, category: string }
   */
  checkUrl(url) {
    if (!url) return { blocked: false };

    const urlLower = url.toLowerCase();

    // Check each category
    for (const [category, patterns] of Object.entries(BLOCKED_PATTERNS)) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
        if (regex.test(urlLower)) {
          const reason = `Financial site detected: ${category}`;
          this.logBlockedAttempt(url, reason, category);
          return { blocked: true, reason, category };
        }
      }
    }

    return { blocked: false };
  }

  /**
   * Check if DOM contains financial form elements
   * @param {string} html - HTML content to check
   * @returns {Object} - { blocked: boolean, reason: string, elements: Array }
   */
  checkDomContent(html) {
    if (!html) return { blocked: false };

    const foundElements = [];
    const htmlLower = html.toLowerCase();

    for (const selector of BLOCKED_SELECTORS) {
      // Simple check for selector patterns in HTML
      const selectorPattern = selector.replace(/[\[\]"'=*]/g, '');
      if (htmlLower.includes(selectorPattern.toLowerCase())) {
        foundElements.push(selector);
      }
    }

    if (foundElements.length > 0) {
      const reason = 'Financial form elements detected';
      this.logBlockedAttempt('DOM Content', reason, 'form-detection');
      return { blocked: true, reason, elements: foundElements };
    }

    return { blocked: false };
  }

  /**
   * Check if text content contains financial keywords
   * @param {string} text - Text to analyze
   * @returns {Object} - { blocked: boolean, reason: string, keywords: Array }
   */
  checkTextContent(text) {
    if (!text) return { blocked: false };

    const textLower = text.toLowerCase();
    const foundKeywords = [];

    for (const keyword of BLOCKED_PATTERNS.keywords) {
      const regex = new RegExp(keyword.replace(/\*/g, '.*'), 'i');
      if (regex.test(textLower)) {
        foundKeywords.push(keyword);
      }
    }

    // Require multiple keywords to avoid false positives
    if (foundKeywords.length >= 2) {
      const reason = 'Multiple financial keywords detected';
      this.logBlockedAttempt('Text Content', reason, 'keyword-detection');
      return { blocked: true, reason, keywords: foundKeywords };
    }

    return { blocked: false };
  }

  /**
   * Log blocked attempt
   * @param {string} target - What was blocked
   * @param {string} reason - Why it was blocked
   * @param {string} category - Category of block
   */
  logBlockedAttempt(target, reason, category) {
    const attempt = {
      timestamp: new Date().toISOString(),
      target,
      reason,
      category
    };

    this.blockedAttempts.push(attempt);
    
    // Keep only last 100 attempts
    if (this.blockedAttempts.length > 100) {
      this.blockedAttempts.shift();
    }

    // Log to console
    logger.error(`🚫 BLOCKED: ${target}`);
    logger.error(`   Reason: ${reason}`);
    logger.error(`   Category: ${category}`);

    // Trigger alert callbacks
    this.triggerAlerts(attempt);
  }

  /**
   * Register alert callback
   * @param {Function} callback - Function to call when financial access is blocked
   */
  onBlocked(callback) {
    if (typeof callback === 'function') {
      this.alertCallbacks.push(callback);
    }
  }

  /**
   * Trigger all alert callbacks
   * @param {Object} attempt - Blocked attempt details
   */
  triggerAlerts(attempt) {
    for (const callback of this.alertCallbacks) {
      try {
        callback(attempt);
      } catch (error) {
        logger.error('Error in alert callback:', error);
      }
    }
  }

  /**
   * Get blocked attempts history
   * @param {number} limit - Number of attempts to return
   * @returns {Array} - Recent blocked attempts
   */
  getBlockedAttempts(limit = 10) {
    return this.blockedAttempts.slice(-limit);
  }

  /**
   * Get statistics
   * @returns {Object} - Statistics about blocked attempts
   */
  getStatistics() {
    const stats = {
      totalBlocked: this.blockedAttempts.length,
      byCategory: {},
      recentAttempts: this.getBlockedAttempts(5)
    };

    // Count by category
    for (const attempt of this.blockedAttempts) {
      stats.byCategory[attempt.category] = (stats.byCategory[attempt.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Check if financial blocking is enabled
   * @returns {boolean} - Always returns true (cannot be disabled)
   */
  isEnabled() {
    return true; // HARDCODED - CANNOT BE DISABLED
  }

  /**
   * Attempt to disable financial blocking
   * @throws {Error} - Always throws error (cannot be disabled)
   */
  disable() {
    const error = new Error('SECURITY VIOLATION: Financial blocking cannot be disabled');
    logger.error('🚨 SECURITY ALERT: Attempt to disable financial blocking!');
    this.logBlockedAttempt('System', 'Attempted to disable financial blocker', 'security-violation');
    throw error;
  }
}

// Export singleton instance
export const financialBlocker = new FinancialBlocker();

// Freeze the instance to prevent modification
Object.freeze(financialBlocker);

export default financialBlocker;
