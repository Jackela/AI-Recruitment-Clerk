import type { ComponentFixture } from '@angular/core/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  AnalysisErrorComponent,
  type ErrorInfo,
  type ErrorAction,
} from './analysis-error.component';

describe('AnalysisErrorComponent', () => {
  let component: AnalysisErrorComponent;
  let fixture: ComponentFixture<AnalysisErrorComponent>;

  const mockErrorInfo: ErrorInfo = {
    message: '测试错误消息',
    code: 'TEST_ERROR',
    details: '详细错误描述',
    recoverable: true,
    timestamp: new Date('2024-01-15T10:30:00Z'),
  };

  const mockNetworkError: ErrorInfo = {
    message: '网络连接失败',
    code: 'NETWORK_ERROR',
    recoverable: true,
  };

  const mockServerError: ErrorInfo = {
    message: '服务器内部错误',
    code: 'SERVER_ERROR',
    recoverable: false,
  };

  const mockFileError: ErrorInfo = {
    message: '文件解析失败',
    code: 'FILE_PARSE_ERROR',
    recoverable: true,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisErrorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件渲染测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render error title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('h2').textContent).toContain('分析失败');
    });

    it('should render error message when provided', () => {
      component.errorInfo = mockErrorInfo;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain(mockErrorInfo.message);
    });

    it('should render default message when errorInfo is null', () => {
      component.errorInfo = null;
      fixture.detectChanges();
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('处理过程中遇到问题');
    });
  });

  describe('输入输出测试', () => {
    it('should accept error info input', () => {
      component.errorInfo = mockErrorInfo;
      fixture.detectChanges();
      expect(component.errorInfo).toEqual(mockErrorInfo);
    });

    it('should accept showDetails input', () => {
      component.showDetails = false;
      expect(component.showDetails).toBe(false);

      component.showDetails = true;
      expect(component.showDetails).toBe(true);
    });

    it('should accept showTroubleshooting input', () => {
      component.showTroubleshooting = false;
      expect(component.showTroubleshooting).toBe(false);
    });

    it('should accept enableErrorReporting input', () => {
      component.enableErrorReporting = false;
      expect(component.enableErrorReporting).toBe(false);
    });

    it('should accept isRetrying input', () => {
      component.isRetrying = true;
      expect(component.isRetrying).toBe(true);
    });

    it('should emit actionRequested event', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      component.onAction('retry');
      expect(emitSpy).toHaveBeenCalledWith({ type: 'retry' });
    });

    it('should emit errorReported event when sending error report', fakeAsync(() => {
      component.errorInfo = mockErrorInfo;
      const emitSpy = jest.spyOn(component.errorReported, 'emit');

      component.sendErrorReport();
      tick(1000);

      expect(emitSpy).toHaveBeenCalledWith(mockErrorInfo);
      expect(component.isReporting).toBe(false);
    }));
  });

  describe('错误类型检测', () => {
    it('should detect network error', () => {
      component.errorInfo = mockNetworkError;
      expect(component.isNetworkError()).toBe(true);
      expect(component.isFileError()).toBe(false);
      expect(component.isServerError()).toBe(false);
    });

    it('should detect file error', () => {
      component.errorInfo = mockFileError;
      expect(component.isFileError()).toBe(true);
      expect(component.isNetworkError()).toBe(false);
    });

    it('should detect server error', () => {
      component.errorInfo = mockServerError;
      expect(component.isServerError()).toBe(true);
      expect(component.isRecoverable()).toBe(false);
    });

    it('should handle null errorInfo', () => {
      component.errorInfo = null;
      expect(component.isNetworkError()).toBe(false);
      expect(component.isFileError()).toBe(false);
      expect(component.isServerError()).toBe(false);
      expect(component.isRecoverable()).toBe(true);
    });

    it('should detect recoverable errors correctly', () => {
      component.errorInfo = mockErrorInfo;
      expect(component.isRecoverable()).toBe(true);

      component.errorInfo = { ...mockErrorInfo, recoverable: false };
      expect(component.isRecoverable()).toBe(false);

      component.errorInfo = { ...mockErrorInfo, recoverable: undefined };
      expect(component.isRecoverable()).toBe(true);
    });
  });

  describe('图标和样式', () => {
    it('should return network icon class for network errors', () => {
      component.errorInfo = mockNetworkError;
      expect(component.getIconClass()).toBe('network');
    });

    it('should return server icon class for server errors', () => {
      component.errorInfo = mockServerError;
      expect(component.getIconClass()).toBe('server');
    });

    it('should return empty icon class for other errors', () => {
      component.errorInfo = mockFileError;
      expect(component.getIconClass()).toBe('');
    });
  });

  describe('建议和帮助文本', () => {
    it('should return network error suggestions', () => {
      component.errorInfo = mockNetworkError;
      const suggestions = component.getSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.includes('网络'))).toBe(true);
    });

    it('should return file error suggestions', () => {
      component.errorInfo = mockFileError;
      const suggestions = component.getSuggestions();
      expect(suggestions.some((s) => s.includes('文件'))).toBe(true);
    });

    it('should return server error suggestions', () => {
      component.errorInfo = mockServerError;
      const suggestions = component.getSuggestions();
      expect(suggestions.some((s) => s.includes('服务器'))).toBe(true);
    });

    it('should return default suggestions for unknown errors', () => {
      component.errorInfo = { ...mockErrorInfo, code: 'UNKNOWN' };
      const suggestions = component.getSuggestions();
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return troubleshooting tips', () => {
      const tips = component.getTroubleshootingTips();
      expect(tips.length).toBeGreaterThan(0);
      expect(tips[0]).toHaveProperty('title');
      expect(tips[0]).toHaveProperty('description');
    });
  });

  describe('按钮显示逻辑', () => {
    it('should show retry button for recoverable errors', () => {
      component.errorInfo = mockErrorInfo;
      expect(component.isRecoverable()).toBe(true);
    });

    it('should show support button for non-recoverable or server errors', () => {
      component.errorInfo = mockServerError;
      expect(component.shouldShowSupport()).toBe(true);
    });

    it('should not show support button for recoverable non-server errors', () => {
      component.errorInfo = mockNetworkError;
      expect(component.shouldShowSupport()).toBe(false);
    });
  });

  describe('时间戳格式化', () => {
    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:00Z');
      const formatted = component.formatTimestamp(timestamp);
      expect(formatted).toContain('2024');
    });

    it('should return N/A for undefined timestamp', () => {
      expect(component.formatTimestamp(undefined)).toBe('N/A');
    });
  });

  describe('头部描述', () => {
    it('should return network error description', () => {
      component.errorInfo = mockNetworkError;
      expect(component.getHeaderDescription()).toContain('网络');
    });

    it('should return file error description', () => {
      component.errorInfo = mockFileError;
      expect(component.getHeaderDescription()).toContain('文件');
    });

    it('should return default description', () => {
      component.errorInfo = mockServerError;
      expect(component.getHeaderDescription()).toBe('处理过程中遇到问题');
    });
  });

  describe('异步操作测试', () => {
    it('should set isReporting during error report sending', fakeAsync(() => {
      component.errorInfo = mockErrorInfo;

      component.sendErrorReport();
      expect(component.isReporting).toBe(true);

      public tick(1000);
      expect(component.isReporting).toBe(false);
    }));

    it('should not send report if errorInfo is null', fakeAsync(() => {
      component.errorInfo = null;
      const emitSpy = jest.spyOn(component.errorReported, 'emit');

      component.sendErrorReport();
      public tick(1000);

      expect(emitSpy).not.toHaveBeenCalled();
    }));
  });
});
