import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ResultOverviewComponent } from './result-overview.component';

describe('ResultOverviewComponent', () => {
  let component: ResultOverviewComponent;
  let fixture: ComponentFixture<ResultOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultOverviewComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.score).toBe(0);
      expect(component.candidateName).toBe('');
      expect(component.candidateEmail).toBe('');
      expect(component.targetPosition).toBe('');
      expect(component.analysisTime).toBe('');
    });
  });

  describe('输入属性测试', () => {
    it('should accept score input', () => {
      component.score = 85;
      expect(component.score).toBe(85);
    });

    it('should accept candidateName input', () => {
      component.candidateName = '张三';
      expect(component.candidateName).toBe('张三');
    });

    it('should accept candidateEmail input', () => {
      component.candidateEmail = 'zhangsan@example.com';
      expect(component.candidateEmail).toBe('zhangsan@example.com');
    });

    it('should accept targetPosition input', () => {
      component.targetPosition = '前端开发工程师';
      expect(component.targetPosition).toBe('前端开发工程师');
    });

    it('should accept analysisTime input', () => {
      component.analysisTime = '2024-01-15 10:30:00';
      expect(component.analysisTime).toBe('2024-01-15 10:30:00');
    });
  });

  describe('渲染测试', () => {
    it('should render overview title', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('分析概览');
    });

    it('should render score display component', () => {
      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('arc-score-display')).toBeTruthy();
    });

    it('should render analysis time when provided', () => {
      component.analysisTime = '2024-01-15 10:30:00';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('2024-01-15 10:30:00');
    });
  });
});
