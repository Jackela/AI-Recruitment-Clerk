// Jest测试环境设置 - Wave 4创建
import { jest } from '@jest/globals';

// 测试环境配置
process.env.NODE_ENV = 'test';
process.env.CI = process.env.CI || 'true';

// 全局测试超时
jest.setTimeout(10000);

// 清理函数注册表
const cleanupFunctions: Array<() => Promise<void> | void> = [];

// 注册清理函数
export const registerCleanup = (fn: () => Promise<void> | void) => {
  cleanupFunctions.push(fn);
};

// 运行清理函数
export const runCleanups = async () => {
  for (const cleanup of cleanupFunctions.splice(0)) {
    try {
      await cleanup();
    } catch (error) {
      console.warn('清理函数执行警告:', error);
    }
  }
};

// 在每个测试后运行清理
afterEach(async () => {
  await runCleanups();
});

// 在所有测试完成后运行清理
afterAll(async () => {
  await runCleanups();
  
  // 给进程一些时间完成清理
  await new Promise(resolve => setTimeout(resolve, 100));
});

// 全局错误处理
process.on('unhandledRejection', (reason) => {
  console.warn('测试中的未处理Promise拒绝:', reason);
});

process.on('uncaughtException', (error) => {
  console.warn('测试中的未捕获异常:', error);
});

// 测试工具函数
export const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...overrides
});

export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
};

// 测试数据工厂
export const createTestJob = (overrides = {}) => ({
  id: 'test-job-001',
  title: '测试职位',
  company: '测试公司',
  location: '上海',
  status: 'active',
  applicants: 0,
  ...overrides
});

export const createTestAnalytics = (overrides = {}) => ({
  totalJobs: 10,
  activeJobs: 8,
  totalApplications: 100,
  pendingReview: 25,
  matchingRate: 75.5,
  ...overrides
});

console.log('✅ Jest测试环境初始化完成');