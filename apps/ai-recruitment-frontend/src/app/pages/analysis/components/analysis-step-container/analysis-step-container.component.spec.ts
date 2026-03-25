import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepContainerComponent } from './analysis-step-container.component';
import type { AnalysisState } from '../../types/analysis.types';

describe('AnalysisStepContainerComponent', () => {
  let component: AnalysisStepContainerComponent;
  let fixture: ComponentFixture<AnalysisStepContainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepContainerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepContainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(component.currentState).toBe('upload');
    });
  });

  describe('输入属性测试', () => {
    it('should accept currentState input', () => {
      const states: AnalysisState[] = [
        'upload',
        'analyzing',
        'completed',
        'error',
      ];

      for (const state of states) {
        component.currentState = state;
        expect(component.currentState).toBe(state);
      }
    });
  });
});
