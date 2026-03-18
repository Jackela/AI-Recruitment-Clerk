import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { RecommendationsPanelComponent } from './recommendations-panel.component';

describe('RecommendationsPanelComponent', () => {
  let component: RecommendationsPanelComponent;
  let fixture: ComponentFixture<RecommendationsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationsPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RecommendationsPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty recommendations', () => {
      expect(component.recommendations).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept recommendations input', () => {
      const mockRecommendations = ['建议1', '建议2', '建议3'];
      component.recommendations = mockRecommendations;
      expect(component.recommendations).toEqual(mockRecommendations);
    });
  });

  describe('渲染测试', () => {
    it('should render recommendations list', () => {
      component.recommendations = [
        '学习新技术',
        '提高沟通能力',
        '参与开源项目',
      ];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('学习新技术');
      expect(compiled.textContent).toContain('提高沟通能力');
      expect(compiled.textContent).toContain('参与开源项目');
    });

    it('should show empty state when no recommendations', () => {
      component.recommendations = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无建议');
    });

    it('should display recommendation count', () => {
      component.recommendations = ['建议1', '建议2'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2');
    });
  });
});
