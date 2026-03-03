import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ChartDataPoint, SparklineMeta } from './sparkline-chart.component';
import { SparklineChartComponent } from './sparkline-chart.component';

describe('SparklineChartComponent', () => {
  let component: SparklineChartComponent;
  let fixture: ComponentFixture<SparklineChartComponent>;

  const mockData: ChartDataPoint[] = [
    { label: 'Jan', value: 10 },
    { label: 'Feb', value: 20 },
    { label: 'Mar', value: 15 },
    { label: 'Apr', value: 30 },
    { label: 'May', value: 25 },
  ];

  const mockMeta: SparklineMeta = {
    current: 25,
    previous: 20,
    change: 25,
    changeType: 'increase',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparklineChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SparklineChartComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('viewBox computed property', () => {
    it('should return correct viewBox for data', () => {
      component.data = mockData;
      const viewBox = component.viewBox;

      expect(viewBox).toBe(`0 0 ${mockData.length} 100`);
    });

    it('should handle empty data', () => {
      component.data = [];
      const viewBox = component.viewBox;

      expect(viewBox).toBe('0 0 1 100');
    });

    it('should handle single data point', () => {
      component.data = [{ label: 'Single', value: 50 }];
      const viewBox = component.viewBox;

      expect(viewBox).toBe('0 0 1 100');
    });
  });

  describe('points computed property', () => {
    it('should return empty string for empty data', () => {
      component.data = [];
      expect(component.points).toBe('');
    });

    it('should compute points for valid data', () => {
      component.data = mockData;
      const points = component.points;

      expect(points).toBeDefined();
      expect(points.length).toBeGreaterThan(0);
    });

    it('should generate comma-separated coordinates', () => {
      component.data = mockData;
      const points = component.points;

      const parts = points.split(' ');
      expect(parts.length).toBe(mockData.length);
    });

    it('should handle constant values', () => {
      component.data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 10 },
        { label: 'C', value: 10 },
      ];
      const points = component.points;

      expect(points).toBeDefined();
    });

    it('should handle increasing values', () => {
      component.data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
        { label: 'C', value: 30 },
      ];
      const points = component.points;

      expect(points).toBeDefined();
    });

    it('should handle decreasing values', () => {
      component.data = [
        { label: 'A', value: 30 },
        { label: 'B', value: 20 },
        { label: 'C', value: 10 },
      ];
      const points = component.points;

      expect(points).toBeDefined();
    });
  });

  describe('pointsArray computed property', () => {
    it('should return empty array for empty data', () => {
      component.data = [];
      expect(component.pointsArray).toEqual([]);
    });

    it('should return array of point objects', () => {
      component.data = mockData;
      const pointsArray = component.pointsArray;

      expect(Array.isArray(pointsArray)).toBe(true);
      expect(pointsArray.length).toBe(mockData.length);
    });

    it('should have x and y properties for each point', () => {
      component.data = mockData;
      const pointsArray = component.pointsArray;

      pointsArray.forEach((point) => {
        expect(point.x).toBeDefined();
        expect(point.y).toBeDefined();
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
      });
    });

    it('should have sequential x values', () => {
      component.data = mockData;
      const pointsArray = component.pointsArray;

      pointsArray.forEach((point, index) => {
        expect(point.x).toBe(index);
      });
    });

    it('should have y values within expected range', () => {
      component.data = mockData;
      const pointsArray = component.pointsArray;

      pointsArray.forEach((point) => {
        // Y should be between 10 and 90 based on the calculation
        expect(point.y).toBeGreaterThanOrEqual(10);
        expect(point.y).toBeLessThanOrEqual(90);
      });
    });
  });

  describe('absChange computed property', () => {
    it('should return absolute value of change', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, change: 25.5 };
      expect(component.absChange).toBe('25.5');
    });

    it('should handle negative change', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, change: -15.3 };
      expect(component.absChange).toBe('15.3');
    });

    it('should handle zero change', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, change: 0 };
      expect(component.absChange).toBe('0.0');
    });

    it('should round to 1 decimal place', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, change: 33.333 };
      expect(component.absChange).toBe('33.3');
    });
  });

  describe('Template Rendering', () => {
    it('should render SVG element', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render polyline element', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const polyline = fixture.nativeElement.querySelector('polyline');
      expect(polyline).toBeTruthy();
    });

    it('should render circles for each data point', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const circles = fixture.nativeElement.querySelectorAll('circle');
      expect(circles.length).toBe(mockData.length);
    });

    it('should render meta section', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const meta = fixture.nativeElement.querySelector('.sparkline-meta');
      expect(meta).toBeTruthy();
    });

    it('should display current value', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.sparkline-value');
      expect(value?.textContent).toBe('25');
    });

    it('should display change percentage', () => {
      component.data = mockData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.textContent).toContain('25.0%');
    });
  });

  describe('Change Type Indicators', () => {
    it('should show increase indicator', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'increase' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.textContent).toContain('↗');
    });

    it('should show decrease indicator', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'decrease' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.textContent).toContain('↘');
    });

    it('should show neutral indicator', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'neutral' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.textContent).toContain('→');
    });

    it('should apply increase class', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'increase' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.classList).toContain('sparkline-change--increase');
    });

    it('should apply decrease class', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'decrease' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.classList).toContain('sparkline-change--decrease');
    });

    it('should apply neutral class', () => {
      component.data = mockData;
      component.meta = { ...mockMeta, changeType: 'neutral' };
      fixture.detectChanges();

      const change = fixture.nativeElement.querySelector('.sparkline-change');
      expect(change?.classList).toContain('sparkline-change--neutral');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single data point', () => {
      component.data = [{ label: 'Only', value: 50 }];
      component.meta = mockMeta;
      fixture.detectChanges();

      const circles = fixture.nativeElement.querySelectorAll('circle');
      expect(circles.length).toBe(1);
    });

    it('should handle large data set', () => {
      const largeData: ChartDataPoint[] = Array.from({ length: 20 }, (_, i) => ({
        label: `Point ${i}`,
        value: Math.random() * 100,
      }));

      component.data = largeData;
      component.meta = mockMeta;
      fixture.detectChanges();

      const circles = fixture.nativeElement.querySelectorAll('circle');
      expect(circles.length).toBe(20);
    });

  });
});
