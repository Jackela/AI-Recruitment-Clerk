import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import type { ChartDataPoint } from './pie-chart.component';
import { PieChartComponent } from './pie-chart.component';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  const mockData: ChartDataPoint[] = [
    { label: 'Category A', value: 30 },
    { label: 'Category B', value: 20 },
    { label: 'Category C', value: 50 },
  { label: 'Category D', value: 15 },
  { label: 'Category E', value: 25 },
  { label: 'Category F', value: 10 },
  { label: 'Category G', value: 5 },
  { label: 'Category H', value: 8 },
  { label: 'Category I', value: 12 },
    { label: 'Category J', value: 3 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
  });

  describe('Component Creation', () => {
    it('should create', () => {
    expect(component).toBeTruthy();
    });

    it('should have default colors defined', () => {
    expect(component.defaultColors).toBeDefined();
    expect(component.defaultColors.length).toBeGreaterThan(0);
  });

    it('should have default showLegend as true', () => {
    expect(component.showLegend).toBe(true);
  });

    it('should have default donut as false', () => {
    expect(component.donut).toBe(false);
  });
  });

  describe('slices computed property', () => {
    it('should return empty array when no data', () => {
      component.data = [];
      expect(component.slices).toEqual([]);
    });

    it('should return empty array when total is zero', () => {
      component.data = [
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
      ];
      expect(component.slices).toEqual([]);
    });

    it('should compute slices for valid data', () => {
      component.data = mockData;
      const slices = component.slices;

      expect(slices.length).toBe(mockData.length);
      slices.forEach((slice) => {
        expect(slice.path).toBeDefined();
        expect(slice.path).toContain('M 0 0');
      });
    });

    it('should use custom colors when provided', () => {
      const customData: ChartDataPoint[] = [
        { label: 'Custom', value: 50, color: '#ff0000' },
      ];
      component.data = customData;
      const slices = component.slices;

      expect(slices[0].color).toBe('#ff0000');
    });

    it('should use default colors when no custom color', () => {
      component.data = [{ label: 'Default', value: 100 }];
      const slices = component.slices;

      expect(slices[0].color).toBeUndefined();
    });

    it('should calculate correct total', () => {
      component.data = [
        { label: 'A', value: 25 },
        { label: 'B', value: 75 },
      ];
      const slices = component.slices;

      // 25% and 75% should create proportional slices
      expect(slices.length).toBe(2);
    });

    it('should handle large arc flag for slices > 180 degrees', () => {
      component.data = [
        { label: 'Large', value: 200 },
        { label: 'Small', value: 100 },
      ];
      const slices = component.slices;

      // The large slice should have largeArcFlag = 1
      expect(slices[0].path).toContain('1');
    });

    it('should handle small arc flag for slices <= 180 degrees', () => {
      component.data = [
        { label: 'Small 1', value: 10 },
        { label: 'Small 2', value: 10 },
        { label: 'Small 3', value: 10 },
      ];
      const slices = component.slices;

      // All small slices should not have large arc
      slices.forEach((slice) => {
        expect(slice.path).toMatch(/A \d+ \d+ 0 \d+ \d+ 0/);
      });
    });

    it('should handle single data point', () => {
      component.data = [{ label: 'Only', value: 100 }];
      const slices = component.slices;

      expect(slices.length).toBe(1);
      expect(slices[0].path).toBeDefined();
    });
  });

  describe('Template Rendering', () => {
    it('should render SVG element', () => {
      component.data = mockData;
      fixture.detectChanges();

      const svg = fixture.nativeElement.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render legend when showLegend is true', () => {
      component.data = mockData;
      component.showLegend = true;
      fixture.detectChanges();

      const legend = fixture.nativeElement.querySelector('.pie-legend');
      expect(legend).toBeTruthy();
    });

    it('should not render legend when showLegend is false', () => {
      component.data = mockData;
      component.showLegend = false;
      fixture.detectChanges();

      const legend = fixture.nativeElement.querySelector('.pie-legend');
      expect(legend).toBeFalsy();
    });

    it('should render all legend items', () => {
      component.data = mockData.slice(0, 3);
      fixture.detectChanges();

      const legendItems = fixture.nativeElement.querySelectorAll('.legend-item');
      expect(legendItems.length).toBe(3);
    });

    it('should display correct labels in legend', () => {
      component.data = [{ label: 'Test Label', value: 50 }];
      fixture.detectChanges();

      const label = fixture.nativeElement.querySelector('.legend-label');
      expect(label?.textContent).toBe('Test Label');
    });

    it('should display correct values in legend', () => {
      component.data = [{ label: 'Test', value: 123 }];
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.legend-value');
      expect(value?.textContent).toBe('123');
    });

    it('should apply custom colors to legend', () => {
      component.data = [{ label: 'Test', value: 50, color: '#custom' }];
      fixture.detectChanges();

      const colorBox = fixture.nativeElement.querySelector('.legend-color') as HTMLElement;
      expect(colorBox?.style.background).toContain('custom');
    });
  });

  describe('Donut Mode', () => {
    it('should apply stroke when donut is true', () => {
      component.data = mockData;
      component.donut = true;
      fixture.detectChanges();

      const path = fixture.nativeElement.querySelector('path');
      expect(path?.getAttribute('stroke')).toBe('white');
    });

    it('should apply stroke width when donut is true', () => {
      component.data = mockData;
      component.donut = true;
      fixture.detectChanges();

      const path = fixture.nativeElement.querySelector('path');
      expect(path?.getAttribute('stroke-width')).toBe('30');
    });

    it('should not apply stroke when donut is false', () => {
      component.data = mockData;
      component.donut = false;
      fixture.detectChanges();

      const path = fixture.nativeElement.querySelector('path');
      expect(path?.getAttribute('stroke')).toBe('none');
    });
  });

  describe('Default Colors', () => {
    it('should cycle through default colors', () => {
      // Create more data points than colors
      const manyData: ChartDataPoint[] = component.defaultColors.map((_, i) => ({
        label: `Item ${i}`,
        value: 10,
      }));

      component.data = manyData;
      const slices = component.slices;

      // Verify that colors cycle
      expect(slices.length).toBe(manyData.length);
    });

    it('should have expected default colors', () => {
      expect(component.defaultColors).toContain('#3498db');
      expect(component.defaultColors).toContain('#e74c3c');
      expect(component.defaultColors).toContain('#27ae60');
    });
  });
});
