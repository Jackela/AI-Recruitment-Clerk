/**
 * CI Monitor - Test Metrics Collection and Analysis
 *
 * This script analyzes test results and provides metrics for CI monitoring.
 * Usage: node scripts/ci-monitor.ts [command] [options]
 *
 * Commands:
 *   analyze - Parse test results and calculate metrics
 *   report  - Generate test report
 *   check-failure-rate - Check if failure rate exceeds threshold
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  suite: string;
}

interface TestMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failureRate: number;
  timestamp: string;
  project: string;
}

interface CoverageMetrics {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
}

const PROJECT_NAME = 'ai-recruitment-clerk';
const FAILURE_RATE_THRESHOLD = 0.1; // 10%
const METRICS_DIR = path.join(process.cwd(), 'ci-metrics');

/**
 * Parse Jest test results from JSON output
 */
function parseJestResults(): TestResult[] {
  const results: TestResult[] = [];

  // Look for Jest results in standard locations
  const resultFiles = [
    'test-results.json',
    'coverage/test-results.json',
    'jest-results.json',
  ];

  for (const file of resultFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        if (data.testResults) {
          for (const suite of data.testResults) {
            const suiteName = suite.name || 'unknown';
            if (suite.assertionResults) {
              for (const test of suite.assertionResults) {
                results.push({
                  name: test.title || test.fullName || 'unnamed',
                  status:
                    test.status === 'passed'
                      ? 'passed'
                      : test.status === 'failed'
                        ? 'failed'
                        : 'skipped',
                  duration: test.duration || 0,
                  suite: suiteName,
                });
              }
            }
          }
        }

        // If we found valid results, break
        if (results.length > 0) break;
      } catch (error) {
        console.warn(`Warning: Could not parse ${file}:`, error);
      }
    }
  }

  return results;
}

/**
 * Parse test results from coverage directory
 */
function parseCoverageResults(): CoverageMetrics | null {
  const coveragePath = path.join(
    process.cwd(),
    'coverage',
    'coverage-summary.json',
  );

  if (!fs.existsSync(coveragePath)) {
    console.warn('Coverage summary not found');
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    const total = data.total;

    return {
      lines: total?.lines?.pct || 0,
      statements: total?.statements?.pct || 0,
      functions: total?.functions?.pct || 0,
      branches: total?.branches?.pct || 0,
    };
  } catch (error) {
    console.warn('Warning: Could not parse coverage summary:', error);
    return null;
  }
}

/**
 * Calculate test metrics from results
 */
function calculateMetrics(results: TestResult[]): TestMetrics {
  const total = results.length;
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const duration = results.reduce((sum, r) => sum + r.duration, 0);
  const failureRate = total > 0 ? failed / total : 0;

  return {
    total,
    passed,
    failed,
    skipped,
    duration,
    failureRate,
    timestamp: new Date().toISOString(),
    project: PROJECT_NAME,
  };
}

/**
 * Save metrics to file for trend analysis
 */
function saveMetrics(
  metrics: TestMetrics,
  coverage: CoverageMetrics | null,
): void {
  if (!fs.existsSync(METRICS_DIR)) {
    fs.mkdirSync(METRICS_DIR, { recursive: true });
  }

  const metricsFile = path.join(METRICS_DIR, `metrics-${Date.now()}.json`);
  const data = {
    ...metrics,
    coverage,
    git: {
      commit: process.env.GITHUB_SHA || 'unknown',
      branch: process.env.GITHUB_REF_NAME || 'unknown',
      runId: process.env.GITHUB_RUN_ID || 'unknown',
    },
  };

  fs.writeFileSync(metricsFile, JSON.stringify(data, null, 2));
  console.log(`✅ Metrics saved to ${metricsFile}`);
}

/**
 * Check if failure rate exceeds threshold
 */
function checkFailureRate(metrics: TestMetrics): boolean {
  if (metrics.failureRate > FAILURE_RATE_THRESHOLD) {
    console.error(
      `⚠️ Test failure rate is high: ${(metrics.failureRate * 100).toFixed(2)}%`,
    );
    console.error(
      `   Threshold: ${(FAILURE_RATE_THRESHOLD * 100).toFixed(0)}%`,
    );
    console.error(`   Failed: ${metrics.failed}/${metrics.total}`);
    return false;
  }

  console.log(
    `✅ Test failure rate is acceptable: ${(metrics.failureRate * 100).toFixed(2)}%`,
  );
  return true;
}

/**
 * Generate test report
 */
function generateReport(
  metrics: TestMetrics,
  coverage: CoverageMetrics | null,
): string {
  let report = `## 🧪 Test Results Report\n\n`;

  report += `### Summary\n`;
  report += `- **Total Tests**: ${metrics.total}\n`;
  report += `- **Passed**: ✅ ${metrics.passed}\n`;
  report += `- **Failed**: ${metrics.failed > 0 ? '❌' : '✅'} ${metrics.failed}\n`;
  report += `- **Skipped**: ⏭️ ${metrics.skipped}\n`;
  report += `- **Duration**: ⏱️ ${(metrics.duration / 1000).toFixed(2)}s\n`;
  report += `- **Failure Rate**: ${(metrics.failureRate * 100).toFixed(2)}%\n\n`;

  if (coverage) {
    report += `### Coverage\n`;
    report += `- **Lines**: ${coverage.lines.toFixed(2)}%\n`;
    report += `- **Statements**: ${coverage.statements.toFixed(2)}%\n`;
    report += `- **Functions**: ${coverage.functions.toFixed(2)}%\n`;
    report += `- **Branches**: ${coverage.branches.toFixed(2)}%\n\n`;
  }

  // Status badge
  if (metrics.failed === 0) {
    report += `### ✅ All tests passed!\n`;
  } else if (metrics.failureRate > FAILURE_RATE_THRESHOLD) {
    report += `### ⚠️ High failure rate detected\n`;
  } else {
    report += `### ⚡ Some tests failed\n`;
  }

  return report;
}

/**
 * Upload metrics to external API (if configured)
 */
async function uploadMetrics(
  metrics: TestMetrics,
  coverage: CoverageMetrics | null,
): Promise<void> {
  const apiUrl = process.env.METRICS_API_URL;
  const apiKey = process.env.METRICS_API_KEY;

  if (!apiUrl) {
    console.log('ℹ️ METRICS_API_URL not set, skipping external upload');
    return;
  }

  try {
    const payload = {
      project: PROJECT_NAME,
      timestamp: metrics.timestamp,
      tests: {
        total: metrics.total,
        passed: metrics.passed,
        failed: metrics.failed,
        skipped: metrics.skipped,
        duration: metrics.duration,
        failureRate: metrics.failureRate,
      },
      coverage,
      metadata: {
        commit: process.env.GITHUB_SHA,
        branch: process.env.GITHUB_REF_NAME,
        runId: process.env.GITHUB_RUN_ID,
        runNumber: process.env.GITHUB_RUN_NUMBER,
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Use native fetch in Node.js 18+
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('✅ Metrics uploaded successfully');
    } else {
      console.warn(
        `⚠️ Failed to upload metrics: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.warn('⚠️ Error uploading metrics:', error);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'analyze':
      console.log('🔍 Analyzing test results...\n');
      const results = parseJestResults();

      if (results.length === 0) {
        console.warn('⚠️ No test results found');
        process.exit(0);
      }

      const metrics = calculateMetrics(results);
      const coverage = parseCoverageResults();

      console.log('📊 Test Metrics:');
      console.log(`   Total: ${metrics.total}`);
      console.log(`   Passed: ${metrics.passed}`);
      console.log(`   Failed: ${metrics.failed}`);
      console.log(`   Skipped: ${metrics.skipped}`);
      console.log(`   Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
      console.log(
        `   Failure Rate: ${(metrics.failureRate * 100).toFixed(2)}%`,
      );

      if (coverage) {
        console.log('\n📈 Coverage Metrics:');
        console.log(`   Lines: ${coverage.lines.toFixed(2)}%`);
        console.log(`   Statements: ${coverage.statements.toFixed(2)}%`);
        console.log(`   Functions: ${coverage.functions.toFixed(2)}%`);
        console.log(`   Branches: ${coverage.branches.toFixed(2)}%`);
      }

      saveMetrics(metrics, coverage);
      await uploadMetrics(metrics, coverage);
      break;

    case 'check-failure-rate':
      const checkResults = parseJestResults();
      if (checkResults.length === 0) {
        console.warn('⚠️ No test results found');
        process.exit(0);
      }

      const checkMetrics = calculateMetrics(checkResults);
      const passed = checkFailureRate(checkMetrics);
      process.exit(passed ? 0 : 1);

    case 'report':
      const reportResults = parseJestResults();
      const reportMetrics = calculateMetrics(reportResults);
      const reportCoverage = parseCoverageResults();
      const report = generateReport(reportMetrics, reportCoverage);

      // Output report
      console.log(report);

      // Save report to file
      const reportPath = path.join(METRICS_DIR, 'test-report.md');
      if (!fs.existsSync(METRICS_DIR)) {
        fs.mkdirSync(METRICS_DIR, { recursive: true });
      }
      fs.writeFileSync(reportPath, report);
      console.log(`\n📝 Report saved to ${reportPath}`);

      // Set output for GitHub Actions
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(
          process.env.GITHUB_OUTPUT,
          `test_report<<EOF\n${report}\nEOF\n`,
        );
      }
      break;

    default:
      console.log('CI Monitor - Test Metrics Collection\n');
      console.log('Usage: node scripts/ci-monitor.ts [command]');
      console.log('\nCommands:');
      console.log('  analyze          - Parse and analyze test results');
      console.log(
        '  check-failure-rate - Check if failure rate exceeds threshold',
      );
      console.log('  report           - Generate test report');
      console.log('\nEnvironment Variables:');
      console.log('  GITHUB_SHA       - Git commit SHA');
      console.log('  GITHUB_REF_NAME  - Git branch name');
      console.log('  GITHUB_RUN_ID    - GitHub Actions run ID');
      console.log('  METRICS_API_URL  - External metrics API URL (optional)');
      console.log('  METRICS_API_KEY  - External metrics API key (optional)');
      process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
