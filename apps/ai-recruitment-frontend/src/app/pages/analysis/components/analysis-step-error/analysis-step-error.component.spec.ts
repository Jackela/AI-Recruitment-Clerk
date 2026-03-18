import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisStepErrorComponent } from './analysis-step-error.component';

describe('AnalysisStepErrorComponent', () => {
  let component: AnalysisStepErrorComponent;
  let fixture: ComponentFixture<AnalysisStepErrorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalysisStepErrorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalysisStepErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render error title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('分析出错');
    });
  });

  describe('错误处理测试', () => {
    it('should display error message', () => {
      component.error = '文件解析失败';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('文件解析失败');
    });

    it('should emit retry event', () => {
      const emitSpy = jest.spyOn(component.retry, 'emit');
      component.onRetry();
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
