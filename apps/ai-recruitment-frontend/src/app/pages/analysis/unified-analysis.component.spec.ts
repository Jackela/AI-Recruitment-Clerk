import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { NEVER, of, throwError } from 'rxjs';
import { UnifiedAnalysisComponent } from './unified-analysis.component';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ToastService } from '../../services/toast.service';
import { ApiService } from '../../services/api.service';

describe('UnifiedAnalysisComponent', () => {
  let component: UnifiedAnalysisComponent;
  let fixture: ComponentFixture<UnifiedAnalysisComponent>;
  let mockRouter: jest.Mocked<Router>;
  let mockGuestApiService: jest.Mocked<GuestApiService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let mockToastService: jest.Mocked<ToastService>;

  const mockUploadData = {
    file: new File(['test content'], 'test.pdf', { type: 'application/pdf' }),
    candidateInfo: {
      name: '张三',
      email: 'zhangsan@example.com',
      notes: '测试备注',
    },
  };

  const mockAnalysisResponse = {
    data: {
      analysisId: 'test-analysis-123',
    },
  };

  beforeEach(async () => {
    const routerSpy = {
      navigate: jest.fn().mockResolvedValue(true),
    } as jest.Mocked<Router>;

    const guestApiSpy = {
      analyzeResume: jest.fn().mockReturnValue(NEVER),
      getDemoAnalysis: jest.fn().mockReturnValue(NEVER),
    } as unknown as jest.Mocked<GuestApiService>;

    const webSocketSpy = {
      connect: jest.fn().mockReturnValue(of({})),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    const toastSpy = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as jest.Mocked<ToastService>;

    const apiSpy = {
      getAnalysisStatistics: jest.fn().mockReturnValue(
        of({
          todayAnalyses: 3,
          totalAnalyses: 18,
          averageScore: 82,
          successRate: 94,
          monthlyAnalyses: 11,
        }),
      ),
    } as unknown as jest.Mocked<ApiService>;

    await TestBed.configureTestingModule({
      imports: [UnifiedAnalysisComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: GuestApiService, useValue: guestApiSpy },
        { provide: WebSocketService, useValue: webSocketSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ApiService, useValue: apiSpy },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UnifiedAnalysisComponent);
    component = fixture.componentInstance;
    mockRouter = TestBed.inject(Router) as jest.Mocked<Router>;
    mockGuestApiService = TestBed.inject(
      GuestApiService,
    ) as jest.Mocked<GuestApiService>;
    mockWebSocketService = TestBed.inject(
      WebSocketService,
    ) as jest.Mocked<WebSocketService>;
    mockToastService = TestBed.inject(
      ToastService,
    ) as jest.Mocked<ToastService>;

    fixture.detectChanges();
  });

  describe('组件渲染测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h1').textContent).toContain(
        'AI智能简历分析',
      );
    });

    it('should render subtitle', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.subtitle').textContent).toContain(
        '上传简历，获得专业的AI驱动分析报告',
      );
    });

    it('should show upload section in initial state', () => {
      expect(component.currentState()).toBe('upload');
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('arc-resume-file-upload')).toBeTruthy();
    });
  });

  describe('输入输出测试', () => {
    it('should accept and update file upload data', () => {
      component.onFileSubmitted(mockUploadData);
      expect(component.isSubmitting()).toBe(true);
      expect(component.currentState()).toBe('analyzing');
    });

    it('should handle file validation error', () => {
      const errorMessage = '文件格式不支持';
      component.onFileValidationError(errorMessage);
      expect(component.errorMessage()).toBe(errorMessage);
      expect(component.currentState()).toBe('error');
    });

    it('should handle demo request', () => {
      mockGuestApiService.getDemoAnalysis.mockReturnValue(NEVER);
      component.onDemoRequested();
      expect(component.isSubmitting()).toBe(true);
      expect(component.currentState()).toBe('analyzing');
    });
  });

  describe('服务集成测试', () => {
    it('should call GuestApiService.analyzeResume when file submitted', fakeAsync(() => {
      mockGuestApiService.analyzeResume.mockReturnValue(
        of(mockAnalysisResponse),
      );

      component.startAnalysis(mockUploadData);
      tick();

      expect(mockGuestApiService.analyzeResume).toHaveBeenCalledWith(
        mockUploadData.file,
        mockUploadData.candidateInfo.name,
        mockUploadData.candidateInfo.email,
        mockUploadData.candidateInfo.notes,
      );
    }));

    it('should handle API error and show error state', fakeAsync(() => {
      const errorResponse = { message: '服务器错误' };
      mockGuestApiService.analyzeResume.mockReturnValue(
        throwError(() => errorResponse),
      );

      component.startAnalysis(mockUploadData);
      tick();

      expect(component.currentState()).toBe('error');
      expect(mockToastService.error).toHaveBeenCalled();
    }));

    it('should disconnect WebSocket on destroy', () => {
      component.ngOnDestroy();
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });
  });

  describe('异步操作测试', () => {
    it('should load statistics asynchronously', fakeAsync(() => {
      component.ngAfterViewInit();
      tick();
      expect(component.todayAnalyses()).toBe(3);
      expect(component.totalAnalyses()).toBe(18);
    }));

    it('should complete analysis flow', fakeAsync(() => {
      mockGuestApiService.analyzeResume.mockReturnValue(
        of(mockAnalysisResponse),
      );

      component.onFileSubmitted(mockUploadData);
      tick();

      expect(component.sessionId()).toBe('test-analysis-123');
      expect(component.currentState()).toBe('analyzing');
    }));
  });

  describe('分析步骤状态管理', () => {
    it('should initialize with default analysis steps', () => {
      const steps = component.analysisSteps();
      expect(steps).toHaveLength(5);
      expect(steps[0].id).toBe('upload');
      expect(steps[0].status).toBe('pending');
    });

    it('should reset analysis steps', () => {
      component.updateStepStatus('upload', 'completed');
      expect(component.analysisSteps()[0].status).toBe('completed');

      component.resetAnalysisSteps();
      expect(component.analysisSteps()[0].status).toBe('pending');
    });

    it('should update step status correctly', () => {
      component.updateStepStatus('upload', 'active');
      const steps = component.analysisSteps();
      const uploadStep = steps.find((s) => s.id === 'upload');
      expect(uploadStep?.status).toBe('active');
    });

    it('should update step progression', () => {
      component.updateStepProgression('upload');
      const steps = component.analysisSteps();
      expect(steps[0].status).toBe('active');
    });
  });

  describe('结果操作测试', () => {
    beforeEach(() => {
      component.analysisResult.set({
        score: 85,
        summary: '测试摘要',
        keySkills: ['JavaScript'],
        experience: '5年经验',
        education: '学士学位',
        recommendations: ['推荐1'],
      });
      component.sessionId.set('test-session-123');
      component.currentState.set('completed');
    });

    it('should navigate to detailed results on view action', fakeAsync(() => {
      component.onResultAction({ type: 'view-detailed' });
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith([
        '/results',
        'test-session-123',
      ]);
    }));

    it('should start new analysis on start-new action', () => {
      component.onResultAction({ type: 'start-new' });
      expect(component.currentState()).toBe('upload');
      expect(component.analysisResult()).toBeNull();
    });

    it('should download report on download action', () => {
      const windowOpenSpy = jest
        .spyOn(window, 'open')
        .mockImplementation(() => null);
      component.onResultAction({ type: 'download-report' });
      expect(windowOpenSpy).toHaveBeenCalled();
    });
  });

  describe('错误操作测试', () => {
    beforeEach(() => {
      component.errorMessage.set('测试错误');
      component.currentState.set('error');
    });

    it('should retry analysis on retry action', fakeAsync(() => {
      component.onErrorAction({ type: 'retry' });
      expect(component.isRetrying()).toBe(true);
      expect(component.currentState()).toBe('upload');

      tick(1000);
      expect(component.isRetrying()).toBe(false);
    }));

    it('should start new analysis on start-new action', () => {
      component.onErrorAction({ type: 'start-new' });
      expect(component.currentState()).toBe('upload');
      expect(component.errorMessage()).toBe('');
    });

    it('should show support info on contact-support action', () => {
      component.onErrorAction({ type: 'contact-support' });
      expect(mockToastService.info).toHaveBeenCalledWith(
        '正在为您转接客户支持...',
      );
    });
  });

  describe('错误报告测试', () => {
    it('should emit error reported event', () => {
      const errorInfo = component.getErrorInfo();
      component.onErrorReported(errorInfo);
      expect(mockToastService.success).toHaveBeenCalledWith(
        '错误报告已发送，感谢您的反馈',
      );
    });
  });

  describe('工具方法测试', () => {
    it('should format usage statistics', () => {
      const stats = component.getUsageStatistics();
      expect(stats.todayAnalyses).toBe(component.todayAnalyses());
      expect(stats.totalAnalyses).toBe(component.totalAnalyses());
      expect(stats.averageScore).toBe(component.averageScore());
    });

    it('should return error info with correct structure', () => {
      component.errorMessage.set('测试错误消息');
      const errorInfo = component.getErrorInfo();
      expect(errorInfo.message).toBe('测试错误消息');
      expect(errorInfo.code).toBe('ANALYSIS_ERROR');
      expect(errorInfo.recoverable).toBe(true);
      expect(errorInfo.timestamp).toBeInstanceOf(Date);
    });

    it('should normalize score correctly', () => {
      expect(component['normalizeScore'](85)).toBe(85);
      expect(component['normalizeScore'](150)).toBe(100);
      expect(component['normalizeScore'](-10)).toBe(0);
      expect(component['normalizeScore']('invalid')).toBe(0);
    });

    it('should normalize string correctly', () => {
      expect(component['normalizeString']('  test  ')).toBe('test');
      expect(component['normalizeString'](null)).toBe('');
      expect(component['normalizeString']('')).toBe('');
    });

    it('should normalize string array correctly', () => {
      expect(component['normalizeStringArray'](['a', 'b', 'c'])).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(
        component['normalizeStringArray'](['  a  ', '', null, 'b']),
      ).toEqual(['a', 'b']);
      expect(component['normalizeStringArray']('invalid')).toEqual([]);
    });

    it('should normalize URL correctly', () => {
      expect(component['normalizeUrl']('http://example.com')).toBe(
        'http://example.com',
      );
      expect(component['normalizeUrl']('invalid url')).toBeUndefined();
      expect(component['normalizeUrl'](null)).toBeUndefined();
    });
  });

  describe('生命周期测试', () => {
    it('should cleanup on destroy', () => {
      const destroySpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });
  });
});
