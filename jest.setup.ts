/**
 * @file Global Jest Setup - Enhanced with Process Cleanup
 * @description Implements comprehensive cleanup strategy to prevent orphaned handles
 * 实施标准化清理机制：测试内部严格 teardown，外部会话级一键回收
 */

import { runCleanups, clearCleanups } from './test/utils/cleanup';

// 每个测试用例后清理
afterEach(async () => {
  try {
    await runCleanups();
  } catch (error) {
    console.error('❌ afterEach清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
});

// 每个测试套件后强制清理
afterAll(async () => {
  try {
    await runCleanups();
    
    // 清理时钟和定时器
    if (typeof jest !== 'undefined') {
      jest.useRealTimers();
      jest.clearAllTimers();
    }
    
    // 检查是否有遗留的活动句柄
    if (process.env.NODE_ENV === 'test') {
      const activeHandles = (process as any)._getActiveHandles?.();
      const activeRequests = (process as any)._getActiveRequests?.();
      
      if (activeHandles?.length > 0 || activeRequests?.length > 0) {
        console.warn(`⚠️  检测到活动句柄: ${activeHandles?.length || 0}, 活动请求: ${activeRequests?.length || 0}`);
      }
    }
  } catch (error) {
    console.error('❌ afterAll清理失败:', error);
  }
});

// 测试前清空清理队列（防止前一个测试的清理函数影响当前测试）
beforeEach(() => {
  clearCleanups();
});

// 设置测试超时
jest.setTimeout(30000);

// 禁用console.log以减少测试噪音（仅在CI环境）
if (process.env.CI) {
  console.log = jest.fn();
  console.info = jest.fn();
}

// 全局错误处理
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // 过滤掉已知的无害警告
  const message = args.join(' ');
  if (message.includes('Warning: ReactDOM.render is deprecated') ||
      message.includes('Warning: componentWillMount has been renamed')) {
    return;
  }
  originalConsoleError.apply(console, args);
};