import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('组件初始化测试', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should have default values', () => {
      expect(component.value).toBe(0);
      expect(component.label).toBe('');
      expect(component.icon).toBe('calendar');
      expect(component.type).toBe('today');
    });
  });

  describe('输入属性测试', () => {
    it('should accept value input', () => {
      component.value = 1000;
      expect(component.value).toBe(1000);
    });

    it('should accept label input', () => {
      component.label = '总分析数';
      expect(component.label).toBe('总分析数');
    });

    it('should accept icon input', () => {
      component.icon = 'chart';
      expect(component.icon).toBe('chart');
    });

    it('should accept type input', () => {
      component.type = 'total';
      expect(component.type).toBe('total');
    });

    it('should accept scoreClass input', () => {
      component.scoreClass = 'high';
      expect(component.scoreClass).toBe('high');
    });

    it('should accept suffix input', () => {
      component.suffix = '%';
      expect(component.suffix).toBe('%');
    });

    it('should accept title input', () => {
      component.title = '总分析数标题';
      expect(component.title).toBe('总分析数标题');
    });
  });

  describe('格式化测试', () => {
    it('should format large values with K suffix', () => {
      component.value = 1500;
      expect(component.formattedValue).toBe('1.5K');
    });

    it('should format very large values with M suffix', () => {
      component.value = 2500000;
      expect(component.formattedValue).toBe('2.5M');
    });

    it('should return value as string for small values', () => {
      component.value = 50;
      expect(component.formattedValue).toBe('50');
    });
  });

  describe('图标类测试', () => {
    it('should return score class with score type', () => {
      component.type = 'score';
      component.scoreClass = 'high';
      expect(component.getIconClass()).toBe('score high');
    });

    it('should return type only when not score', () => {
      component.type = 'total';
      expect(component.getIconClass()).toBe('total');
    });
  });
});
