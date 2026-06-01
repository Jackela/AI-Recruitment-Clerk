import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import {
  AnalysisProgressComponent,
  type AnalysisStep,
} from './analysis-progress.component';
import { WebSocketService } from '../../../services/websocket.service';
import { Subject } from 'rxjs';

describe('AnalysisProgressComponent', () => {
  let component: AnalysisProgressComponent;
  let fixture: ComponentFixture<AnalysisProgressComponent>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  const mockSteps: AnalysisStep[] = [
    {
      id: 'step1',
      title: '上传简历',
      description: '正在处理上传的简历文件',
      status: 'completed',
      progress: 100,
    },
    {
      id: 'step2',
      title: '解析内容',
      description: '正在解析简历内容',
      status: 'active',
      progress: 60,
    },
    {
      id: 'step3',
      title: 'AI分析',
      description: '正在使用AI进行分析',
      status: 'pending',
      progress: 0,
    },
  ];

  beforeEach(async () => {
    const webSocketSpy = {
      onProgress: jest.fn(),
      connect: jest.fn(),
      onCompletion: jest.fn(),
      onError: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as jest.Mocked<WebSocketService>;

    await TestBed.configureTestingModule({
      imports: [AnalysisProgressComponent],
      providers: [{ provide: WebSocketService, useValue: webSocketSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisProgressComponent);
    component = fixture.componentInstance;
    mockWebSocketService = TestBed.inject(
      WebSocketService,
    ) as jest.Mocked<WebSocketService>;
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.sessionId).toBe('');
      expect(component.showMessageLog).toBe(true);
      expect(component.isCancelling).toBe(false);
      expect(component.steps).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
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
  });

  describe('WebSocket集成测试', () => {
    it('should setup WebSocket listeners when sessionId changes', () => {
      const progressSubject = new Subject();
      const connectSubject = new Subject();
      const completionSubject = new Subject();
      const errorSubject = new Subject();

      mockWebSocketService.onProgress.mockReturnValue(
        progressSubject.asObservable(),
      );
      mockWebSocketService.connect.mockReturnValue(
        connectSubject.asObservable(),
      );
      mockWebSocketService.onCompletion.mockReturnValue(
        completionSubject.asObservable(),
      );
      mockWebSocketService.onError.mockReturnValue(errorSubject.asObservable());

      component.sessionId = 'new-session';
      component.ngOnChanges({
        sessionId: {
          currentValue: 'new-session',
          previousValue: '',
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(mockWebSocketService.connect).toHaveBeenCalledWith('new-session');
    });

    it('should emit progressUpdate on WebSocket progress', () => {
      const progressSubject = new Subject<{
        currentStep: string;
        progress: number;
      }>();
      const connectSubject = new Subject();
      const completionSubject = new Subject();
      const errorSubject = new Subject();

      mockWebSocketService.onProgress.mockReturnValue(
        progressSubject.asObservable(),
      );
      mockWebSocketService.connect.mockReturnValue(
        connectSubject.asObservable(),
      );
      mockWebSocketService.onCompletion.mockReturnValue(
        completionSubject.asObservable(),
      );
      mockWebSocketService.onError.mockReturnValue(errorSubject.asObservable());

      const emitSpy = jest.spyOn(component.progressUpdate, 'emit');

      component.sessionId = 'test-session';
      component.ngOnChanges({
        sessionId: {
          currentValue: 'test-session',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      progressSubject.next({ currentStep: 'parsing', progress: 75 });

      expect(emitSpy).toHaveBeenCalledWith({
        currentStep: 'parsing',
        progress: 75,
      });
    });

    it('should emit analysisCompleted on WebSocket completion', () => {
      const completionSubject = new Subject();
      const connectSubject = new Subject();
      const progressSubject = new Subject();
      const errorSubject = new Subject();

      mockWebSocketService.onCompletion.mockReturnValue(
        completionSubject.asObservable(),
      );
      mockWebSocketService.connect.mockReturnValue(
        connectSubject.asObservable(),
      );
      mockWebSocketService.onProgress.mockReturnValue(
        progressSubject.asObservable(),
      );
      mockWebSocketService.onError.mockReturnValue(errorSubject.asObservable());

      const emitSpy = jest.spyOn(component.analysisCompleted, 'emit');

      component.sessionId = 'test-session';
      component.ngOnChanges({
        sessionId: {
          currentValue: 'test-session',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      completionSubject.next({ success: true });

      expect(emitSpy).toHaveBeenCalled();
    });

    it('should emit analysisError on WebSocket error', () => {
      const errorSubject = new Subject();
      const connectSubject = new Subject();
      const progressSubject = new Subject();
      const completionSubject = new Subject();

      mockWebSocketService.onError.mockReturnValue(errorSubject.asObservable());
      mockWebSocketService.connect.mockReturnValue(
        connectSubject.asObservable(),
      );
      mockWebSocketService.onProgress.mockReturnValue(
        progressSubject.asObservable(),
      );
      mockWebSocketService.onCompletion.mockReturnValue(
        completionSubject.asObservable(),
      );

      const emitSpy = jest.spyOn(component.analysisError, 'emit');

      component.sessionId = 'test-session';
      component.ngOnChanges({
        sessionId: {
          currentValue: 'test-session',
          previousValue: undefined,
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      errorSubject.next({ error: 'Server error' });

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('取消操作测试', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set isCancelling to true on cancel click', () => {
      const emitSpy = jest.spyOn(component.cancelRequested, 'emit');

      component.onCancelClick();

      expect(component.isCancelling).toBe(true);
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();

      jest.advanceTimersByTime(1000);

      expect(emitSpy).toHaveBeenCalled();
      expect(component.isCancelling).toBe(false);
    });

    it('should disable cancel button while cancelling', () => {
      component.isCancelling = true;
      fixture.detectChanges();

      const cancelButton = fixture.nativeElement.querySelector('.btn-cancel');
      expect(cancelButton?.disabled).toBe(true);
    });
  });

  describe('步骤跟踪测试', () => {
    it('should track steps by id', () => {
      component.steps = mockSteps;
      fixture.detectChanges();

      expect(component.trackByStepId(0, mockSteps[0])).toBe('step1');
      expect(component.trackByStepId(1, mockSteps[1])).toBe('step2');
    });

    it('should render all steps', () => {
      component.steps = mockSteps;
      fixture.detectChanges();

      const stepElements = fixture.nativeElement.querySelectorAll('.step-card');
      expect(stepElements.length).toBe(mockSteps.length);
    });
  });

  describe('生命周期测试', () => {
    it('should cleanup on destroy', () => {
      const destroySubject = component['destroy$'];
      const nextSpy = jest.spyOn(destroySubject, 'next');
      const completeSpy = jest.spyOn(destroySubject, 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should disconnect WebSocket on destroy', () => {
      component.ngOnDestroy();
      expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    });
  });
});
