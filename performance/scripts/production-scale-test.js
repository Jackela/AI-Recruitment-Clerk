// Production-Scale Load Testing Script for AI Recruitment Clerk
// Target: 1000+ concurrent users, production SLA validation

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics for production validation
const errorRate = new Rate('production_errors');
const apiResponseTime = new Trend('api_response_time');
const dbOperationTime = new Trend('db_operation_time');
const fileProcessingTime = new Trend('file_processing_time');

// Production Load Testing Configuration
export let options = {
  scenarios: {
    // Baseline Load Test (100 concurrent users)
    baseline_load: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      tags: { scenario: 'baseline' },
    },
    
    // Peak Load Test (500 concurrent users)
    peak_load: {
      executor: 'constant-vus',
      vus: 500,
      duration: '10m',
      startTime: '5m',
      tags: { scenario: 'peak' },
    },
    
    // Stress Test (1000+ concurrent users)
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '2m', target: 800 },
        { duration: '3m', target: 1000 },
        { duration: '2m', target: 1200 }, // Beyond target
        { duration: '5m', target: 0 },
      ],
      startTime: '15m',
      tags: { scenario: 'stress' },
    },
    
    // Soak Test (Extended Load)
    soak_test: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30m',
      startTime: '30m',
      tags: { scenario: 'soak' },
    },
  },
  
  // Production SLA Thresholds
  thresholds: {
    // API Response Time SLAs
    'http_req_duration': [
      'p(95)<200',     // 95% of requests < 200ms
      'p(99)<500',     // 99% of requests < 500ms
    ],
    'api_response_time': [
      'p(95)<200',
      'p(99)<500',
    ],
    
    // System Reliability SLAs
    'http_req_failed': ['rate<0.001'], // <0.1% error rate
    'production_errors': ['rate<0.001'],
    
    // Database Performance SLAs
    'db_operation_time': [
      'p(95)<100',     // 95% of DB ops < 100ms
      'p(99)<500',     // 99% of DB ops < 500ms
    ],
    
    // File Processing SLAs
    'file_processing_time': [
      'p(95)<30000',   // 95% of file processing < 30s
      'p(99)<60000',   // 99% of file processing < 60s
    ],
    
    // Throughput SLAs
    'http_reqs': ['rate>100'], // >100 requests/second
  },
  
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:us:oregon': { loadZone: 'amazon:us:oregon', percent: 30 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 20 },
      },
    },
  },
};

// Production Test Data
const testData = new SharedArray('production-test-data', function () {
  return [
    {
      // Authentication Test Data
      users: [
        { email: 'prod.user1@test.com', password: 'Production123!' },
        { email: 'prod.user2@test.com', password: 'Production123!' },
        { email: 'prod.admin@test.com', password: 'Production123!' },
      ],
      
      // Job Creation Test Data
      jobs: [
        {
          title: 'Senior Full-Stack Developer',
          description: 'Looking for an experienced full-stack developer with React and Node.js expertise',
          requirements: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'AWS'],
          location: 'Remote',
          salaryMin: 80000,
          salaryMax: 120000,
        },
        {
          title: 'DevOps Engineer',
          description: 'Infrastructure and deployment specialist needed for growing startup',
          requirements: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'CI/CD'],
          location: 'New York',
          salaryMin: 90000,
          salaryMax: 130000,
        },
        {
          title: 'Data Scientist',
          description: 'ML/AI specialist for data-driven recruitment platform',
          requirements: ['Python', 'TensorFlow', 'scikit-learn', 'SQL', 'Statistics'],
          location: 'San Francisco',
          salaryMin: 100000,
          salaryMax: 150000,
        },
      ],
      
      // Resume Upload Test Data
      resumes: [
        {
          filename: 'senior_developer_resume.pdf',
          content: 'Senior Full-Stack Developer with 5+ years experience...',
          candidateName: 'John Developer',
          candidateEmail: 'john.dev@example.com',
        },
        {
          filename: 'devops_engineer_resume.pdf',
          content: 'DevOps Engineer specializing in cloud infrastructure...',
          candidateName: 'Jane DevOps',
          candidateEmail: 'jane.devops@example.com',
        },
      ],
      
      // Search Queries
      searchQueries: [
        { skills: ['JavaScript', 'React'], experience: { min: 2, max: 8 } },
        { skills: ['Python', 'Machine Learning'], location: 'Remote' },
        { skills: ['Docker', 'Kubernetes'], experience: { min: 3, max: 10 } },
        { location: 'New York', salaryMin: 70000 },
        { education: 'Bachelor', skills: ['Java', 'Spring'] },
      ],
    }
  ];
});

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:4200';

// Authentication tokens (in production, these would be obtained dynamically)
let authTokens = [];

export function setup() {
  console.log('🚀 Production Load Testing Setup');
  console.log(`📊 Target: ${BASE_URL}`);
  console.log('⚡ Scenarios: Baseline(100) → Peak(500) → Stress(1000+) → Soak(30m)');
  
  // Pre-authenticate users for production testing
  const users = testData[0].users;
  
  users.forEach((user, index) => {
    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginResponse.status === 200) {
      const token = loginResponse.json('data.accessToken');
      authTokens.push(token);
      console.log(`✅ User ${index + 1} authenticated`);
    } else {
      console.log(`❌ User ${index + 1} authentication failed`);
    }
  });
  
  return { authTokens, testData: testData[0] };
}

export default function (data) {
  const scenario = __ENV.K6_SCENARIO || 'unknown';
  
  // Weighted scenario selection based on real user behavior
  const scenarioWeights = {
    health_check: 10,        // System monitoring
    authentication: 15,      // User login/logout
    job_listing: 20,         // Browse jobs
    job_search: 15,          // Search functionality
    job_creation: 10,        // Create job postings
    resume_upload: 15,       // Upload resumes
    resume_processing: 10,   // Process resumes
    report_generation: 5,    // Generate reports
  };
  
  const selectedScenario = selectWeightedScenario(scenarioWeights);
  executeScenario(selectedScenario, data);
  
  // Simulate realistic user think time
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

function selectWeightedScenario(weights) {
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  const random = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (const [scenario, weight] of Object.entries(weights)) {
    currentWeight += weight;
    if (random <= currentWeight) {
      return scenario;
    }
  }
  
  return 'health_check'; // Fallback
}

function executeScenario(scenario, data) {
  switch (scenario) {
    case 'health_check':
      testHealthCheck();
      break;
    case 'authentication':
      testAuthentication(data);
      break;
    case 'job_listing':
      testJobListing(data);
      break;
    case 'job_search':
      testJobSearch(data);
      break;
    case 'job_creation':
      testJobCreation(data);
      break;
    case 'resume_upload':
      testResumeUpload(data);
      break;
    case 'resume_processing':
      testResumeProcessing(data);
      break;
    case 'report_generation':
      testReportGeneration(data);
      break;
    default:
      testHealthCheck();
  }
}

// Test Scenarios

function testHealthCheck() {
  const startTime = Date.now();
  const response = http.get(`${BASE_URL}/health`);
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'health check status 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
    'health check has status ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });
  
  apiResponseTime.add(duration);
  errorRate.add(!success);
}

function testAuthentication(data) {
  const user = data.testData.users[Math.floor(Math.random() * data.testData.users.length)];
  const startTime = Date.now();
  
  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'login status 200': (r) => r.status === 200,
    'login response time < 1000ms': (r) => r.timings.duration < 1000,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken;
      } catch (e) {
        return false;
      }
    },
  });
  
  apiResponseTime.add(duration);
  errorRate.add(!success);
}

function testJobListing(data) {
  const token = getRandomToken(data);
  const startTime = Date.now();
  
  const response = http.get(`${BASE_URL}/jobs?page=1&limit=20`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'job listing status 200': (r) => r.status === 200,
    'job listing response time < 800ms': (r) => r.timings.duration < 800,
  });
  
  apiResponseTime.add(duration);
  dbOperationTime.add(duration); // Job listing involves DB queries
  errorRate.add(!success);
}

function testJobSearch(data) {
  const token = getRandomToken(data);
  const query = data.testData.searchQueries[Math.floor(Math.random() * data.testData.searchQueries.length)];
  const startTime = Date.now();
  
  const queryString = new URLSearchParams({
    skills: query.skills ? query.skills.join(',') : '',
    location: query.location || '',
    experienceMin: query.experience?.min || '',
    experienceMax: query.experience?.max || '',
    page: 1,
    limit: 10,
  }).toString();
  
  const response = http.get(`${BASE_URL}/jobs/search?${queryString}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'job search status 200': (r) => r.status === 200,
    'job search response time < 1500ms': (r) => r.timings.duration < 1500,
  });
  
  apiResponseTime.add(duration);
  dbOperationTime.add(duration);
  errorRate.add(!success);
}

function testJobCreation(data) {
  const token = getRandomToken(data);
  const job = data.testData.jobs[Math.floor(Math.random() * data.testData.jobs.length)];
  const startTime = Date.now();
  
  const jobData = {
    ...job,
    title: `${job.title} - ${Date.now()}`, // Unique title
    employmentType: 'full-time',
  };
  
  const response = http.post(`${BASE_URL}/jobs`, JSON.stringify(jobData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'job creation status 202': (r) => r.status === 202,
    'job creation response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  apiResponseTime.add(duration);
  dbOperationTime.add(duration);
  errorRate.add(!success);
}

function testResumeUpload(data) {
  const token = getRandomToken(data);
  const resume = data.testData.resumes[Math.floor(Math.random() * data.testData.resumes.length)];
  const startTime = Date.now();
  
  const formData = {
    'resumes': http.file(resume.filename, resume.content, 'application/pdf'),
    'candidateName': resume.candidateName,
    'candidateEmail': resume.candidateEmail,
  };
  
  const response = http.post(`${BASE_URL}/jobs/test-job-id/resumes`, formData, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'resume upload status 202': (r) => r.status === 202,
    'resume upload response time < 30000ms': (r) => r.timings.duration < 30000,
  });
  
  apiResponseTime.add(duration);
  fileProcessingTime.add(duration);
  errorRate.add(!success);
}

function testResumeProcessing(data) {
  const token = getRandomToken(data);
  const startTime = Date.now();
  
  const response = http.get(`${BASE_URL}/jobs/test-job-id/resumes`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'resume processing status 200': (r) => r.status === 200,
    'resume processing response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  apiResponseTime.add(duration);
  dbOperationTime.add(duration);
  errorRate.add(!success);
}

function testReportGeneration(data) {
  const token = getRandomToken(data);
  const startTime = Date.now();
  
  const response = http.get(`${BASE_URL}/jobs/test-job-id/reports`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'report generation status 200': (r) => r.status === 200,
    'report generation response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  apiResponseTime.add(duration);
  dbOperationTime.add(duration);
  errorRate.add(!success);
}

function getRandomToken(data) {
  if (data.authTokens && data.authTokens.length > 0) {
    return data.authTokens[Math.floor(Math.random() * data.authTokens.length)];
  }
  return ''; // No token available
}

// Enhanced Report Generation
export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  const scenario = __ENV.K6_SCENARIO || 'production';
  
  console.log('\\n🚀 PRODUCTION LOAD TEST COMPLETED');
  console.log('====================================');
  
  // SLA Validation
  const slaResults = validateSLAs(data.metrics);
  
  const htmlReport = generateProductionReport(data, slaResults, timestamp);
  const jsonReport = {
    timestamp,
    scenario,
    metrics: data.metrics,
    slaResults,
    summary: data.summary || {},
  };
  
  console.log('📊 SLA Compliance Summary:');
  Object.entries(slaResults).forEach(([metric, result]) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${metric}: ${status} (${result.value} vs ${result.threshold})`);
  });
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`/results/production-test-${timestamp}.json`]: JSON.stringify(jsonReport, null, 2),
    [`/results/production-test-${timestamp}.html`]: htmlReport,
    '/results/latest-production-test.json': JSON.stringify(jsonReport, null, 2),
  };
}

function validateSLAs(metrics) {
  const results = {};
  
  // API Response Time SLAs
  if (metrics.http_req_duration) {
    results['API_Response_P95'] = {
      value: metrics.http_req_duration.values['p(95)'],
      threshold: 200,
      passed: metrics.http_req_duration.values['p(95)'] < 200,
    };
    
    results['API_Response_P99'] = {
      value: metrics.http_req_duration.values['p(99)'],
      threshold: 500,
      passed: metrics.http_req_duration.values['p(99)'] < 500,
    };
  }
  
  // Error Rate SLA
  if (metrics.http_req_failed) {
    results['Error_Rate'] = {
      value: `${(metrics.http_req_failed.values.rate * 100).toFixed(3)}%`,
      threshold: '0.1%',
      passed: metrics.http_req_failed.values.rate < 0.001,
    };
  }
  
  // Throughput SLA
  if (metrics.http_reqs) {
    results['Throughput'] = {
      value: `${metrics.http_reqs.values.rate.toFixed(1)} req/s`,
      threshold: '100 req/s',
      passed: metrics.http_reqs.values.rate > 100,
    };
  }
  
  return results;
}

function generateProductionReport(data, slaResults, timestamp) {
  const passedSLAs = Object.values(slaResults).filter(r => r.passed).length;
  const totalSLAs = Object.keys(slaResults).length;
  const slaComplianceRate = totalSLAs > 0 ? (passedSLAs / totalSLAs * 100).toFixed(1) : '0';
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Recruitment Clerk - Production Load Test Report</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header .subtitle { opacity: 0.9; margin-top: 10px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; padding: 30px; }
        .metric-card { background: white; border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-title { font-weight: 600; color: #495057; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: 700; margin-bottom: 5px; }
        .metric-unit { font-size: 14px; color: #6c757d; }
        .sla-pass { color: #28a745; }
        .sla-fail { color: #dc3545; }
        .sla-warning { color: #ffc107; }
        .section { margin: 30px; }
        .section-title { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #495057; }
        .sla-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .sla-table th, .sla-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .sla-table th { background-color: #f8f9fa; font-weight: 600; }
        .compliance-badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: 600; font-size: 12px; }
        .compliance-excellent { background-color: #d4edda; color: #155724; }
        .compliance-good { background-color: #fff3cd; color: #856404; }
        .compliance-poor { background-color: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Production Load Test Report</h1>
            <div class="subtitle">AI Recruitment Clerk System Performance Validation</div>
            <div class="subtitle">Test Completed: ${timestamp}</div>
            <div class="subtitle">SLA Compliance: <span class="compliance-badge ${slaComplianceRate >= 90 ? 'compliance-excellent' : slaComplianceRate >= 70 ? 'compliance-good' : 'compliance-poor'}">${slaComplianceRate}% (${passedSLAs}/${totalSLAs})</span></div>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-title">Total Requests</div>
                <div class="metric-value">${data.metrics.http_reqs?.values?.count || 'N/A'}</div>
                <div class="metric-unit">requests</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Average Response Time</div>
                <div class="metric-value ${data.metrics.http_req_duration?.values?.avg < 200 ? 'sla-pass' : 'sla-fail'}">${data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 'N/A'}</div>
                <div class="metric-unit">ms</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">P95 Response Time</div>
                <div class="metric-value ${data.metrics.http_req_duration?.values?.['p(95)'] < 200 ? 'sla-pass' : 'sla-fail'}">${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 'N/A'}</div>
                <div class="metric-unit">ms (SLA: <200ms)</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">P99 Response Time</div>
                <div class="metric-value ${data.metrics.http_req_duration?.values?.['p(99)'] < 500 ? 'sla-pass' : 'sla-fail'}">${data.metrics.http_req_duration?.values?.['p(99)']?.toFixed(2) || 'N/A'}</div>
                <div class="metric-unit">ms (SLA: <500ms)</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Error Rate</div>
                <div class="metric-value ${data.metrics.http_req_failed?.values?.rate < 0.001 ? 'sla-pass' : 'sla-fail'}">${((data.metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(3)}</div>
                <div class="metric-unit">% (SLA: <0.1%)</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Throughput</div>
                <div class="metric-value ${data.metrics.http_reqs?.values?.rate > 100 ? 'sla-pass' : 'sla-fail'}">${data.metrics.http_reqs?.values?.rate?.toFixed(1) || 'N/A'}</div>
                <div class="metric-unit">req/s (SLA: >100)</div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📋 SLA Compliance Report</div>
            <table class="sla-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Actual Value</th>
                        <th>SLA Threshold</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(slaResults).map(([metric, result]) => `
                        <tr>
                            <td>${metric.replace(/_/g, ' ')}</td>
                            <td>${result.value}</td>
                            <td>${result.threshold}</td>
                            <td class="${result.passed ? 'sla-pass' : 'sla-fail'}">${result.passed ? '✅ PASS' : '❌ FAIL'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <div class="section-title">🎯 Production Readiness Assessment</div>
            <div style="padding: 20px; background-color: ${slaComplianceRate >= 90 ? '#d4edda' : slaComplianceRate >= 70 ? '#fff3cd' : '#f8d7da'}; border-radius: 8px; margin-top: 15px;">
                <strong>Overall Status:</strong> 
                ${slaComplianceRate >= 90 ? 
                    '🟢 READY FOR PRODUCTION - All critical SLAs met' : 
                    slaComplianceRate >= 70 ? 
                        '🟡 REQUIRES OPTIMIZATION - Some SLAs need attention' : 
                        '🔴 NOT READY FOR PRODUCTION - Critical SLAs failing'
                }
                <br><br>
                <strong>Recommendations:</strong>
                <ul>
                    ${slaComplianceRate < 90 ? '<li>Address failing SLA metrics before production deployment</li>' : '<li>Monitor performance continuously in production</li>'}
                    ${data.metrics.http_req_duration?.values?.['p(95)'] >= 200 ? '<li>Optimize API response times - consider caching, database indexing, or connection pooling</li>' : ''}
                    ${data.metrics.http_req_failed?.values?.rate >= 0.001 ? '<li>Investigate and fix error sources to improve reliability</li>' : ''}
                    ${data.metrics.http_reqs?.values?.rate <= 100 ? '<li>Scale infrastructure to handle required throughput</li>' : ''}
                    <li>Set up production monitoring with these performance baselines</li>
                    <li>Implement automated performance regression testing</li>
                </ul>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📊 Detailed Metrics</div>
            <pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${JSON.stringify(data.metrics, null, 2)}</pre>
        </div>
    </div>
</body>
</html>`;
}