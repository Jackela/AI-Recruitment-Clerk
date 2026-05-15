import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ScoreDisplayComponent } from './score-display.component';

describe('ScoreDisplayComponent', () => {
  let component: ScoreDisplayComponent;
  let fixture: ComponentFixture<ScoreDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreDisplayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreDisplayComponent);
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
    });
  });

  describe('输入属性测试', () => {
    it('should accept score input', () => {
      component.score = 92;
      expect(component.score).toBe(92);
    });

    it('should accept candidateName input', () => {
      component.candidateName = '李四';
      expect(component.candidateName).toBe('李四');
    });

    it('should accept candidateEmail input', () => {
      component.candidateEmail = 'lisi@example.com';
      expect(component.candidateEmail).toBe('lisi@example.com');
    });

    it('should accept targetPosition input', () => {
      component.targetPosition = '高级软件工程师';
      expect(component.targetPosition).toBe('高级软件工程师');
    });
  });

  describe('渲染测试', () => {
    it('should render score value', () => {
      component.score = 85;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('85');
      expect(compiled.textContent).toContain('分');
    });

    it('should render candidate name when provided', () => {
      component.candidateName = '王五';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('王五');
    });

    it('should render candidate email when provided', () => {
      component.candidateEmail = 'wangwu@example.com';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('wangwu@example.com');
    });

    it('should render target position when provided', () => {
      component.targetPosition = '产品经理';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('目标职位: 产品经理');
    });

    it('should not show candidate info when name is empty', () => {
      component.candidateName = '';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.candidate-info')).toBeFalsy();
    });
  });
});
