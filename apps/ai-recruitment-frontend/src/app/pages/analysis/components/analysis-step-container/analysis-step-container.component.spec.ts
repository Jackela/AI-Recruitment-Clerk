import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepContainerComponent } from './analysis-step-container.component';

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
      component.currentState = 'analyzing';
      expect(component.currentState).toBe('analyzing');

      component.currentState = 'completed';
      expect(component.currentState).toBe('completed');

      component.currentState = 'error';
      expect(component.currentState).toBe('error');
    });
  });
});
