// 全局测试设置
import 'reflect-metadata';

// Jest扩展匹配器
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// 全局变量声明
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Mock console.log for performance tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // 在测试期间减少日志输出
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // 恢复原始console方法
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// 全局测试超时设置
jest.setTimeout(30000);

// Mock localStorage for frontend tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Only define window properties if in browser environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
    writable: true,
  });
}

// 清理函数
beforeEach(() => {
  // 清理所有mock
  jest.clearAllMocks();
  
  // 重置localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// 测试工具函数
export const testUtils = {
  createMockFeedbackCode: (overrides = {}) => ({
    id: '507f1f77bcf86cd799439011',
    code: 'FB123456789ABCD',
    generatedAt: new Date('2023-01-01T10:00:00Z'),
    isUsed: false,
    paymentStatus: 'pending' as const,
    paymentAmount: 3.00,
    ...overrides
  }),

  createMockStats: (overrides = {}) => ({
    totalCodes: 100,
    usedCodes: 80,
    pendingPayments: 15,
    totalPaid: 195,
    averageQualityScore: 4.2,
    ...overrides
  }),

  createMockQuestionnaireData: (quality: 'high' | 'medium' | 'low' = 'high') => {
    const data = {
      high: {
        problems: '系统响应速度有时候比较慢，特别是在处理大文件时需要等待较长时间',
        favorite_features: '我最喜欢AI简历解析功能，因为它能够准确识别和提取关键信息',
        improvements: '建议增加批量处理功能，优化系统响应速度，改进用户界面设计',
        additional_features: '希望能够增加移动端支持，以及数据导出功能'
      },
      medium: {
        problems: '响应有点慢',
        favorite_features: '简历解析不错',
        improvements: '可以更快一些',
        additional_features: '增加更多功能'
      },
      low: {
        problems: '无',
        favorite_features: '好',
        improvements: '没有',
        additional_features: ''
      }
    };
    return data[quality];
  },

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  expectAsyncError: async (fn: () => Promise<any>, expectedError?: string) => {
    try {
      await fn();
      throw new Error('Expected function to throw an error');
    } catch (error) {
      if (expectedError) {
        expect(error.message).toContain(expectedError);
      }
      return error;
    }
  }
};

export default testUtils;