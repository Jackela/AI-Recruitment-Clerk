import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import {
  ProgressTrackerComponent,
  type ProgressStep,
} from './progress-tracker.component';
import {
  WebSocketService,
  type ProgressUpdate,
} from '../../../services/websocket.service';
import { ToastService } from '../../../services/toast.service';

describe('ProgressTrackerComponent', () => {
  let component: ProgressTrackerComponent;
  let fixture: ComponentFixture<ProgressTrackerComponent>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let mockToastService: jest.Mocked<ToastService>;
  let connectionStatusSubject: Subject<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >;
  let messageSubject: Subject<unknown>;
  let progressSubject: Subject<ProgressUpdate>;
  let completionSubject: Subject<unknown>;
  let errorSubject: Subject<unknown>;

  const mockSteps: ProgressStep[] = [
    { id: 'upload', label: '文件上传', status: 'pending' },
    { id: 'parse', label: '解析简历', status: 'pending' },
    { id: 'extract', label: '提取信息', status: 'pending' },
    { id: 'analyze', label: '智能分析', status: 'pending' },
    { id: 'generate', label: '生成报告', status: 'pending' },
  ];

  beforeEach(async () => {
    connectionStatusSubject = new Subject();
    messageSubject = new Subject();
    progressSubject = new Subject();
    completionSubject = new Subject();
    errorSubject = new Subject();

    const webSocketSpy = {
      connect: jest.fn().mockReturnValue(messageSubject.asObservable()),
      disconnect: jest.fn(),
      getConnectionStatus: jest
        .fn()
        .mockReturnValue(connectionStatusSubject.asObservable()),
      onProgress: jest.fn().mockReturnValue(progressSubject.asObservable()),
      onCompletion: jest.fn().mockReturnValue(completionSubject.asObservable()),
      onError: jest.fn().mockReturnValue(errorSubject.asObservable()),
    } as unknown as jest.Mocked<WebSocketService>;

    const toastSpy = {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as jest.Mocked<ToastService>;

    await TestBed.configureTestingModule({
      imports: [ProgressTrackerComponent],
      providers: [
        { provide: WebSocketService, useValue: webSocketSpy },
        { provide: ToastService, useValue: toastSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressTrackerComponent);
    component = fixture.componentInstance;
    mockWebSocketService = TestBed.inject(
      WebSocketService,
    ) as jest.Mocked<WebSocketService>;
    mockToastService = TestBed.inject(
      ToastService,
    ) as jest.Mocked<ToastService>;
  });

  describe('组件渲染测试', () => {
    it('should create', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should render progress header', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('分析进度');
    });

    it('should render connection status', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.connection-status')).toBeTruthy();
    });

    it('should render progress bar', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.progress-bar')).toBeTruthy();
    });
  });

  describe('输入输出测试', () => {
    it('should accept sessionId input', () => {
      component.sessionId = 'test-session-123';
      expect(component.sessionId).toBe('test-session-123');
    });

    it('should accept steps input', () => {
      component.steps = mockSteps;
      expect(component.steps).toEqual(mockSteps);
    });

    it('should accept showMessageLog input', () => {
      component.showMessageLog = false;
      expect(component.showMessageLog).toBe(false);
    });

    it('should show error toast when sessionId is empty', () => {
      component.sessionId = '';
      component.ngOnInit();
      expect(mockToastService.error).toHaveBeenCalledWith(
        '会话ID缺失，无法跟踪进度',
      );
    });
  });

  describe('服务集成测试', () => {
    it('should connect to WebSocket on init', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();
      expect(mockWebSocketService.connect).toHaveBeenCalledWith('test-session');
    });

    it('should disconnect WebSocket on destroy', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();
      component.ngOnDestroy();
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });

    it('should initialize with default steps if none provided', () => {
      component.sessionId = 'test-session';
      component.steps = [];
      component.ngOnInit();
      expect(component.steps.length).toBe(5);
    });
  });

  describe('连接状态测试', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();
    });

    it('should update connection status to connected', () => {
      connectionStatusSubject.next('connected');
      expect(component.connectionStatus$.getValue()).toBe('connected');
      expect(component.isConnected$.getValue()).toBe(true);
    });

    it('should update connection status to connecting', () => {
      connectionStatusSubject.next('connecting');
      expect(component.connectionStatus$.getValue()).toBe('connecting');
      expect(component.isConnected$.getValue()).toBe(false);
    });

    it('should update connection status to error', () => {
      connectionStatusSubject.next('error');
      expect(component.connectionStatus$.getValue()).toBe('error');
      expect(component.isConnected$.getValue()).toBe(false);
    });
  });

  describe('进度更新测试', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();
    });

    it('should handle progress update', () => {
      const progressUpdate: ProgressUpdate = {
        currentStep: '解析简历',
        progress: 50,
        estimatedTimeRemaining: 120,
      };

      progressSubject.next(progressUpdate);

      expect(component.overallProgress$.getValue()).toBe(50);
      expect(component.currentStep$.getValue()).toBe('解析简历');
      expect(component.estimatedTimeRemaining$.getValue()).toBe(120);
    });

    it('should update step progress on progress update', () => {
      const progressUpdate: ProgressUpdate = {
        currentStep: '解析简历',
        progress: 75,
      };

      progressSubject.next(progressUpdate);

      const parseStep = component.steps.find((s) => s.label === '解析简历');
      expect(parseStep?.status).toBe('active');
      expect(parseStep?.progress).toBe(75);
    });
  });

  describe('步骤变更测试', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = [...mockSteps];
      component.ngOnInit();
    });

    it('should mark previous steps as completed on step change', () => {
      const message = {
        type: 'step_change',
        data: {
          currentStep: '提取信息',
          message: '开始提取信息',
        },
      };

      messageSubject.next(message);

      expect(component.steps[0].status).toBe('completed');
      expect(component.steps[1].status).toBe('completed');
      expect(component.steps[2].status).toBe('active');
    });

    it('should add message on step change', () => {
      const message = {
        type: 'step_change',
        data: {
          currentStep: '解析简历',
          message: '开始解析简历',
        },
      };

      messageSubject.next(message);

      expect(component.messages.length).toBeGreaterThan(0);
      expect(component.messages[0].message).toContain('解析简历');
    });
  });

  describe('完成和错误处理', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = [...mockSteps];
      component.ngOnInit();
    });

    it('should handle completion', () => {
      completionSubject.next({});

      expect(component.overallProgress$.getValue()).toBe(100);
      expect(component.currentStep$.getValue()).toBe('分析完成');
      expect(component.steps.every((s) => s.status === 'completed')).toBe(true);
    });

    it('should add success message on completion', () => {
      completionSubject.next({});

      expect(component.messages[0].type).toBe('success');
      expect(component.messages[0].message).toBe('分析已完成');
    });

    it('should handle error', () => {
      errorSubject.next({ error: '测试错误' });

      expect(component.messages[0].type).toBe('error');
      expect(component.messages[0].message).toContain('测试错误');
    });

    it('should mark current step as error on error', () => {
      component.steps[0].status = 'active';
      errorSubject.next({ error: '测试错误' });

      expect(component.steps[0].status).toBe('error');
    });
  });

  describe('消息管理测试', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();
    });

    it('should add message with correct type', () => {
      const message = {
        type: 'info',
        data: { message: '信息消息' },
      };

      messageSubject.next(message);

      expect(component.messages.length).toBeGreaterThan(0);
    });

    it('should limit messages to 20', () => {
      for (let i = 0; i < 25; i++) {
        const message = {
          type: 'info',
          data: { message: `消息 ${i}` },
        };
        messageSubject.next(message);
      }

      expect(component.messages.length).toBe(20);
    });
  });

  describe('工具方法测试', () => {
    it('should return correct status text', () => {
      expect(component.getStatusText('connected')).toBe('已连接');
      expect(component.getStatusText('connecting')).toBe('连接中...');
      expect(component.getStatusText('disconnected')).toBe('已断开');
      expect(component.getStatusText('error')).toBe('连接错误');
      expect(component.getStatusText('unknown')).toBe('未知状态');
      expect(component.getStatusText(null)).toBe('未知状态');
    });

    it('should format time correctly', () => {
      expect(component.formatTime(45)).toBe('45秒');
      expect(component.formatTime(90)).toBe('1分30秒');
      expect(component.formatTime(125)).toBe('2分5秒');
    });
  });

  describe('步骤进度更新', () => {
    beforeEach(() => {
      component.sessionId = 'test-session';
      component.steps = [...mockSteps];
      component.ngOnInit();
    });

    it('should update step progress by label match', () => {
      const progressUpdate: ProgressUpdate = {
        currentStep: '解析简历',
        progress: 60,
      };

      progressSubject.next(progressUpdate);

      const step = component.steps.find((s) => s.label === '解析简历');
      expect(step?.progress).toBe(60);
    });

    it('should update step progress by id match', () => {
      const progressUpdate: ProgressUpdate = {
        currentStep: 'parse',
        progress: 70,
      };

      progressSubject.next(progressUpdate);

      const step = component.steps.find((s) => s.id === 'parse');
      expect(step?.progress).toBe(70);
    });
  });

  describe('生命周期测试', () => {
    it('should cleanup on destroy', () => {
      component.sessionId = 'test-session';
      component.steps = mockSteps;
      component.ngOnInit();

      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });
  });
});
