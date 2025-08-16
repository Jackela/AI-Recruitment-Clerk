import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { GuestUsageService } from './guest-usage.service';
import { environment } from '../../../environments/environment';

describe('GuestUsageService', () => {
  let service: GuestUsageService;
  let httpMock: HttpTestingController;
  let mockLocalStorage: { [key: string]: string };
  const recordUrl = `${environment.apiUrl}/marketing/feedback-codes/record`;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] || null;
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockLocalStorage[key];
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GuestUsageService]
    });

    service = TestBed.inject(GuestUsageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    mockLocalStorage = {};
  });

  describe('初始化', () => {
    it('应该正确创建服务', () => {
      expect(service).toBeTruthy();
    });

    it('应该初始化用户会话', () => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/ai_first_visit_date/),
        expect.any(String)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/ai_guest_session_id/),
        expect.stringMatching(/^session_/)
      );
    });
  });

  describe('使用次数管理', () => {
    it('应该返回正确的初始使用次数', () => {
      expect(service.getUsageCount()).toBe(0);
    });

    it('应该正确增加使用次数', () => {
      service.incrementUsage();
      expect(service.getUsageCount()).toBe(1);
      expect(mockLocalStorage['ai_guest_usage_count']).toBe('1');
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
    });

    it('应该记录使用历史', () => {
      service.incrementUsage();
      
      const history = JSON.parse(mockLocalStorage['ai_usage_history'] || '[]');
      expect(history.length).toBe(1);
      expect(new Date(history[0])).toBeInstanceOf(Date);
    });
  });

  describe('反馈码管理', () => {
    it('应该生成有效的反馈码', () => {
      const code = service.generateFeedbackCode();
      httpMock.expectOne(req => req.url.includes('/marketing/feedback-codes/record')).flush({ success: true });
      
      expect(code).toMatch(/^FB[A-Z0-9]+$/);
      expect(code.length).toBeGreaterThan(10);
      expect(service.getFeedbackCode()).toBe(code);
    });

    it('应该向后端记录反馈码', () => {
      const code = service.generateFeedbackCode();
      
      const req = httpMock.expectOne(r => r.url.includes('/marketing/feedback-codes/record'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code });
      
      req.flush({ success: true });
    });

    it('应该处理后端记录失败', () => {
      const code = service.generateFeedbackCode();
      
      const req = httpMock.expectOne(r => r.url.includes('/marketing/feedback-codes/record'));
      req.error(new ErrorEvent('Network error'));
      
      // 服务应该继续工作，即使后端失败
      expect(service.getFeedbackCode()).toBe(code);
    });
  });

  describe('权限控制', () => {
    it('使用次数未耗尽时应该允许使用功能', () => {
      expect(service.canUseFeature()).toBe(true);
    });

    it('使用次数耗尽后应该禁止使用功能', () => {
      // 模拟使用5次
      for (let i = 0; i < 5; i++) {
        service.incrementUsage();
      }
      
      expect(service.canUseFeature()).toBe(false);
    });
  });

  describe('统计信息', () => {
    it('应该返回完整的访客统计信息', () => {
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
      // 设置一些数据
      service.incrementUsage();
      service.generateFeedbackCode();
      const req = httpMock.expectOne(r => r.url.includes('/marketing/feedback-codes/record'));
      req.flush({ success: true });
      
      // 重置
      service.resetUsage();
      
      // 验证数据已清空
      expect(service.getUsageCount()).toBe(0);
      expect(service.getFeedbackCode()).toBeFalsy();
      
      // 验证重新初始化
      expect(localStorage.setItem).toHaveBeenCalledWith(
        expect.stringMatching(/ai_first_visit_date/),
        expect.any(String)
      );
    });
  });

  describe('边界条件测试', () => {
    it('应该处理损坏的localStorage数据', () => {
      mockLocalStorage['ai_guest_usage_count'] = 'invalid';
      
      expect(service.getUsageCount()).toBe(0);
    });

    it('应该处理超出最大使用次数的情况', () => {
      mockLocalStorage['ai_guest_usage_count'] = '10'; // 超过5次
      
      expect(service.getRemainingUsage()).toBe(0);
      expect(service.isUsageExhausted()).toBe(true);
    });

    it('应该处理负数使用次数', () => {
      mockLocalStorage['ai_guest_usage_count'] = '-1';
      
      expect(service.getUsageCount()).toBe(-1);
      expect(service.getRemainingUsage()).toBe(6); // Math.max保护
    });
  });
});