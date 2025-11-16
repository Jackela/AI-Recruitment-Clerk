/**
 * 负载测试服务
 * AI Recruitment Clerk - 性能基准测试和负载压力测试
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../cache/cache.service';

/**
 * Defines the shape of the load test config.
 */
export interface LoadTestConfig {
  targetUrl: string;
  concurrency: number;
  duration: number; // 测试持续时间 (秒)
  requestsPerSecond: number;
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  weight: number; // 权重 (百分比)
}

/**
 * Defines the shape of the load test result.
 */
export interface LoadTestResult {
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    throughput: number;
  };

  percentiles: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };

  endpoints: {
    [path: string]: {
      requests: number;
      averageTime: number;
      errorRate: number;
      statusCodes: Record<number, number>;
    };
  };

  errors: {
    type: string;
    count: number;
    message: string;
  }[];

  performance: {
    cpuUsage: NodeJS.CpuUsage;
    memoryUsage: NodeJS.MemoryUsage;
    startTime: number;
    endTime: number;
    duration: number;
  };
}

type RequestResult = {
  workerId: number;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  timestamp: number;
};

type RequestError = {
  workerId: number;
  type: string;
  message: string;
  timestamp: number;
};

type EndpointStats = {
  requests: number;
  totalTime: number;
  errors: number;
  statusCodes: Record<number, number>;
};

type WorkerPerformanceSnapshot = {
  startTime: number;
  endTime: number;
  startCpuUsage: NodeJS.CpuUsage;
  endCpuUsage: NodeJS.CpuUsage;
  startMemoryUsage: NodeJS.MemoryUsage;
  endMemoryUsage: NodeJS.MemoryUsage;
};

/**
 * Provides load testing functionality.
 */
@Injectable()
export class LoadTestingService {
  private readonly logger = new Logger(LoadTestingService.name);

  /**
   * Initializes a new instance of the Load Testing Service.
   * @param configService - The config service.
   * @param cacheService - The cache service.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 执行负载测试
   */
  async executeLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    this.logger.log(
      `🚀 Starting load test: ${config.concurrency} concurrent users, ${config.duration}s duration`,
    );

    const startTime = Date.now();
    const startCpuUsage = process.cpuUsage();
    const startMemoryUsage = process.memoryUsage();

    const results: RequestResult[] = [];
    const errors: RequestError[] = [];
    const endpointStats: Record<string, EndpointStats> = {};

    // 初始化端点统计
    config.endpoints.forEach((endpoint) => {
      endpointStats[endpoint.path] = {
        requests: 0,
        totalTime: 0,
        errors: 0,
        statusCodes: {},
      };
    });

    // 创建并发请求
    const workers = Array.from({ length: config.concurrency }, (_, index) =>
      this.createWorker(index, config, results, errors, endpointStats),
    );

    // 等待所有worker完成
    await Promise.all(workers);

    const endTime = Date.now();
    const endCpuUsage = process.cpuUsage(startCpuUsage);
    const endMemoryUsage = process.memoryUsage();

    // 计算结果
    const performanceSnapshot: WorkerPerformanceSnapshot = {
      startTime,
      endTime,
      startCpuUsage,
      endCpuUsage,
      startMemoryUsage,
      endMemoryUsage,
    };

    const loadTestResult = this.calculateResults(
      results,
      errors,
      endpointStats,
      performanceSnapshot,
    );

    // 保存测试结果
    await this.saveTestResults(config, loadTestResult);

    this.logger.log(
      `✅ Load test completed: ${loadTestResult.summary.requestsPerSecond.toFixed(2)} RPS`,
    );

    return loadTestResult;
  }

  /**
   * 创建工作线程
   */
  private async createWorker(
    workerId: number,
    config: LoadTestConfig,
    results: RequestResult[],
    errors: RequestError[],
    endpointStats: Record<string, EndpointStats>,
  ): Promise<void> {
    const endTime = Date.now() + config.duration * 1000;
    const requestInterval =
      1000 / (config.requestsPerSecond / config.concurrency);

    while (Date.now() < endTime) {
      try {
        const endpoint = this.selectRandomEndpoint(config.endpoints);
        const requestStart = Date.now();

        const response = await this.makeRequest(config.targetUrl, endpoint);

        const responseTime = Date.now() - requestStart;

        // 记录结果
        results.push({
          workerId,
          endpoint: endpoint.path,
          responseTime,
          statusCode: response.status,
          timestamp: requestStart,
        });

        // 更新端点统计
        const stats = endpointStats[endpoint.path];
        stats.requests++;
        stats.totalTime += responseTime;
        stats.statusCodes[response.status] =
          (stats.statusCodes[response.status] || 0) + 1;

        if (response.status >= 400) {
          stats.errors++;
        }

        // 控制请求频率
        await this.sleep(requestInterval);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorName =
          error && typeof error === 'object' && 'constructor' in error
            ? (error as { constructor?: { name?: string } }).constructor?.name ??
              'Error'
            : 'Error';
        errors.push({
          workerId,
          type: errorName,
          message: errorMessage,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(
    baseUrl: string,
    endpoint: LoadTestEndpoint,
  ): Promise<{ status: number }> {
    const url = `${baseUrl}${endpoint.path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(endpoint.headers || {}),
        },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        signal: controller.signal,
      });
      return { status: res.status };
    } catch {
      return { status: 599 }; // network error pseudo-status
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 随机选择端点
   */
  private selectRandomEndpoint(endpoints: LoadTestEndpoint[]): LoadTestEndpoint {
    const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return endpoints[0]; // 默认返回第一个
  }

  /**
   * 计算测试结果
   */
  private calculateResults(
    results: RequestResult[],
    errors: RequestError[],
    endpointStats: Record<string, EndpointStats>,
    performance: WorkerPerformanceSnapshot,
  ): LoadTestResult {
    const duration = (performance.endTime - performance.startTime) / 1000;
    const totalRequests = results.length;
    const successfulRequests = results.filter((r) => r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = results
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);
    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // 计算百分位数
    const percentiles = {
      p50: this.calculatePercentile(responseTimes, 0.5),
      p90: this.calculatePercentile(responseTimes, 0.9),
      p95: this.calculatePercentile(responseTimes, 0.95),
      p99: this.calculatePercentile(responseTimes, 0.99),
    };

    // 处理端点统计
    const processedEndpointStats: LoadTestResult['endpoints'] = {};
    Object.entries(endpointStats).forEach(([path, stats]) => {
      processedEndpointStats[path] = {
        requests: stats.requests,
        averageTime: stats.requests > 0 ? stats.totalTime / stats.requests : 0,
        errorRate:
          stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0,
        statusCodes: stats.statusCodes,
      };
    });

    // 处理错误统计
    const errorSummary = this.summarizeErrors(errors);

    return {
      summary: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: Math.round(averageResponseTime),
        minResponseTime: responseTimes[0] || 0,
        maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
        requestsPerSecond: totalRequests / duration,
        errorRate: (failedRequests / totalRequests) * 100,
        throughput: successfulRequests / duration,
      },
      percentiles,
      endpoints: processedEndpointStats,
      errors: errorSummary,
      performance: {
        cpuUsage: performance.endCpuUsage,
        memoryUsage: performance.endMemoryUsage,
        startTime: performance.startTime,
        endTime: performance.endTime,
        duration: Math.round(duration * 1000), // 转换为毫秒
      },
    };
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(
    sortedArray: number[],
    percentile: number,
  ): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * 汇总错误信息
   */
  private summarizeErrors(
    errors: RequestError[],
  ): LoadTestResult['errors'] {
    const errorMap = new Map<string, { count: number; message: string }>();

    errors.forEach((error) => {
      const key = error.type;
      const existing = errorMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        errorMap.set(key, { count: 1, message: error.message });
      }
    });

    return Array.from(errorMap.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      message: data.message,
    }));
  }

  /**
   * 保存测试结果
   */
  private async saveTestResults(
    config: LoadTestConfig,
    result: LoadTestResult,
  ): Promise<void> {
    try {
      const testId = `load_test_${Date.now()}`;
      const resultKey = this.cacheService.generateKey(
        'load_test',
        'results',
        testId,
      );

      const testRecord = {
        id: testId,
        config,
        result,
        timestamp: new Date().toISOString(),
      };

      // 保存到缓存 (24小时)
      await this.cacheService.set(resultKey, testRecord, { ttl: 86400000 });

      this.logger.log(`💾 Load test results saved: ${testId}`);
    } catch (error) {
      this.logger.error('Failed to save load test results:', error);
    }
  }

  /**
   * 获取预定义的测试配置
   */
  getDefaultConfigs(): Record<string, LoadTestConfig> {
    const baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';

    return {
      light: {
        targetUrl: baseUrl,
        concurrency: 10,
        duration: 60,
        requestsPerSecond: 50,
        endpoints: [
          { path: '/api/health', method: 'GET', weight: 30 },
          { path: '/api/jobs', method: 'GET', weight: 40 },
          { path: '/api/performance/stats', method: 'GET', weight: 20 },
          {
            path: '/api/guest/resume/demo-analysis',
            method: 'GET',
            weight: 10,
          },
        ],
      },

      moderate: {
        targetUrl: baseUrl,
        concurrency: 50,
        duration: 120,
        requestsPerSecond: 200,
        endpoints: [
          { path: '/api/health', method: 'GET', weight: 20 },
          { path: '/api/jobs', method: 'GET', weight: 30 },
          { path: '/api/performance/stats', method: 'GET', weight: 25 },
          {
            path: '/api/guest/resume/demo-analysis',
            method: 'GET',
            weight: 15,
          },
          { path: '/api/performance/cache', method: 'GET', weight: 10 },
        ],
      },

      heavy: {
        targetUrl: baseUrl,
        concurrency: 100,
        duration: 300,
        requestsPerSecond: 500,
        endpoints: [
          { path: '/api/health', method: 'GET', weight: 15 },
          { path: '/api/jobs', method: 'GET', weight: 25 },
          { path: '/api/performance/stats', method: 'GET', weight: 20 },
          {
            path: '/api/guest/resume/demo-analysis',
            method: 'GET',
            weight: 20,
          },
          { path: '/api/performance/cache', method: 'GET', weight: 10 },
          { path: '/api/performance/database', method: 'GET', weight: 10 },
        ],
      },

      stress: {
        targetUrl: baseUrl,
        concurrency: 200,
        duration: 180,
        requestsPerSecond: 1000,
        endpoints: [
          { path: '/api/health', method: 'GET', weight: 10 },
          { path: '/api/jobs', method: 'GET', weight: 30 },
          { path: '/api/performance/stats', method: 'GET', weight: 25 },
          {
            path: '/api/guest/resume/demo-analysis',
            method: 'GET',
            weight: 20,
          },
          { path: '/api/performance/cache', method: 'GET', weight: 10 },
          { path: '/api/performance/database', method: 'GET', weight: 5 },
        ],
      },
    };
  }

  /**
   * 生成性能基准报告
   */
  async generateBenchmarkReport(testType = 'moderate'): Promise<{
    testConfig: LoadTestConfig;
    result: LoadTestResult;
    analysis: {
      performance: 'excellent' | 'good' | 'fair' | 'poor';
      bottlenecks: string[];
      recommendations: string[];
    };
  }> {
    const configs = this.getDefaultConfigs();
    const config = configs[testType];

    if (!config) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    const result = await this.executeLoadTest(config);
    const analysis = this.analyzeResults(result);

    return {
      testConfig: config,
      result,
      analysis,
    };
  }

  /**
   * 分析测试结果
   */
  private analyzeResults(result: LoadTestResult): {
    performance: 'excellent' | 'good' | 'fair' | 'poor';
    bottlenecks: string[];
    recommendations: string[];
  } {
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    let performanceScore = 100;

    // 分析响应时间
    if (result.summary.averageResponseTime > 500) {
      performanceScore -= 30;
      bottlenecks.push('平均响应时间过长');
      recommendations.push('优化数据库查询和缓存策略');
    } else if (result.summary.averageResponseTime > 200) {
      performanceScore -= 15;
      bottlenecks.push('响应时间偏慢');
      recommendations.push('考虑增加缓存和优化代码');
    }

    // 分析错误率
    if (result.summary.errorRate > 5) {
      performanceScore -= 25;
      bottlenecks.push('错误率过高');
      recommendations.push('检查错误处理和系统稳定性');
    } else if (result.summary.errorRate > 1) {
      performanceScore -= 10;
      bottlenecks.push('错误率偏高');
      recommendations.push('改进错误处理机制');
    }

    // 分析吞吐量
    if (result.summary.requestsPerSecond < 50) {
      performanceScore -= 20;
      bottlenecks.push('吞吐量不足');
      recommendations.push('优化服务器配置和并发处理');
    }

    // 分析95百分位响应时间
    if (result.percentiles.p95 > 1000) {
      performanceScore -= 15;
      bottlenecks.push('长尾响应时间过长');
      recommendations.push('优化慢查询和资源竞争');
    }

    // 确定性能等级
    let performance: 'excellent' | 'good' | 'fair' | 'poor';
    if (performanceScore >= 90) {
      performance = 'excellent';
    } else if (performanceScore >= 70) {
      performance = 'good';
    } else if (performanceScore >= 50) {
      performance = 'fair';
    } else {
      performance = 'poor';
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，继续保持');
    }

    return {
      performance,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * 工具方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取历史测试结果
   */
  async getTestHistory(limit = 10): Promise<
    Array<{
      id: string;
      config: LoadTestConfig;
      result: LoadTestResult;
      timestamp: string;
    }>
  > {
    try {
      // 这里应该从持久化存储中获取历史记录
      // 现在从缓存中获取最近的结果
      const historyKey = this.cacheService.generateKey('load_test', 'history');
      const history =
        (await this.cacheService.get<
          Array<{
            id: string;
            config: LoadTestConfig;
            result: LoadTestResult;
            timestamp: string;
          }>
        >(historyKey)) || [];

      return history.slice(-limit);
    } catch (error) {
      this.logger.error('Failed to get test history:', error);
      return [];
    }
  }
}
