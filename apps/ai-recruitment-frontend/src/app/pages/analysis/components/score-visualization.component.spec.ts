import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ScoreVisualizationComponent } from './score-visualization.component';

describe('ScoreVisualizationComponent', () => {
  let component: ScoreVisualizationComponent;
  let fixture: ComponentFixture<ScoreVisualizationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreVisualizationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreVisualizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default score', () => {
      expect(component.score).toBe(0);
    });
  });

  describe('输入属性测试', () => {
    it('should accept score input', () => {
      component.score = 85;
      expect(component.score).toBe(85);
    });

    it('should accept summary input', () => {
      component.summary = '优秀候选人';
      expect(component.summary).toBe('优秀候选人');
    });

    it('should accept showIndicator input', () => {
      component.showIndicator = true;
      expect(component.showIndicator).toBe(true);
    });

    it('should accept animated input', () => {
      component.animated = true;
      expect(component.animated).toBe(true);
    });
  });

  describe('评分等级测试', () => {
    it('should return excellent for score >= 80', () => {
      component.score = 85;
      expect(component.getScoreLevel()).toBe('excellent');
    });

    it('should return good for score 60-79', () => {
      component.score = 70;
      expect(component.getScoreLevel()).toBe('good');
    });

    it('should return average for score < 60', () => {
      component.score = 50;
      expect(component.getScoreLevel()).toBe('average');
    });
  });
});
