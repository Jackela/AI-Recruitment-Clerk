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

    it('should initialize with empty arrays', () => {
      expect(component.recommendations).toEqual([]);
      expect(component.strengths).toEqual([]);
      expect(component.improvements).toEqual([]);
    });
  });

  describe('输入属性测试', () => {
    it('should accept recommendations input', () => {
      const mockRecommendations = ['建议1', '建议2', '建议3'];
      component.recommendations = mockRecommendations;
      expect(component.recommendations).toEqual(mockRecommendations);
    });

    it('should accept strengths input', () => {
      const mockStrengths = ['优势1', '优势2'];
      component.strengths = mockStrengths;
      expect(component.strengths).toEqual(mockStrengths);
    });

    it('should accept improvements input', () => {
      const mockImprovements = ['改进1', '改进2'];
      component.improvements = mockImprovements;
      expect(component.improvements).toEqual(mockImprovements);
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

    it('should render strengths when provided', () => {
      component.strengths = ['优势1', '优势2'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('优势分析');
      expect(compiled.textContent).toContain('优势1');
    });

    it('should render improvements when provided', () => {
      component.improvements = ['改进1', '改进2'];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('改进建议');
      expect(compiled.textContent).toContain('改进1');
    });

    it('should show empty state when no data', () => {
      component.recommendations = [];
      component.strengths = [];
      component.improvements = [];
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('暂无AI建议');
    });
  });
});
