/**
 * E2E Test Monitoring and Alerting System
 * 
 * Comprehensive monitoring system for cross-browser E2E test reliability
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Monitoring configuration
const MONITORING_CONFIG = {
  reportDirectory: './test-reports',
  metricsFile: 'e2e-metrics.json',
  alertThresholds: {
    successRate: 90, // Alert if success rate drops below 90%
    avgDuration: 120000, // Alert if average duration exceeds 2 minutes
    failureStreak: 3, // Alert after 3 consecutive failures
    browserFailureRate: 50 // Alert if any browser fails more than 50% of tests
  },
  retentionDays: 30, // Keep metrics for 30 days
  alertChannels: {
    console: true,
    file: true,
    // webhook: false // Future: integrate with Slack/Teams
  }
};

/**
 * Test execution metrics structure
 */
class TestMetrics {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.browsers = {};
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.duration = 0;
    this.successRate = 0;
    this.issues = [];
    this.environment = {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }
  
  addBrowserResult(browserName, result) {
    this.browsers[browserName] = {
      passed: result.passed || 0,
      failed: result.failed || 0,
      duration: result.duration || 0,
      successRate: result.passed / (result.passed + result.failed) * 100,
      errors: result.errors || []
    };
    
    this.totalTests += (result.passed + result.failed);
    this.passedTests += result.passed;
    this.failedTests += result.failed;
  }
  
  finalize() {
    this.successRate = this.totalTests > 0 ? (this.passedTests / this.totalTests) * 100 : 0;
    this.duration = Object.values(this.browsers).reduce((sum, browser) => sum + browser.duration, 0);
    
    // Identify issues
    this.issues = this.analyzeIssues();
  }
  
  analyzeIssues() {
    const issues = [];
    
    // Check overall success rate
    if (this.successRate < MONITORING_CONFIG.alertThresholds.successRate) {
      issues.push({
        severity: 'high',
        type: 'overall_failure_rate',
        message: `Overall success rate (${this.successRate.toFixed(1)}%) below threshold (${MONITORING_CONFIG.alertThresholds.successRate}%)`
      });
    }
    
    // Check individual browser performance
    Object.entries(this.browsers).forEach(([browser, stats]) => {
      if (stats.successRate < MONITORING_CONFIG.alertThresholds.browserFailureRate) {
        issues.push({
          severity: 'medium',
          type: 'browser_failure_rate',
          browser,
          message: `${browser} success rate (${stats.successRate.toFixed(1)}%) below threshold (${MONITORING_CONFIG.alertThresholds.browserFailureRate}%)`
        });
      }
    });
    
    // Check duration
    if (this.duration > MONITORING_CONFIG.alertThresholds.avgDuration) {
      issues.push({
        severity: 'medium',
        type: 'duration_exceeded',
        message: `Test duration (${Math.round(this.duration / 1000)}s) exceeded threshold (${MONITORING_CONFIG.alertThresholds.avgDuration / 1000}s)`
      });
    }
    
    return issues;
  }
}

/**
 * Monitoring and alerting system
 */
class E2EMonitoring {
  constructor() {
    this.ensureReportDirectory();
    this.metricsHistory = this.loadMetricsHistory();
  }
  
  ensureReportDirectory() {
    if (!existsSync(MONITORING_CONFIG.reportDirectory)) {
      mkdirSync(MONITORING_CONFIG.reportDirectory, { recursive: true });
    }
  }
  
  loadMetricsHistory() {
    const metricsPath = join(MONITORING_CONFIG.reportDirectory, MONITORING_CONFIG.metricsFile);
    
    if (existsSync(metricsPath)) {
      try {
        const data = readFileSync(metricsPath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.warn('⚠️ Failed to load metrics history:', error.message);
        return { runs: [] };
      }
    }
    
    return { runs: [] };
  }
  
  saveMetricsHistory() {
    const metricsPath = join(MONITORING_CONFIG.reportDirectory, MONITORING_CONFIG.metricsFile);
    
    try {
      // Clean old entries beyond retention period
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - MONITORING_CONFIG.retentionDays);
      
      this.metricsHistory.runs = this.metricsHistory.runs.filter(run => 
        new Date(run.timestamp) >= retentionDate
      );
      
      writeFileSync(metricsPath, JSON.stringify(this.metricsHistory, null, 2));
    } catch (error) {
      console.error('❌ Failed to save metrics history:', error.message);
    }
  }
  
  recordTestExecution(results) {
    const metrics = new TestMetrics();
    
    // Process results from test execution
    results.forEach(result => {
      metrics.addBrowserResult(result.browser, {
        passed: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        duration: result.duration,
        errors: result.error ? [result.error] : []
      });
    });
    
    metrics.finalize();
    
    // Add to history
    this.metricsHistory.runs.push(metrics);
    this.saveMetricsHistory();
    
    // Generate alerts
    this.processAlerts(metrics);
    
    // Generate report
    this.generateReport(metrics);
    
    return metrics;
  }
  
  processAlerts(metrics) {
    if (metrics.issues.length === 0) {
      console.log('✅ No issues detected - all systems operating normally');
      return;
    }
    
    console.log(`\n🚨 ALERT: ${metrics.issues.length} issue(s) detected:`);
    
    metrics.issues.forEach((issue, index) => {
      const emoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${emoji} ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
      
      if (issue.browser) {
        console.log(`     Browser: ${issue.browser}`);
      }
    });
    
    // Check for failure streaks
    this.checkFailureStreaks(metrics);
    
    // Write alert to file if configured
    if (MONITORING_CONFIG.alertChannels.file) {
      this.writeAlertFile(metrics);
    }
  }
  
  checkFailureStreaks() {
    const recentRuns = this.metricsHistory.runs.slice(-MONITORING_CONFIG.alertThresholds.failureStreak);
    
    if (recentRuns.length < MONITORING_CONFIG.alertThresholds.failureStreak) {
      return; // Not enough data
    }
    
    const hasConsecutiveFailures = recentRuns.every(run => 
      run.successRate < MONITORING_CONFIG.alertThresholds.successRate
    );
    
    if (hasConsecutiveFailures) {
      console.log(`\n🚨 CRITICAL ALERT: ${MONITORING_CONFIG.alertThresholds.failureStreak} consecutive test runs with low success rate!`);
      console.log('   This indicates a persistent issue that requires immediate attention.');
    }
  }
  
  writeAlertFile(metrics) {
    const alertPath = join(MONITORING_CONFIG.reportDirectory, `alert-${Date.now()}.json`);
    
    try {
      writeFileSync(alertPath, JSON.stringify({
        timestamp: metrics.timestamp,
        alertLevel: metrics.issues.some(i => i.severity === 'high') ? 'critical' : 'warning',
        issues: metrics.issues,
        metrics: {
          successRate: metrics.successRate,
          duration: metrics.duration,
          browsers: metrics.browsers
        }
      }, null, 2));
      
      console.log(`📄 Alert details written to: ${alertPath}`);
    } catch (error) {
      console.error('❌ Failed to write alert file:', error.message);
    }
  }
  
  generateReport(metrics) {
    console.log('\n📊 E2E TEST EXECUTION REPORT');
    console.log('============================');
    console.log(`🕐 Timestamp: ${metrics.timestamp}`);
    console.log(`📈 Overall Success Rate: ${metrics.successRate.toFixed(1)}%`);
    console.log(`⏱️ Total Duration: ${Math.round(metrics.duration / 1000)}s`);
    console.log(`📋 Tests: ${metrics.passedTests} passed, ${metrics.failedTests} failed`);
    
    console.log('\n🌐 Browser Performance:');
    Object.entries(metrics.browsers).forEach(([browser, stats]) => {
      const emoji = stats.successRate === 100 ? '✅' : stats.successRate >= 75 ? '⚠️' : '❌';
      console.log(`  ${emoji} ${browser.padEnd(10)} - ${stats.successRate.toFixed(1)}% (${Math.round(stats.duration / 1000)}s)`);
    });
    
    if (this.metricsHistory.runs.length > 1) {
      this.generateTrendAnalysis();
    }
  }
  
  generateTrendAnalysis() {
    const recent5 = this.metricsHistory.runs.slice(-5);
    const avgSuccessRate = recent5.reduce((sum, run) => sum + run.successRate, 0) / recent5.length;
    const avgDuration = recent5.reduce((sum, run) => sum + run.duration, 0) / recent5.length;
    
    console.log('\n📈 Trend Analysis (Last 5 Runs):');
    console.log(`   Average Success Rate: ${avgSuccessRate.toFixed(1)}%`);
    console.log(`   Average Duration: ${Math.round(avgDuration / 1000)}s`);
    
    // Trend direction
    if (recent5.length >= 3) {
      const latest = recent5[recent5.length - 1];
      const previous = recent5[recent5.length - 2];
      
      if (latest.successRate > previous.successRate) {
        console.log('   📈 Trend: IMPROVING');
      } else if (latest.successRate < previous.successRate) {
        console.log('   📉 Trend: DECLINING');
      } else {
        console.log('   ➡️ Trend: STABLE');
      }
    }
  }
  
  generateHealthReport() {
    console.log('\n🏥 E2E SYSTEM HEALTH REPORT');
    console.log('===========================');
    
    if (this.metricsHistory.runs.length === 0) {
      console.log('No historical data available.');
      return;
    }
    
    const recent30 = this.metricsHistory.runs.slice(-30);
    const avgSuccess = recent30.reduce((sum, run) => sum + run.successRate, 0) / recent30.length;
    const reliability = recent30.filter(run => run.successRate >= 90).length / recent30.length * 100;
    
    console.log(`📊 30-Day Average Success Rate: ${avgSuccess.toFixed(1)}%`);
    console.log(`🔒 Reliability (>90% success): ${reliability.toFixed(1)}%`);
    
    // Browser reliability breakdown
    const browserStats = {};
    recent30.forEach(run => {
      Object.entries(run.browsers).forEach(([browser, stats]) => {
        if (!browserStats[browser]) {
          browserStats[browser] = { total: 0, successful: 0 };
        }
        browserStats[browser].total++;
        if (stats.successRate >= 90) {
          browserStats[browser].successful++;
        }
      });
    });
    
    console.log('\n🌐 Browser Reliability:');
    Object.entries(browserStats).forEach(([browser, stats]) => {
      const reliability = (stats.successful / stats.total) * 100;
      const emoji = reliability >= 90 ? '✅' : reliability >= 75 ? '⚠️' : '❌';
      console.log(`  ${emoji} ${browser.padEnd(10)} - ${reliability.toFixed(1)}% reliable`);
    });
  }
}

export { E2EMonitoring, TestMetrics, MONITORING_CONFIG };