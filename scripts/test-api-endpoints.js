#!/usr/bin/env node

/**
 * Quick API Endpoint Testing Script
 * 测试修复后的API端点
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_PREFIX = '/api';

console.log('🧪 Testing API Endpoints');
console.log('========================\n');

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test-Script/1.0',
        ...options.headers
      },
      timeout: 10000
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: null
          };
          
          if (res.headers['content-type']?.includes('application/json')) {
            result.json = JSON.parse(data);
          }
          
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
            json: null,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEndpoint(name, path, expectedStatus = 200, options = {}) {
  console.log(`🔍 Testing: ${name}`);
  console.log(`   URL: ${BASE_URL}${path}`);
  
  try {
    const result = await makeRequest(path, options);
    const success = result.statusCode === expectedStatus;
    
    console.log(`   Status: ${result.statusCode} ${success ? '✅' : '❌'}`);
    
    if (result.json) {
      console.log(`   Response: ${JSON.stringify(result.json, null, 2).substring(0, 200)}...`);
    } else if (result.body) {
      console.log(`   Response: ${result.body.substring(0, 100)}...`);
    }
    
    return { name, success, statusCode: result.statusCode, response: result.json || result.body };
  } catch (error) {
    console.log(`   ERROR: ${error.message} ❌`);
    return { name, success: false, error: error.message };
  } finally {
    console.log('');
  }
}

async function runTests() {
  const tests = [
    {
      name: 'Health Check',
      path: `${API_PREFIX}/health`,
      expectedStatus: 200
    },
    {
      name: 'API Documentation',
      path: `${API_PREFIX}/docs`,
      expectedStatus: 200
    },
    {
      name: 'Cache Metrics',
      path: `${API_PREFIX}/cache/metrics`,
      expectedStatus: 200
    },
    {
      name: 'Jobs List (No Auth Required - should fail)',
      path: `${API_PREFIX}/jobs`,
      expectedStatus: 401  // Expecting authentication required
    },
    {
      name: 'Guest Resume Upload Endpoint Check',
      path: `${API_PREFIX}/guest/resume/demo-analysis`,
      expectedStatus: 200
    },
    {
      name: 'Root Path (Built-in UI)',
      path: '/',
      expectedStatus: 200
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.path, test.expectedStatus);
    results.push(result);
  }

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || `Status ${r.statusCode}`}`);
    });
  }
  
  console.log('\n🎯 Next Steps:');
  if (passed >= 4) {
    console.log('✅ Core API endpoints are working!');
    console.log('   Try uploading a resume through the web interface.');
  } else {
    console.log('⚠️  Some core endpoints are not responding correctly.');
    console.log('   Check the application logs for more details.');
  }
}

// Run the tests
runTests().catch(console.error);