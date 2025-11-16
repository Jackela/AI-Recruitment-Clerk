import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { CampaignComponent } from './campaign.component';
import { GuestUsageService } from '../../services/marketing/guest-usage.service';

type GuestUsageServiceMock = Pick<
  GuestUsageService,
  | 'getGuestStats'
  | 'canUseFeature'
  | 'getFeedbackCode'
  | 'generateFeedbackCode'
  | 'autoCheckUserStatus'
>;
type RouterMock = jest.Mocked<Pick<Router, 'navigate'>>;

describe('CampaignComponent', () => {
  let component: CampaignComponent;
  let fixture: ComponentFixture<CampaignComponent>;
  let mockGuestUsageService: jest.Mocked<GuestUsageServiceMock>;
  let mockRouter: RouterMock;

  beforeEach(async () => {
    // 创建spy对象
    mockGuestUsageService = {
      getGuestStats: jest.fn(),
      canUseFeature: jest.fn(),
      getFeedbackCode: jest.fn(),
      generateFeedbackCode: jest.fn(),
      autoCheckUserStatus: jest.fn().mockResolvedValue(undefined),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CampaignComponent],
      providers: [
        { provide: GuestUsageService, useValue: mockGuestUsageService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampaignComponent);
    component = fixture.componentInstance;
  });

  describe('组件初始化', () => {
    it('应该正确创建组件', () => {
      expect(component).toBeTruthy();
    });

    it('应该在初始化时更新使用状态', fakeAsync(() => {
      const mockStats = {
        remainingUsage: 3,
        usageCount: 2,
        isExhausted: false,
      };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );

      component.ngOnInit();
      tick();

      expect(component.remainingUsage).toBe(3);
      expect(component.usageCount).toBe(2);
      expect(component.isUsageExhausted).toBe(false);
    }));

    it('使用耗尽时应该生成反馈码', fakeAsync(() => {
      const mockStats = { isExhausted: true };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );
      (mockGuestUsageService.getFeedbackCode as jest.Mock).mockReturnValue(
        null,
      );
      (mockGuestUsageService.generateFeedbackCode as jest.Mock).mockReturnValue(
        'FB123456789',
      );

      component.ngOnInit();
      tick();

      expect(component.feedbackCode).toBe('FB123456789');
      expect(mockGuestUsageService.generateFeedbackCode).toHaveBeenCalled();
    }));
  });

  describe('使用进度计算', () => {
    it('应该正确计算使用进度百分比', () => {
      component.usageCount = 2;
      expect(component.usageProgress).toBe(40); // 2/5 * 100

      component.usageCount = 5;
      expect(component.usageProgress).toBe(100);

      component.usageCount = 0;
      expect(component.usageProgress).toBe(0);
    });
  });

  describe('用户交互', () => {
    beforeEach(fakeAsync(() => {
      const mockStats = {
        remainingUsage: 3,
        usageCount: 2,
        isExhausted: false,
      };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );
      component.ngOnInit();
      tick();
      fixture.detectChanges();
    }));

    it('点击开始体验应该导航到dashboard', () => {
      (mockGuestUsageService.canUseFeature as jest.Mock).mockReturnValue(true);
      component.startExperience();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('使用耗尽时不应该允许开始体验', () => {
      (mockGuestUsageService.canUseFeature as jest.Mock).mockReturnValue(false);
      component.startExperience();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('应该显示正确的使用状态信息', () => {
      const usageInfo = fixture.debugElement.query(By.css('.usage-info'));
      expect(usageInfo.nativeElement.textContent).toContain('3');
    });

    it('应该显示正确的进度条', () => {
      const progressFill = fixture.debugElement.query(By.css('.progress-fill'));
      expect(progressFill.nativeElement.style.width).toBe('40%');
    });
  });

  describe('反馈码功能', () => {
    beforeEach(fakeAsync(() => {
      const mockStats = {
        isExhausted: true,
      };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );
      (mockGuestUsageService.getFeedbackCode as jest.Mock).mockReturnValue(
        'FB123456789',
      );
      component.ngOnInit();
      tick();
      fixture.detectChanges();
    }));

    it('使用耗尽时应该显示反馈码', () => {
      const feedbackCode = fixture.debugElement.query(By.css('.feedback-code'));
      expect(feedbackCode.nativeElement.textContent.trim()).toBe('FB123456789');
    });

    it('应该显示反馈引导步骤', () => {
      const steps = fixture.debugElement.queryAll(By.css('.step'));
      expect(steps.length).toBe(3);
    });

    it('应该显示问卷链接', () => {
      const questionnaireBtn = fixture.debugElement.query(
        By.css('.questionnaire-btn'),
      );
      expect(questionnaireBtn.nativeElement.getAttribute('href')).toContain(
        'wj.qq.com',
      );
    });
  });

  describe('复制反馈码功能', () => {
    beforeEach(() => {
      component.feedbackCode = 'FB123456789';
      component.isUsageExhausted = true;
      fixture.detectChanges();
    });

    it('应该支持现代浏览器的clipboard API', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockReturnValue(Promise.resolve()),
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
      });

      await component.copyFeedbackCode();

      expect(mockClipboard.writeText).toHaveBeenCalledWith('FB123456789');
      expect(component.codeCopied).toBe(true);

      // 测试自动重置
      setTimeout(() => {
        expect(component.codeCopied).toBe(false);
      }, 2100);
    });
  });

  describe('统计功能', () => {
    it('应该显示访客统计信息', () => {
      const mockStats = {
        usageCount: 3,
        firstVisit: '2023-01-01T10:00:00Z',
        sessionId: 'session_123',
        remainingUsage: 2,
        isExhausted: false,
        maxUsage: 5,
        usageHistory: [],
      };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );

      jest.spyOn(window, 'alert');

      component.showGuestStats();

      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('已使用：3/5 次'),
      );
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('首次访问：2023-01-01T10:00:00Z'),
      );
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('会话ID：session_123'),
      );
    });
  });

  describe('问卷跟踪', () => {
    it('应该记录问卷点击事件', () => {
      component.feedbackCode = 'FB123456789';
      jest.spyOn(console, 'log');

      component.trackQuestionnaireClick();

      expect(console.log).toHaveBeenCalledWith(
        '用户点击问卷链接',
        expect.objectContaining({
          feedbackCode: 'FB123456789',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('响应式设计测试', () => {
    it('应该在移动设备上正确显示', () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      fixture.detectChanges();

      const container = fixture.debugElement.query(
        By.css('.campaign-container'),
      );
      expect(container).toBeTruthy();
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空的统计数据', () => {
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue({
        remainingUsage: 0,
        usageCount: 0,
        isExhausted: false,
        maxUsage: 5,
        firstVisit: '',
        sessionId: '',
        usageHistory: [],
      });

      expect(() => component.ngOnInit()).not.toThrow();
    });

    it('应该处理未定义的反馈码', () => {
      (mockGuestUsageService.getFeedbackCode as jest.Mock).mockReturnValue(
        null,
      );
      (mockGuestUsageService.generateFeedbackCode as jest.Mock).mockReturnValue(
        '',
      );

      component.isUsageExhausted = true;
      component.ngOnInit();

      expect(component.feedbackCode).toBe('');
    });
  });

  describe('性能测试', () => {
    it('组件初始化应该在合理时间内完成', () => {
      const startTime = performance.now();

      const mockStats = {
        remainingUsage: 3,
        usageCount: 2,
        isExhausted: false,
        maxUsage: 5,
        firstVisit: '2023-01-01',
        sessionId: 'session_123',
        usageHistory: [],
      };
      (mockGuestUsageService.getGuestStats as jest.Mock).mockReturnValue(
        mockStats,
      );

      component.ngOnInit();
      fixture.detectChanges();

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});
