import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { InsightsPanelComponent } from './insights-panel.component';

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
      const mockInsights = [
        { title: '关键发现', description: '候选人技能匹配度高' },
        { title: '建议', description: '安排技术面试' },
      ];
      component.insights = mockInsights;
      expect(component.insights).toEqual(mockInsights);
    });
  });

  describe('渲染测试', () => {
    it('should render insights list', () => {
      component.insights = [
        { title: '发现1', description: '描述1' },
        { title: '发现2', description: '描述2' },
      ];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('发现1');
      expect(compiled.textContent).toContain('描述1');
      expect(compiled.textContent).toContain('发现2');
    });

    it('should show empty state when no insights', () => {
      component.insights = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无洞察');
    });
  });
});
