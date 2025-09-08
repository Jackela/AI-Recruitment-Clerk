import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { GuestUsageService } from './guest-usage.service';
import { environment } from '../../../environments/environment';

// Mock localStorage globally before any imports
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string): string | null => {
      return store[key] || null;
    },
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    },
    key: (index: number): string | null => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length(): number {
      return Object.keys(store).length;
    },
    getStore: () => store,
    resetStore: () => {
      store = {};
    },
  };
})();

// Override global localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('GuestUsageService', () => {
  let service: GuestUsageService;
  let httpMock: HttpTestingController;
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;
  let removeItemSpy: jest.SpyInstance;
  const recordUrl = `${environment.apiUrl}/marketing/feedback-codes/record`;

  beforeEach(() => {
    // Reset mock localStorage state
    mockLocalStorage.resetStore();

    // Create comprehensive localStorage spies
    getItemSpy = jest.spyOn(mockLocalStorage, 'getItem');
    setItemSpy = jest.spyOn(mockLocalStorage, 'setItem');
    removeItemSpy = jest.spyOn(mockLocalStorage, 'removeItem');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GuestUsageService],
    });

    service = TestBed.inject(GuestUsageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no pending HTTP requests
    httpMock.verify();

    // Restore all mocks to prevent test interference
    jest.restoreAllMocks();

    // Clear mock state (can't reassign const, use resetStore method instead)
    mockLocalStorage.resetStore();
  });

  describe('初始化', () => {
    it('应该正确创建服务', () => {
      expect(service).toBeTruthy();
    });

    it('应该初始化用户会话', () => {
      // Verify that localStorage methods were called during service initialization
      expect(setItemSpy).toHaveBeenCalledWith(
        'ai_first_visit_date',
        expect.any(String),
      );
      expect(setItemSpy).toHaveBeenCalledWith(
        'ai_guest_session_id',
        expect.stringMatching(/^session_/),
      );

      // Verify the data was actually stored in our mock
      const store = mockLocalStorage.getStore();
      expect(store['ai_first_visit_date']).toBeTruthy();
      expect(store['ai_guest_session_id']).toMatch(/^session_/);
    });
  });

  describe('使用次数管理', () => {
    it('应该返回正确的初始使用次数', () => {
      expect(service.getUsageCount()).toBe(0);
    });

    it('应该正确增加使用次数', () => {
      // Clear any existing usage count to ensure clean state
      mockLocalStorage.setItem('ai_guest_usage_count', '0');

      service.incrementUsage();
      expect(service.getUsageCount()).toBe(1);

      const store = mockLocalStorage.getStore();
      expect(store['ai_guest_usage_count']).toBe('1');
    });

    it('应该正确计算剩余使用次数', () => {
      expect(service.getRemainingUsage()).toBe(5);

      service.incrementUsage();
      service.incrementUsage();
      expect(service.getRemainingUsage()).toBe(3);
    });

    it('应该正确判断使用是否耗尽', () => {
      expect(service.isUsageExhausted()).toBe(false);

      // 模拟使用5次
      for (let i = 0; i < 5; i++) {
        service.incrementUsage();
      }

      expect(service.isUsageExhausted()).toBe(true);
      expect(service.getUsageCount()).toBe(5);
    });

    it('应该记录使用历史', () => {
      // Clear any existing history
      mockLocalStorage.setItem('ai_usage_history', '[]');

      service.incrementUsage();

      const store = mockLocalStorage.getStore();
      const history = JSON.parse(store['ai_usage_history'] || '[]');
      expect(history.length).toBe(1);
      expect(new Date(history[0])).toBeInstanceOf(Date);
    });
  });

  describe('反馈码管理', () => {
    it('应该生成有效的反馈码', () => {
      // Ensure session ID is available for feedback code generation
      mockLocalStorage.setItem('ai_guest_session_id', 'session_test123');

      const code = service.generateFeedbackCode();

      // Handle the HTTP request
      const req = httpMock.expectOne((r) =>
        r.url.includes('/marketing/feedback-codes/record'),
      );
      req.flush({ success: true });

      expect(code).toMatch(/^FB[A-Z0-9]+$/);
      expect(code.length).toBeGreaterThan(10);
      expect(service.getFeedbackCode()).toBe(code);

      const store = mockLocalStorage.getStore();
      expect(store['ai_guest_feedback_code']).toBe(code);
    });

    it('应该向后端记录反馈码', () => {
      // Ensure session ID is available
      mockLocalStorage.setItem('ai_guest_session_id', 'session_test123');

      const code = service.generateFeedbackCode();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/marketing/feedback-codes/record'),
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code });

      req.flush({ success: true });
    });

    it('应该处理后端记录失败', () => {
      // Ensure session ID is available
      mockLocalStorage.setItem('ai_guest_session_id', 'session_test123');

      const code = service.generateFeedbackCode();

      const req = httpMock.expectOne((r) =>
        r.url.includes('/marketing/feedback-codes/record'),
      );
      req.error(new ErrorEvent('Network error'));

      // 服务应该继续工作，即使后端失败
      expect(service.getFeedbackCode()).toBe(code);
    });
  });

  describe('权限控制', () => {
    it('使用次数未耗尽时应该允许使用功能', () => {
      // Ensure clean state
      mockLocalStorage.setItem('ai_guest_usage_count', '0');
      expect(service.canUseFeature()).toBe(true);
    });

    it('使用次数耗尽后应该禁止使用功能', () => {
      // Ensure clean starting state
      mockLocalStorage.setItem('ai_guest_usage_count', '0');

      // 模拟使用5次
      for (let i = 0; i < 5; i++) {
        service.incrementUsage();
      }

      expect(service.canUseFeature()).toBe(false);
      expect(service.getUsageCount()).toBe(5);
    });
  });

  describe('统计信息', () => {
    it('应该返回完整的访客统计信息', () => {
      // Ensure clean state with proper initialization
      mockLocalStorage.setItem('ai_guest_usage_count', '0');
      mockLocalStorage.setItem('ai_usage_history', '[]');
      mockLocalStorage.setItem('ai_first_visit_date', new Date().toISOString());
      mockLocalStorage.setItem('ai_guest_session_id', 'session_test123');

      service.incrementUsage();
      service.incrementUsage();

      const stats = service.getGuestStats();

      expect(stats.usageCount).toBe(2);
      expect(stats.remainingUsage).toBe(3);
      expect(stats.maxUsage).toBe(5);
      expect(stats.isExhausted).toBe(false);
      expect(stats.firstVisit).toBeTruthy();
      expect(stats.sessionId).toMatch(/^session_/);
      expect(stats.usageHistory).toHaveLength(2);
    });
  });

  describe('重置功能', () => {
    it('应该正确重置所有数据', () => {
      // 设置一些初始数据
      mockLocalStorage.setItem('ai_guest_usage_count', '0');
      mockLocalStorage.setItem('ai_guest_session_id', 'session_test123');

      // 设置一些数据
      service.incrementUsage();
      service.generateFeedbackCode();
      const req = httpMock.expectOne((r) =>
        r.url.includes('/marketing/feedback-codes/record'),
      );
      req.flush({ success: true });

      // 重置前验证数据存在
      expect(service.getUsageCount()).toBe(1);
      expect(service.getFeedbackCode()).toBeTruthy();

      // 清除已有的spy调用历史，以便检测重置后的调用
      setItemSpy.mockClear();

      // 重置
      service.resetUsage();

      // 验证数据已清空
      expect(service.getUsageCount()).toBe(0);
      expect(service.getFeedbackCode()).toBeFalsy();

      // 验证重新初始化
      expect(setItemSpy).toHaveBeenCalledWith(
        'ai_first_visit_date',
        expect.any(String),
      );
      expect(setItemSpy).toHaveBeenCalledWith(
        'ai_guest_session_id',
        expect.stringMatching(/^session_/),
      );
    });
  });

  describe('边界条件测试', () => {
    it('应该处理损坏的localStorage数据', () => {
      mockLocalStorage.setItem('ai_guest_usage_count', 'invalid');

      // The service should handle invalid data gracefully and return 0
      expect(service.getUsageCount()).toBe(0);
    });

    it('应该处理超出最大使用次数的情况', () => {
      mockLocalStorage.setItem('ai_guest_usage_count', '10'); // 超过5次

      expect(service.getRemainingUsage()).toBe(0);
      expect(service.isUsageExhausted()).toBe(true);
      expect(service.getUsageCount()).toBe(10);
    });

    it('应该处理负数使用次数', () => {
      mockLocalStorage.setItem('ai_guest_usage_count', '-1');

      expect(service.getUsageCount()).toBe(-1);
      expect(service.getRemainingUsage()).toBe(6); // Math.max(0, 5 - (-1)) = Math.max(0, 6) = 6
    });

    it('应该处理localStorage异常', () => {
      // Simulate localStorage throwing an error
      getItemSpy.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      // The service should handle this gracefully
      expect(() => service.getUsageCount()).not.toThrow();
    });

    it('应该处理无效的JSON数据', () => {
      mockLocalStorage.setItem('ai_usage_history', '{invalid json}');

      // The service should handle invalid JSON gracefully
      expect(() => service.getGuestStats()).not.toThrow();
    });
  });
});
