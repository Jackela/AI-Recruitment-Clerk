import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepProcessingComponent } from './analysis-step-processing.component';
import { AnalysisProgressComponent } from '../analysis-progress.component';
import type {
  AnalysisStep,
  ProgressUpdate,
} from '../analysis-progress.component';

describe('AnalysisStepProcessingComponent', () => {
  let component: AnalysisStepProcessingComponent;
  let fixture: ComponentFixture<AnalysisStepProcessingComponent>;

  const mockSteps: AnalysisStep[] = [
    { id: '1', label: '上传简历', status: 'completed', progress: 100 },
    { id: '2', label: '解析内容', status: 'processing', progress: 50 },
    { id: '3', label: '生成报告', status: 'pending', progress: 0 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepProcessingComponent, AnalysisProgressComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepProcessingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty sessionId', () => {
      expect(component.sessionId).toBe('');
    });

    it('should initialize with empty steps', () => {
      expect(component.steps).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept sessionId input', () => {
      component.sessionId = 'session-123';
      expect(component.sessionId).toBe('session-123');
    });

    it('should accept steps input', () => {
      component.steps = mockSteps;
      expect(component.steps).toEqual(mockSteps);
    });
  });

  describe('事件发射测试', () => {
    it('should emit progressUpdate event', () => {
      const emitSpy = jest.spyOn(component.progressUpdate, 'emit');
      const update: ProgressUpdate = { stepId: '1', progress: 50 };

      component.onProgressUpdate(update);
      expect(emitSpy).toHaveBeenCalledWith(update);
    });

    it('should emit stepChange event', () => {
      const emitSpy = jest.spyOn(component.stepChange, 'emit');

      component.onStepChange('step-2');
      expect(emitSpy).toHaveBeenCalledWith('step-2');
    });

    it('should emit cancelRequested event', () => {
      const emitSpy = jest.spyOn(component.cancelRequested, 'emit');

      component.onCancelRequested();
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
