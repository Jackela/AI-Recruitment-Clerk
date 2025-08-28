// K6负载测试脚本 - AI Recruitment API性能测试
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// 测试配置
export let options = {
  stages: [
    // 快速基准测试 - 性能优化前
    { duration: '30s', target: 5 },   // 30秒内增加到5个用户
    { duration: '2m', target: 20 },   // 2分钟负载测试
    { duration: '1m', target: 50 },   // 1分钟峰值测试
    { duration: '30s', target: 0 },   // 30秒恢复
  ],
  thresholds: {
    // 性能指标阈值
    http_req_duration: ['p(95)<2000'],          // 95%请求响应时间<2秒
    http_req_duration: ['p(99)<5000'],          // 99%请求响应时间<5秒
    http_req_failed: ['rate<0.1'],              // 错误率<10%
    http_reqs: ['rate>10'],                     // 每秒请求数>10
    // 业务指标阈值
    'api_health_check': ['p(95)<500'],          // 健康检查95%响应时间<500ms
    'job_creation': ['p(95)<3000'],             // 职位创建95%响应时间<3秒
    'resume_upload': ['p(95)<5000'],            // 简历上传95%响应时间<5秒
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 },
      },
    },
  },
};

// 测试数据
const testData = new SharedArray('test-data', function () {
  return [
    {
      jobTitle: 'Senior JavaScript Developer',
      description: '寻找经验丰富的JavaScript全栈开发工程师',
      requirements: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
    },
    {
      jobTitle: 'Python Backend Engineer', 
      description: '招聘Python后端开发工程师，熟悉Django/FastAPI',
      requirements: ['Python', 'Django', 'PostgreSQL', 'Redis'],
    },
    {
      jobTitle: 'DevOps Engineer',
      description: '需要DevOps工程师负责CI/CD和基础设施管理',
      requirements: ['Docker', 'Kubernetes', 'AWS', 'Terraform'],
    },
  ];
});

// 基础URL配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';

// 认证令牌 (在实际测试中应该动态获取)
let authToken = '';

export function setup() {
  // 初始化设置，获取认证令牌
  console.log('🚀 开始性能测试初始化...');
  
  // 跳过登录，直接测试公开端点
  console.log('🔓 跳过认证，测试公开API端点');
  
  return { authToken: '' };
}

export default function (data) {
  const token = data ? data.authToken : authToken;
  
  // 请求头配置
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 测试场景权重配置
  const scenarios = [
    { name: 'health_check', weight: 30, func: testHealthCheck },
    { name: 'job_listing', weight: 25, func: testJobListing },
    { name: 'job_creation', weight: 15, func: testJobCreation },
    { name: 'resume_upload', weight: 10, func: testResumeUpload },
    { name: 'job_search', weight: 20, func: testJobSearch },
  ];
  
  // 随机选择测试场景
  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  randomScenario.func(headers);
  
  // 随机等待时间 (模拟用户行为)
  sleep(Math.random() * 3 + 1); // 1-4秒随机等待
}

// 健康检查测试
function testHealthCheck(headers) {
  const response = http.get(`${BASE_URL}/health`, { headers });
  
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
    'health check has status ok': (r) => {
      const body = JSON.parse(r.body);
      return body.status === 'ok';
    },
  }, { api_health_check: true });
}

// 职位列表测试
function testJobListing(headers) {
  const response = http.get(`${BASE_URL}/jobs?page=1&limit=20`, { headers });
  
  check(response, {
    'job listing status is 200': (r) => r.status === 200,
    'job listing response time < 1000ms': (r) => r.timings.duration < 1000,
    'job listing returns array': (r) => {
      const body = JSON.parse(r.body);
      return Array.isArray(body.data);
    },
  });
}

// 职位创建测试
function testJobCreation(headers) {
  const jobData = testData[Math.floor(Math.random() * testData.length)];
  
  const payload = JSON.stringify({
    title: jobData.jobTitle,
    description: jobData.description,
    requirements: jobData.requirements,
    location: '北京',
    employmentType: 'full-time',
    salaryMin: 15000,
    salaryMax: 25000,
  });
  
  const response = http.post(`${BASE_URL}/jobs`, payload, { headers });
  
  check(response, {
    'job creation status is 202': (r) => r.status === 202,
    'job creation response time < 3000ms': (r) => r.timings.duration < 3000,
    'job creation returns job id': (r) => {
      if (r.status === 202) {
        const body = JSON.parse(r.body);
        return body.jobId && body.jobId.length > 0;
      }
      return false;
    },
  }, { job_creation: true });
}

// 简历上传测试
function testResumeUpload(headers) {
  // 模拟文件上传 (这里使用文本数据模拟)
  const formData = {
    'resumes': http.file('resume.pdf', 'fake-pdf-content', 'application/pdf'),
  };
  
  const response = http.post(`${BASE_URL}/jobs/test-job-id/resumes`, formData, {
    headers: { ...headers, 'Content-Type': undefined },
  });
  
  check(response, {
    'resume upload status is 202': (r) => r.status === 202,
    'resume upload response time < 5000ms': (r) => r.timings.duration < 5000,
  }, { resume_upload: true });
}

// 职位搜索测试
function testJobSearch(headers) {
  const keywords = ['JavaScript', 'Python', 'DevOps', '全栈', '后端'];
  const keyword = keywords[Math.floor(Math.random() * keywords.length)];
  
  const response = http.get(`${BASE_URL}/jobs/search?q=${keyword}&page=1&limit=10`, { headers });
  
  check(response, {
    'job search status is 200': (r) => r.status === 200,
    'job search response time < 1500ms': (r) => r.timings.duration < 1500,
    'job search returns results': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.length >= 0;
    },
  });
}

// 测试完成后的总结
export function handleSummary(data) {
  console.log('📊 性能测试完成，正在生成报告...');
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/results/summary.json': JSON.stringify(data),
    '/results/summary.html': htmlReport(data),
  };
}

// HTML报告生成
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>AI Recruitment Clerk - 性能测试报告</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .metric-title { font-weight: bold; color: #333; }
        .metric-value { font-size: 1.5em; color: #2196F3; }
        .threshold-ok { color: #4CAF50; }
        .threshold-fail { color: #F44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 AI Recruitment Clerk 性能测试报告</h1>
        <p>测试时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
    
    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">总请求数</div>
            <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">平均响应时间</div>
            <div class="metric-value">${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">P95响应时间</div>
            <div class="metric-value">${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</div>
        </div>
        
        <div class="metric-card">
            <div class="metric-title">错误率</div>
            <div class="metric-value">${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%</div>
        </div>
    </div>
    
    <h2>详细指标</h2>
    <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
</body>
</html>`;
}