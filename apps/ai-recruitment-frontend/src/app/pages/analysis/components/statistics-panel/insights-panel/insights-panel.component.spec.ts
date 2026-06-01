import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { InsightsPanelComponent } from './insights-panel.component';
import type { PerformanceInsight } from '../types/statistics.interface';

describe('InsightsPanelComponent', () => {
  let component: InsightsPanelComponent;
  let fixture: ComponentFixture<InsightsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsightsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InsightsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty insights', () => {
      expect(component.insights).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept insights input', () => {
      const mockInsights: PerformanceInsight[] = [
        { icon: '📊', text: '候选人技能匹配度高' },
        { icon: '💡', text: '建议安排技术面试' },
      ];
      component.insights = mockInsights;
      expect(component.insights).toEqual(mockInsights);
    });
  });

  describe('渲染测试', () => {
    it('should render insights list', () => {
      component.insights = [
        { icon: '🎯', text: '发现1文本' },
        { icon: '🚀', text: '发现2文本' },
      ];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('发现1文本');
      expect(compiled.textContent).toContain('发现2文本');
    });

    it('should render insight icons', () => {
      component.insights = [{ icon: '⭐', text: '测试洞察' }];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('⭐');
      expect(compiled.textContent).toContain('测试洞察');
    });
  });
});
