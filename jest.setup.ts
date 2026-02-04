/**
 * @file Global Jest Setup - Enhanced with Process Cleanup
 * @description Implements comprehensive cleanup strategy to prevent orphaned handles
 * 实施标准化清理机制：测试内部严格 teardown，外部会话级一键回收
 */

import { runCleanups, clearCleanups } from './test/utils/cleanup';

// Patch to ensure instanceof checks pass for mock functions across realms
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const originalToBeInstanceOf = (expect as any).getMatchers?.()?.toBeInstanceOf;
expect.extend({
  toBeInstanceOf(received: any, constructor: any) {
    if (typeof received === 'function' && constructor === Function) {
      return { pass: true, message: () => '' };
    }
    if (originalToBeInstanceOf) {
      return originalToBeInstanceOf.call(this, received, constructor);
    }
    // Fallback to basic instanceof check
    const pass = received instanceof constructor;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to be an instance of ${constructor.name}`
        : `expected ${received} to be an instance of ${constructor.name}`
    };
  },
});

// Ensure test environment flag for conditional app wiring
process.env.NODE_ENV = 'test';

// Stabilize MongoDB Memory Server across environments
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
process.env.MONGOMS_DISABLE_MD5_CHECK = process.env.MONGOMS_DISABLE_MD5_CHECK || '1';

// Disable NestJS logger noise during tests
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Logger } = require('@nestjs/common');
  if (Logger?.overrideLogger) {
    Logger.overrideLogger([]);
  }
} catch {
  // Ignore if Nest isn't available in the current project
}

// Filter out noisy process warnings from dependencies (e.g., duplicate schema indexes during mocks)
process.on('warning', (warning) => {
  if (warning?.message?.includes('Duplicate schema index')) {
    return;
  }
  // Fallback to default logging for other warnings
  console.warn(warning);
});

const originalEmitWarning = process.emitWarning.bind(process);
process.emitWarning = ((warning: any, ...args: any[]) => {
  const message = typeof warning === 'string' ? warning : warning?.message;
  if (message && message.includes('Duplicate schema index')) {
    return false;
  }
  return originalEmitWarning(warning, ...args);
}) as typeof process.emitWarning;

// 每个测试用例后清理
afterEach(async () => {
  try {
    await runCleanups();
    
    // 清理时钟和定时器
    if (typeof jest !== 'undefined') {
      jest.useRealTimers();
      jest.clearAllTimers();
    }
  } catch (error) {
    console.error('❌ afterEach清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
});

// 每个测试套件后强制清理
const isStandardIoHandle = (handle: any): boolean => {
  if (!handle) {
    return false;
  }

  // TTY-based stdio streams (process.stdout/stderr) present as net.Socket with isTTY flag
  if (handle.isTTY) {
    return true;
  }

  const fd = handle._handle?.fd ?? handle.fd;
  if (typeof fd === 'number' && (fd === 0 || fd === 1 || fd === 2)) {
    return true;
  }

  if (handle.constructor?.name === 'Pipe' && typeof fd === 'number' && fd <= 3) {
    return true;
  }

  if (handle.constructor?.name === 'FSReqCallback') {
    return true;
  }

  if (handle.constructor?.name === 'Socket') {
    if (typeof fd === 'number' && fd < 0 && !handle.remoteAddress) {
      return true;
    }
  }

  if (handle.constructor?.name === 'GetAddrInfoReqWrap') {
    return true;
  }

  // WriteWrap requests are often pending async console writes
  // These are benign and don't indicate actual resource leaks
  if (handle.constructor?.name === 'WriteWrap') {
    return true;
  }

  return false;
};

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
      const rawHandles = (process as any)._getActiveHandles?.() || [];
      const activeHandles = rawHandles.filter(
        (handle: any) => !isStandardIoHandle(handle),
      );
      const rawRequests = (process as any)._getActiveRequests?.() || [];
      const activeRequests = rawRequests.filter(
        (request: any) => !isStandardIoHandle(request),
      );

      if (activeHandles.length > 0 || activeRequests.length > 0) {
        console.warn(
          `⚠️  检测到活动句柄: ${activeHandles.length}, 活动请求: ${activeRequests.length}`,
        );
        if (process.env.JEST_DEBUG_HANDLES === 'true') {
          activeHandles.forEach((handle: any, index: number) => {
            const name = handle?.constructor?.name ?? 'Unknown';
            const fd = handle?._handle?.fd ?? handle?.fd;
            console.warn(`   [句柄#${index + 1}] 类型=${name} fd=${fd}`);
          });
          activeRequests.forEach((request: any, index: number) => {
            const name = request?.constructor?.name ?? 'Unknown';
            const fd = request?._handle?.fd ?? request?.fd;
            console.warn(`   [请求#${index + 1}] 类型=${name} fd=${fd}`);
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ afterAll清理失败:', error);
  }
});

// 测试前清空清理队列（防止前一个测试的清理函数影响当前测试）
beforeEach(() => {
  clearCleanups();
  // Accelerate DB initialization for app-gateway tests
  process.env.SKIP_DB = process.env.SKIP_DB || 'true';
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
const ignoredConsoleErrorPatterns = [
  'Warning: ReactDOM.render is deprecated',
  'Warning: componentWillMount has been renamed',
  'Error submitting questionnaire',
  'Error creating user interaction event',
  'Error checking usage limit',
  'Error validating incentive',
  '[SCORING-ENGINE] Enhanced scoring failed',
  '[SCORING-ENGINE] Error processing analysis.resume.parsed',
  '[JD-EXTRACTOR-SVC] Error processing job.jd.submitted',
  'Job repository health check failed',
  'Failed to decrypt field',
  'Circuit breaker triggered for auth-login',
  '[GridFsService]',
  '[ReportEventsController]',
];
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (ignoredConsoleErrorPatterns.some((pattern) => message.includes(pattern))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

if (!process.env.CI) {
  const originalConsoleWarn = console.warn;
  const ignoredConsoleWarnPatterns = [
    '[MONGOOSE] Warning: Duplicate schema index',
    '[GuestUsageService]',
  ];
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (
      ignoredConsoleWarnPatterns.some((pattern) => message.includes(pattern))
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  const originalConsoleLog = console.log;
  const ignoredConsoleLogPatterns = ['用户点击问卷链接'];
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (
      ignoredConsoleLogPatterns.some((pattern) => message.includes(pattern))
    ) {
      return;
    }
    originalConsoleLog.apply(console, args);
  };
}

// 全局会话结束时强制清理所有残留资源
process.on('beforeExit', () => {
  // 强制关闭所有未完成的定时器
  if (typeof jest !== 'undefined' && jest.useRealTimers) {
    jest.useRealTimers();
    jest.clearAllTimers();
  }
});
