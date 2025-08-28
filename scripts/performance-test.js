// 快速性能测试脚本
// 测试API响应时间和基本性能指标

const http = require('http');

class PerformanceTest {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async makeRequest(path) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const req = http.get(`${this.baseUrl}${path}`, (res) => {
        const endTime = Date.now();
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            path,
            status: res.statusCode,
            responseTime: endTime - startTime,
            size: Buffer.byteLength(data),
            success: res.statusCode < 400
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testEndpoint(path, expectedStatus = 200) {
    console.log(`📊 测试: ${path}`);
    try {
      const result = await this.makeRequest(path);
      this.results.push(result);
      
      const statusIcon = result.success ? '✅' : '⚠️';
      console.log(`${statusIcon} ${path}: ${result.responseTime}ms (${result.status})`);
      
      return result;
    } catch (error) {
      console.log(`❌ ${path}: 失败 - ${error.message}`);
      this.results.push({
        path,
        responseTime: 5000,
        success: false,
        error: error.message
      });
      return null;
    }
  }

  async runLoadTest(path, concurrency = 5, requests = 10) {
    console.log(`🔥 负载测试: ${path} (${concurrency}并发, ${requests}请求)`);
    
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < requests; i++) {
      promises.push(this.makeRequest(path));
      
      // 控制并发量
      if (promises.length >= concurrency) {
        await Promise.allSettled(promises.splice(0, concurrency));
      }
    }
    
    // 处理剩余请求
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
    
    const totalTime = Date.now() - startTime;
    const rps = (requests / totalTime * 1000).toFixed(2);
    
    console.log(`   总耗时: ${totalTime}ms, RPS: ${rps}`);
    return { totalTime, rps };
  }

  async runAllTests() {
    console.log('⚡ AI招聘助手 - 性能测试');
    console.log('======================================');
    
    // 单个端点响应时间测试
    await this.testEndpoint('/api/health');
    await this.testEndpoint('/api/cache/metrics');
    await this.testEndpoint('/api/docs');
    await this.testEndpoint('/');
    await this.testEndpoint('/api/auth/users', 401); // 期望401
    
    console.log('\n🔥 负载测试');
    console.log('======================================');
    
    // 健康检查端点负载测试
    await this.runLoadTest('/api/health', 3, 10);
    
    // 分析结果
    console.log('\n📈 性能分析');
    console.log('======================================');
    
    const successfulRequests = this.results.filter(r => r.success);
    const failedRequests = this.results.filter(r => !r.success);
    
    if (successfulRequests.length > 0) {
      const responseTimes = successfulRequests.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      
      console.log(`✅ 成功请求: ${successfulRequests.length}`);
      console.log(`❌ 失败请求: ${failedRequests.length}`);
      console.log(`📊 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`⚡ 最快响应: ${minResponseTime}ms`);
      console.log(`🐌 最慢响应: ${maxResponseTime}ms`);
      
      // 性能评估
      if (avgResponseTime < 200) {
        console.log('🚀 性能评级: 优秀');
      } else if (avgResponseTime < 500) {
        console.log('👍 性能评级: 良好');
      } else if (avgResponseTime < 1000) {
        console.log('⚠️ 性能评级: 一般');
      } else {
        console.log('🐌 性能评级: 需要优化');
      }
    }
    
    console.log('\n🎯 性能测试完成!');
    
    // 返回性能评估
    const avgTime = successfulRequests.length > 0 
      ? successfulRequests.reduce((a, b) => a + b.responseTime, 0) / successfulRequests.length 
      : 999999;
    
    return {
      passed: avgTime < 500 && failedRequests.length === 0,
      avgResponseTime: avgTime,
      successRate: successfulRequests.length / this.results.length
    };
  }
}

// 运行测试
if (require.main === module) {
  const tester = new PerformanceTest();
  tester.runAllTests().then(result => {
    process.exit(result.passed ? 0 : 1);
  }).catch(error => {
    console.error('❌ 性能测试失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTest;