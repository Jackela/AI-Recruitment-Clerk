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
      expect(component.title).toBe('');
      expect(component.value).toBe(0);
      expect(component.change).toBe(0);
      expect(component.icon).toBe('chart');
    });
  });

  describe('输入属性测试', () => {
    it('should accept title input', () => {
      component.title = '总分析数';
      expect(component.title).toBe('总分析数');
    });

    it('should accept value input', () => {
      component.value = 1000;
      expect(component.value).toBe(1000);
    });

    it('should accept change input', () => {
      component.change = 15;
      expect(component.change).toBe(15);
    });

    it('should accept icon input', () => {
      component.icon = 'users';
      expect(component.icon).toBe('users');
    });
  });

  describe('趋势计算测试', () => {
    it('should return positive trend for positive change', () => {
      component.change = 10;
      expect(component.getTrend()).toBe('positive');
    });

    it('should return negative trend for negative change', () => {
      component.change = -5;
      expect(component.getTrend()).toBe('negative');
    });

    it('should return neutral trend for zero change', () => {
      component.change = 0;
      expect(component.getTrend()).toBe('neutral');
    });
  });
});
