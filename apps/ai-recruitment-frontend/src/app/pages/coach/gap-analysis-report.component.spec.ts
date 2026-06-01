import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { GapAnalysisReportComponent } from './gap-analysis-report.component';
import type { GapAnalysisResult } from '../../interfaces/gap-analysis.interface';

describe('GapAnalysisReportComponent', () => {
  let component: GapAnalysisReportComponent;
  let fixture: ComponentFixture<GapAnalysisReportComponent>;

  const mockResult: GapAnalysisResult = {
    matchedSkills: ['JavaScript', 'TypeScript', 'Angular'],
    missingSkills: ['Python', 'Go'],
    suggestedSkills: ['Rust', 'Kotlin', 'Swift'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GapAnalysisReportComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GapAnalysisReportComponent);
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
  });

  describe('输入属性测试', () => {
    it('should accept result input', () => {
      component.result = mockResult;
      expect(component.result).toEqual(mockResult);
    });
  });

  describe('渲染测试', () => {
    it('should display empty template when result is null', () => {
      component.result = null;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('No analysis yet');
    });

    it('should display report when result is provided', () => {
      component.result = mockResult;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Diagnostic Report');
      expect(compiled.textContent).toContain('Matched Skills');
      expect(compiled.textContent).toContain('Missing Skills');
    });

    it('should display matched skills count', () => {
      component.result = mockResult;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('(3)');
    });

    it('should display missing skills count', () => {
      component.result = mockResult;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('(2)');
    });

    it('should display suggested skills when available', () => {
      component.result = mockResult;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Suggested Skills');
      expect(compiled.textContent).toContain('Rust');
    });

    it('should display "None" when skills array is empty', () => {
      component.result = {
        matchedSkills: [],
        missingSkills: [],
        suggestedSkills: [],
      };
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('None');
    });

    it('should not show suggested skills section when empty', () => {
      component.result = {
        matchedSkills: ['JavaScript'],
        missingSkills: ['Python'],
        suggestedSkills: [],
      };
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).not.toContain('Suggested Skills');
    });
  });
});
