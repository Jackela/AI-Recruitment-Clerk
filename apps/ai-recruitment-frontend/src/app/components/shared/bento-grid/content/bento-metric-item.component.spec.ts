import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoMetricItemComponent } from './bento-metric-item.component';
import type { BentoMetric } from '../types/bento-card.types';

describe('BentoMetricItemComponent', () => {
  let component: BentoMetricItemComponent;
  let fixture: ComponentFixture<BentoMetricItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoMetricItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoMetricItemComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render metric item container', () => {
      component.metric = { label: 'Test', value: '100' };
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.metric-item');
      expect(container).toBeTruthy();
    });

    it('should render label', () => {
      component.metric = { label: 'Users', value: '100' };
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.metric-label');
      expect(label).toBeTruthy();
      expect(label.textContent.trim()).toBe('Users');
    });

    it('should render value', () => {
      component.metric = { label: 'Users', value: '100' };
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.metric-value');
      expect(value).toBeTruthy();
      expect(value.textContent.trim()).toBe('100');
    });
  });

  describe('Input/Output Tests', () => {
    it('should bind metric input correctly', () => {
      const metric: BentoMetric = { label: 'Test', value: '50' };
      component.metric = metric;
      fixture.detectChanges();

      expect(component.metric).toEqual(metric);
    });

    it('should handle metric with change', () => {
      const metric: BentoMetric = {
        label: 'Revenue',
        value: '$1000',
        change: { value: 10, type: 'increase' },
      };
      component.metric = metric;
      fixture.detectChanges();

      expect(component.metric.change).toBeDefined();
    });
  });

  describe('Change Indicator Tests', () => {
    it('should render increase indicator', () => {
      component.metric = {
        label: 'Sales',
        value: '100',
        change: { value: 15, type: 'increase' },
      };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.metric-change');
      expect(change).toBeTruthy();
      expect(change.classList.contains('change-increase')).toBe(true);
    });

    it('should render decrease indicator', () => {
      component.metric = {
        label: 'Losses',
        value: '50',
        change: { value: 5, type: 'decrease' },
      };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.metric-change');
      expect(change).toBeTruthy();
      expect(change.classList.contains('change-decrease')).toBe(true);
    });

    it('should display change value', () => {
      component.metric = {
        label: 'Sales',
        value: '100',
        change: { value: 15, type: 'increase' },
      };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.metric-change');
      expect(change.textContent).toContain('15');
    });
  });

  describe('Conditional Rendering Tests', () => {
    it('should not render change indicator when no change', () => {
      component.metric = { label: 'Static', value: '100' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.metric-change');
      expect(change).toBeFalsy();
    });
  });
});
