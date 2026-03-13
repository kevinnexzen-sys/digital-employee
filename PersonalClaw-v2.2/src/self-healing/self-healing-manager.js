import DiagnosticAgent from './diagnostic-agent.js';
import AutoFixAgent from './auto-fix-agent.js';
import { createLogger } from '../utils/logger.js';
import fs from 'fs';

const logger = createLogger('SelfHealingManager');

class SelfHealingManager {
  constructor(llmProvider) {
    this.diagnosticAgent = new DiagnosticAgent();
    this.autoFixAgent = new AutoFixAgent(llmProvider);
    this.isEnabled = true;
    this.autoFixEnabled = false; // Requires user permission
    this.notifications = [];
  }

  /**
   * Run full diagnostic and repair cycle
   */
  async runHealthCheck() {
    logger.info('🏥 Starting health check...');

    try {
      // Step 1: Run diagnostics
      const diagnosticResult = await this.diagnosticAgent.runDiagnostics();

      if (!diagnosticResult.success) {
        return {
          success: false,
          message: 'Diagnostic scan failed',
          error: diagnosticResult.error
        };
      }

      const issues = diagnosticResult.issues;
      const summary = this.diagnosticAgent.getIssuesSummary();

      logger.info(`Found ${issues.length} issues (${summary.fixable} fixable)`);

      // Step 2: Analyze each fixable issue
      const analysisResults = [];
      for (const issue of issues.filter(i => i.fixable)) {
        const analysis = await this.autoFixAgent.analyzeAndFindSolution(issue);
        analysisResults.push(analysis);
      }

      // Step 3: Create notifications for user
      this.createNotifications(issues, analysisResults);

      return {
        success: true,
        summary: summary,
        issues: issues,
        solutions: analysisResults,
        notifications: this.notifications
      };
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        success: false,
        message: 'Health check failed',
        error: error.message
      };
    }
  }

  /**
   * Create user notifications for issues
   */
  createNotifications(issues, solutions) {
    this.notifications = [];

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const solution = solutions.find(s => s.issue === issue);

      if (issue.fixable && solution) {
        this.notifications.push({
          id: `fix-${Date.now()}-${i}`,
          type: 'FIX_AVAILABLE',
          severity: issue.severity,
          title: this.getNotificationTitle(issue),
          message: this.getNotificationMessage(issue, solution),
          issue: issue,
          solution: solution.solution,
          actions: [
            {
              label: 'Fix Now',
              action: 'apply_fix',
              data: { issue, solution: solution.solution }
            },
            {
              label: 'Show Details',
              action: 'show_details',
              data: { issue, solution: solution.solution }
            },
            {
              label: 'Ignore',
              action: 'ignore',
              data: { issue }
            }
          ],
          timestamp: new Date().toISOString()
        });
      } else if (!issue.fixable) {
        this.notifications.push({
          id: `manual-${Date.now()}-${i}`,
          type: 'MANUAL_ACTION_REQUIRED',
          severity: issue.severity,
          title: this.getNotificationTitle(issue),
          message: `This issue requires manual intervention: ${issue.message}`,
          issue: issue,
          actions: [
            {
              label: 'Show Details',
              action: 'show_details',
              data: { issue }
            },
            {
              label: 'Dismiss',
              action: 'dismiss',
              data: { issue }
            }
          ],
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Get notification title based on issue type
   */
  getNotificationTitle(issue) {
    const titles = {
      'MISSING_DEPENDENCY': '📦 Missing Package Detected',
      'MIXED_MODULES': '🔄 Code Compatibility Issue',
      'INVALID_CONFIG_PATH': '⚙️ Configuration Error',
      'MODULE_IMPORT_ERROR': '❌ Import Error',
      'MISSING_FILE': '📄 Missing File',
      'MISSING_CONFIG': '⚙️ Configuration Missing',
      'MISSING_API_KEY': '🔑 API Key Required'
    };

    return titles[issue.type] || '⚠️ Issue Detected';
  }

  /**
   * Get notification message
   */
  getNotificationMessage(issue, solution) {
    const confidence = solution?.solution?.confidence || 0;
    const confidenceText = confidence > 80 ? 'High confidence' : 
                          confidence > 60 ? 'Medium confidence' : 
                          'Low confidence';

    return `${issue.message}

🔍 Diagnosis: ${solution?.solution?.diagnosis || 'Analysis pending'}

💡 Suggested Fix: ${solution?.solution?.solution || issue.suggestedFix}

Confidence: ${confidenceText} (${confidence}%)

Would you like me to fix this automatically?`;
  }

  /**
   * Apply fix with user approval
   */
  async applyFixWithApproval(issue, solution) {
    logger.info(`🔧 Applying fix for: ${issue.type} (User approved)`);

    try {
      const result = await this.autoFixAgent.applyFix(issue, solution, true);

      if (result.success) {
        logger.info(`✅ Fix applied successfully: ${result.message}`);
        
        // Create success notification
        this.notifications.push({
          id: `success-${Date.now()}`,
          type: 'FIX_SUCCESS',
          severity: 'INFO',
          title: '✅ Fix Applied Successfully',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.error(`❌ Fix failed: ${result.message}`);
        
        // Create failure notification
        this.notifications.push({
          id: `failure-${Date.now()}`,
          type: 'FIX_FAILED',
          severity: 'ERROR',
          title: '❌ Fix Failed',
          message: result.message,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    } catch (error) {
      logger.error('Fix application error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get all pending notifications
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * Clear notification
   */
  clearNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
  }

  /**
   * Get health report
   */
  getHealthReport() {
    const diagnosticReport = this.diagnosticAgent.getDetailedReport();
    const fixReport = this.autoFixAgent.generateFixReport();

    return {
      timestamp: new Date().toISOString(),
      diagnostics: diagnosticReport,
      fixes: fixReport,
      notifications: this.notifications,
      isHealthy: diagnosticReport.summary.critical === 0 && 
                 diagnosticReport.summary.high === 0
    };
  }

  /**
   * Save health report to file
   */
  saveHealthReport() {
    const report = this.getHealthReport();
    const filename = `health-report-${Date.now()}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    logger.info(`📄 Health report saved: ${filename}`);
    
    return filename;
  }

  /**
   * Enable/disable self-healing
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Self-healing ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable auto-fix (requires user permission)
   */
  setAutoFixEnabled(enabled) {
    this.autoFixEnabled = enabled;
    logger.info(`Auto-fix ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default SelfHealingManager;
