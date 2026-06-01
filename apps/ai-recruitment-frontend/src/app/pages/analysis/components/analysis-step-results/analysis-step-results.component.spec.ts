import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepResultsComponent } from './analysis-step-results.component';
import { AnalysisResultsComponent } from '../analysis-results.component';
import type {
  AnalysisResult,
  ResultAction,
} from '../analysis-results.component';

describe('AnalysisStepResultsComponent', () => {
  let component: AnalysisStepResultsComponent;
  let fixture: ComponentFixture<AnalysisStepResultsComponent>;

  const mockResult: AnalysisResult = {
    score: 85,
    summary: '优秀的候选人',
    skills: ['JavaScript', 'TypeScript'],
    experience: '5年工作经验',
    education: '本科',
    recommendations: ['推荐面试'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepResultsComponent, AnalysisResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with null result', () => {
      expect(component.result).toBeNull();
    });

    it('should initialize with isProcessing as false', () => {
      expect(component.isProcessing).toBe(false);
    });
  });

  describe('输入属性测试', () => {
    it('should accept result input', () => {
      component.result = mockResult;
      expect(component.result).toEqual(mockResult);
    });

    it('should accept isProcessing input', () => {
      component.isProcessing = true;
      expect(component.isProcessing).toBe(true);
    });
  });

  describe('事件发射测试', () => {
    it('should emit actionRequested event', () => {
      const emitSpy = jest.spyOn(component.actionRequested, 'emit');
      const action: ResultAction = { type: 'view-detailed' };

      component.onActionRequested(action);
      expect(emitSpy).toHaveBeenCalledWith(action);
    });
  });
});
