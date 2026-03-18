import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepProcessingComponent } from './analysis-step-processing.component';

describe('AnalysisStepProcessingComponent', () => {
  let component: AnalysisStepProcessingComponent;
  let fixture: ComponentFixture<AnalysisStepProcessingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepProcessingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepProcessingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render processing text', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('处理中');
    });
  });

  describe('进度显示测试', () => {
    it('should display progress percentage', () => {
      component.progress = 50;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('50%');
    });

    it('should update progress dynamically', () => {
      component.progress = 75;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('75%');
    });
  });
});
