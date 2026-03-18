import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepResultsComponent } from './analysis-step-results.component';

describe('AnalysisStepResultsComponent', () => {
  let component: AnalysisStepResultsComponent;
  let fixture: ComponentFixture<AnalysisStepResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render results title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('分析结果');
    });
  });

  describe('结果展示测试', () => {
    it('should display result data', () => {
      const mockResult = {
        score: 85,
        summary: '优秀的候选人',
        skills: ['JavaScript', 'TypeScript'],
      };
      component.result = mockResult;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('85');
      expect(compiled.textContent).toContain('优秀的候选人');
    });

    it('should emit next action', () => {
      const emitSpy = jest.spyOn(component.nextStep, 'emit');
      component.onNext();
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
