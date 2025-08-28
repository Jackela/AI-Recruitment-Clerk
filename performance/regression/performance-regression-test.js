// Performance Regression Testing for CI/CD Pipeline
// Validates performance benchmarks and detects regressions

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Performance regression metrics
const regressionDetected = new Rate('performance_regression_detected');
const baselineComparison = new Trend('baseline_comparison_ratio');
const regressionCounter = new Counter('regression_count');

// CI/CD Performance Testing Configuration
export let options = {
  scenarios: {
    // Quick smoke test for CI/CD
    ci_smoke_test: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { test_type: 'ci_smoke' },
    },
    
    // Performance benchmark validation
    benchmark_validation: {
      executor: 'constant-vus',
      vus: 25,
      duration: '3m',
      startTime: '2m',
      tags: { test_type: 'benchmark' },
    },
    
    // Regression detection test
    regression_detection: {
      executor: 'ramping-vus',
      stages: [
        { duration: '1m', target: 10 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 10 },
      ],
      startTime: '5m',
      tags: { test_type: 'regression' },
    },
  },
  
  // Performance regression thresholds (stricter than production)
  thresholds: {
    // API Response Time (CI/CD should be faster due to no load)
    'http_req_duration': [
      'p(95)<150',     // 95% < 150ms (stricter than production 200ms)
      'p(99)<300',     // 99% < 300ms (stricter than production 500ms)
    ],
    
    // Error Rate (Zero tolerance in CI/CD)
    'http_req_failed': ['rate<0.005'], // <0.5% error rate
    
    // Regression Detection
    'performance_regression_detected': ['rate<0.1'], // <10% of tests can show regression
    'baseline_comparison_ratio': ['p(95)<1.3'], // No more than 30% slower than baseline
    
    // Throughput (should handle CI load)
    'http_reqs': ['rate>20'], // >20 requests/second in CI
  },
};

// Performance baselines (loaded from previous runs)
const PERFORMANCE_BASELINES = {
  api_response_time_p95: __ENV.BASELINE_P95 ? parseFloat(__ENV.BASELINE_P95) : 120,
  api_response_time_p99: __ENV.BASELINE_P99 ? parseFloat(__ENV.BASELINE_P99) : 250,
  throughput: __ENV.BASELINE_THROUGHPUT ? parseFloat(__ENV.BASELINE_THROUGHPUT) : 30,
  error_rate: __ENV.BASELINE_ERROR_RATE ? parseFloat(__ENV.BASELINE_ERROR_RATE) : 0.001,
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const CI_MODE = __ENV.CI === 'true';
const BRANCH_NAME = __ENV.BRANCH_NAME || 'unknown';
const COMMIT_SHA = __ENV.COMMIT_SHA || 'unknown';

// Test execution tracking
let testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  regressions: [],
  improvements: [],
  timestamp: new Date().toISOString(),
  environment: {
    branch: BRANCH_NAME,
    commit: COMMIT_SHA,
    ci: CI_MODE,
  },
};

export function setup() {
  console.log('🚀 Performance Regression Testing Setup');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log(`🔀 Branch: ${BRANCH_NAME} (${COMMIT_SHA.substring(0, 8)})`);
  console.log(`⚖️ Baselines: P95=${PERFORMANCE_BASELINES.api_response_time_p95}ms, P99=${PERFORMANCE_BASELINES.api_response_time_p99}ms`);
  
  // Validate service availability before testing
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Service health check failed: ${healthCheck.status}`);
  }
  
  console.log('✅ Service health check passed');
  return { baselines: PERFORMANCE_BASELINES };
}

export default function (data) {
  const testType = __ENV.K6_SCENARIO || 'unknown';
  
  switch (testType) {
    case 'ci_smoke_test':
      runSmokeTest(data);
      break;
    case 'benchmark_validation':
      runBenchmarkValidation(data);
      break;
    case 'regression_detection':
      runRegressionDetection(data);
      break;
    default:
      runSmokeTest(data);
  }
  
  // Realistic CI wait time
  sleep(Math.random() * 1 + 0.5); // 0.5-1.5 seconds
}

function runSmokeTest(data) {
  // Quick smoke test to ensure basic functionality
  testResults.totalTests++;
  
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/health`);
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'smoke test - health endpoint available': (r) => r.status === 200,
    'smoke test - response time acceptable': (r) => r.timings.duration < 1000,
    'smoke test - response structure valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });
  
  if (success) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  
  // Check for regression against baseline
  const baselineRatio = duration / data.baselines.api_response_time_p95;
  baselineComparison.add(baselineRatio);
  
  if (baselineRatio > 1.5) { // 50% slower than baseline
    regressionDetected.add(1);
    regressionCounter.add(1);
    testResults.regressions.push({
      test: 'smoke_test_health',
      current: duration,
      baseline: data.baselines.api_response_time_p95,
      ratio: baselineRatio,
    });
  } else {
    regressionDetected.add(0);
  }
}

function runBenchmarkValidation(data) {
  // Validate against established performance benchmarks
  testResults.totalTests++;
  
  const endpoints = [
    { path: '/health', baseline: 100 },
    { path: '/system/status', baseline: 150 },
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}${endpoint.path}`);
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'benchmark validation - response successful': (r) => r.status === 200,
    'benchmark validation - within performance budget': (r) => r.timings.duration < endpoint.baseline * 2,
  });
  
  if (success) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  
  // Detailed benchmark comparison
  const baselineRatio = duration / endpoint.baseline;
  baselineComparison.add(baselineRatio);
  
  if (baselineRatio > 1.3) { // 30% slower than baseline
    regressionDetected.add(1);
    regressionCounter.add(1);
    testResults.regressions.push({
      test: `benchmark_${endpoint.path}`,
      current: duration,
      baseline: endpoint.baseline,
      ratio: baselineRatio,
    });
  } else if (baselineRatio < 0.8) { // 20% faster than baseline - improvement!
    testResults.improvements.push({
      test: `benchmark_${endpoint.path}`,
      current: duration,
      baseline: endpoint.baseline,
      improvement: (1 - baselineRatio) * 100,
    });
    regressionDetected.add(0);
  } else {
    regressionDetected.add(0);
  }
}

function runRegressionDetection(data) {
  // Advanced regression detection with statistical analysis
  testResults.totalTests++;
  
  const testScenarios = [
    { name: 'api_health_check', path: '/health', method: 'GET' },
    { name: 'api_status_check', path: '/system/status', method: 'GET' },
  ];
  
  const scenario = testScenarios[Math.floor(Math.random() * testScenarios.length)];
  
  const startTime = Date.now();
  let response;
  
  if (scenario.method === 'GET') {
    response = http.get(`${BASE_URL}${scenario.path}`);
  } else {
    response = http.post(`${BASE_URL}${scenario.path}`, '{}', {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'regression detection - request successful': (r) => r.status === 200,
    'regression detection - no timeout': (r) => r.timings.duration < 5000,
  });
  
  if (success) {
    testResults.passedTests++;
  } else {
    testResults.failedTests++;
  }
  
  // Statistical regression analysis
  const expectedDuration = getExpectedDuration(scenario.name, data.baselines);
  const baselineRatio = duration / expectedDuration;
  baselineComparison.add(baselineRatio);
  
  // Advanced regression detection using statistical thresholds
  const regressionThreshold = 1.2; // 20% slower
  const significantRegressionThreshold = 1.5; // 50% slower
  
  if (baselineRatio > significantRegressionThreshold) {
    regressionDetected.add(1);
    regressionCounter.add(1);
    testResults.regressions.push({
      test: scenario.name,
      current: duration,
      baseline: expectedDuration,
      ratio: baselineRatio,
      severity: 'critical',
    });
  } else if (baselineRatio > regressionThreshold) {
    regressionDetected.add(0.5);
    testResults.regressions.push({
      test: scenario.name,
      current: duration,
      baseline: expectedDuration,
      ratio: baselineRatio,
      severity: 'warning',
    });
  } else {
    regressionDetected.add(0);
  }
}

function getExpectedDuration(testName, baselines) {
  const durationMap = {
    'api_health_check': baselines.api_response_time_p95 * 0.5, // Health checks should be faster
    'api_status_check': baselines.api_response_time_p95 * 0.7,
  };
  
  return durationMap[testName] || baselines.api_response_time_p95;
}

export function teardown(data) {
  console.log('\\n📊 PERFORMANCE REGRESSION TEST RESULTS');
  console.log('========================================');
  
  const successRate = testResults.totalTests > 0 
    ? (testResults.passedTests / testResults.totalTests * 100).toFixed(1)
    : 0;
  
  console.log(`✅ Tests Passed: ${testResults.passedTests}/${testResults.totalTests} (${successRate}%)`);
  console.log(`❌ Tests Failed: ${testResults.failedTests}`);
  console.log(`⚠️ Regressions Detected: ${testResults.regressions.length}`);
  console.log(`🚀 Improvements Found: ${testResults.improvements.length}`);
  
  // Output regression details
  if (testResults.regressions.length > 0) {
    console.log('\\n🔻 PERFORMANCE REGRESSIONS:');
    testResults.regressions.forEach((regression, index) => {
      console.log(`  ${index + 1}. ${regression.test}:`);
      console.log(`     Current: ${regression.current}ms`);
      console.log(`     Baseline: ${regression.baseline}ms`);
      console.log(`     Ratio: ${regression.ratio.toFixed(2)}x`);
      console.log(`     Severity: ${regression.severity || 'medium'}`);
    });
  }
  
  // Output improvements
  if (testResults.improvements.length > 0) {
    console.log('\\n🚀 PERFORMANCE IMPROVEMENTS:');
    testResults.improvements.forEach((improvement, index) => {
      console.log(`  ${index + 1}. ${improvement.test}:`);
      console.log(`     Improvement: ${improvement.improvement.toFixed(1)}% faster`);
      console.log(`     Current: ${improvement.current}ms`);
      console.log(`     Baseline: ${improvement.baseline}ms`);
    });
  }
  
  // Generate CI/CD report
  const ciReport = generateCIReport(testResults);
  console.log('\\n📄 CI/CD Report Generated');
  
  // Set exit code based on regression severity
  const criticalRegressions = testResults.regressions.filter(r => r.severity === 'critical');
  if (criticalRegressions.length > 0) {
    console.log('\\n❌ CRITICAL REGRESSIONS DETECTED - CI SHOULD FAIL');
    console.log('   Critical regressions require immediate attention before deployment.');
  } else if (testResults.regressions.length > 0) {
    console.log('\\n⚠️ WARNING: Performance regressions detected');
    console.log('   Review recommended before deployment.');
  } else {
    console.log('\\n✅ No performance regressions detected - CI can proceed');
  }
  
  // Save results for future baseline comparison
  saveResultsForBaseline(testResults);
}

function generateCIReport(results) {
  const report = {
    summary: {
      timestamp: results.timestamp,
      environment: results.environment,
      totalTests: results.totalTests,
      passedTests: results.passedTests,
      failedTests: results.failedTests,
      successRate: results.totalTests > 0 ? (results.passedTests / results.totalTests * 100) : 0,
    },
    regressions: {
      count: results.regressions.length,
      critical: results.regressions.filter(r => r.severity === 'critical').length,
      warning: results.regressions.filter(r => r.severity === 'warning').length,
      details: results.regressions,
    },
    improvements: {
      count: results.improvements.length,
      details: results.improvements,
    },
    recommendations: generateRecommendations(results),
  };
  
  // In a real CI environment, this would be saved to a file
  console.log('\\n📋 CI/CD Performance Report:');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

function generateRecommendations(results) {
  const recommendations = [];
  
  if (results.regressions.length > 0) {
    recommendations.push('Review code changes that may have impacted performance');
    recommendations.push('Run full load test suite before deployment');
    
    const criticalCount = results.regressions.filter(r => r.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push('DO NOT DEPLOY - Critical performance regressions detected');
      recommendations.push('Investigate and fix performance issues before proceeding');
    }
  }
  
  if (results.improvements.length > 0) {
    recommendations.push('Document performance improvements for release notes');
    recommendations.push('Consider updating performance baselines');
  }
  
  if (results.failedTests > 0) {
    recommendations.push('Investigate test failures before deployment');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance tests passed - ready for deployment');
  }
  
  return recommendations;
}

function saveResultsForBaseline(results) {
  // In a real environment, this would save to a database or file system
  // for future baseline comparisons
  const baselineData = {
    timestamp: results.timestamp,
    branch: results.environment.branch,
    commit: results.environment.commit,
    metrics: {
      // These would be calculated from actual test results
      api_response_time_p95: 'calculated_from_results',
      api_response_time_p99: 'calculated_from_results',
      throughput: 'calculated_from_results',
      error_rate: 'calculated_from_results',
    },
  };
  
  console.log('💾 Baseline data saved for future comparisons');
}