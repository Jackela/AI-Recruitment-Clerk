import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepErrorComponent } from './analysis-step-error.component';
import { AnalysisErrorComponent } from '../analysis-error.component';
import type { ErrorInfo, ErrorAction } from '../analysis-error.component';

describe('AnalysisStepErrorComponent', () => {
  let component: AnalysisStepErrorComponent;
  let fixture: ComponentFixture<AnalysisStepErrorComponent>;

  const mockErrorInfo: ErrorInfo = {
    code: 'PARSE_ERROR',
    message: '文件解析失败',
    details: '无法读取PDF文件内容',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepErrorComponent, AnalysisErrorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with null errorInfo', () => {
      expect(component.errorInfo).toBeNull();
    });

    it('should initialize with isRetrying as false', () => {
      expect(component.isRetrying).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept errorInfo input', () => {
      component.errorInfo = mockErrorInfo;
      expect(component.errorInfo).toEqual(mockErrorInfo);
    });

    it('should accept isRetrying input', () => {
      component.isRetrying = true;
      expect(component.isRetrying).toBe(true);
    });
  });

  describe('事件发射测试', () => {
    it('should emit actionRequested event', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      const action: ErrorAction = { type: 'retry' };

      component.onActionRequested(action);
      expect(emitSpy).toHaveBeenCalledWith(action);
    });

    it('should emit errorReported event', () => {
      const emitSpy = jest.spyOn(component.errorReported, 'emit');

      component.onErrorReported(mockErrorInfo);
      expect(emitSpy).toHaveBeenCalledWith(mockErrorInfo);
    });
  });
});
