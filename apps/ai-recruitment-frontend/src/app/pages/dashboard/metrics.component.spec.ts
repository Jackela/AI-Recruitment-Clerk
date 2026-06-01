import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MetricsComponent } from './metrics.component';

describe('MetricsComponent', () => {
  let component: MetricsComponent;
  let fixture: ComponentFixture<MetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty metrics', () => {
      expect(component.metrics).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept metrics input', () => {
      const mockMetrics = [
        { label: '总简历', value: 100 },
        { label: '已分析', value: 80 },
      ];
      component.metrics = mockMetrics;
      expect(component.metrics).toEqual(mockMetrics);
    });
  });

  describe('渲染测试', () => {
    it('should render metrics list', () => {
      component.metrics = [
        { label: '测试1', value: 10 },
        { label: '测试2', value: 20 },
      ];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('测试1');
      expect(compiled.textContent).toContain('10');
    });

    it('should show empty state when no metrics', () => {
      component.metrics = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无指标');
    });
  });
});
