import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent, ChartDataPoint } from './bar-chart.component';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  const mockData: ChartDataPoint[] = [
    { label: 'A', value: 10, color: '#3498db' },
    { label: 'B', value: 20, color: '#e74c3c' },
    { label: 'C', value: 30, color: '#27ae60' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
    component.data = mockData;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept data input', () => {
      expect(component.data).toBe(mockData);
    });

    it('should have default showLabels value', () => {
      expect(component.showLabels).toBe(true);
    });

    it('should accept showLabels input', () => {
      component.showLabels = false;
      expect(component.showLabels).toBe(false);
    });

    it('should accept xAxisLabel input', () => {
      component.xAxisLabel = 'X Axis';
      expect(component.xAxisLabel).toBe('X Axis');
    });

    it('should accept yAxisLabel input', () => {
      component.yAxisLabel = 'Y Axis';
      expect(component.yAxisLabel).toBe('Y Axis');
    });

    it('should accept chartTitle input', () => {
      component.chartTitle = 'Test Chart';
      expect(component.chartTitle).toBe('Test Chart');
    });
  });

  describe('Output Events', () => {
    it('should emit dataPointSelect event', () => {
      const emitSpy = jest.spyOn(component.dataPointSelect, 'emit');
      const dataPoint = mockData[0];
      component.dataPointSelect.emit(dataPoint);
      expect(emitSpy).toHaveBeenCalledWith(dataPoint);
    });
  });

  describe('Methods', () => {
    it('should calculate bar height correctly', () => {
      const height = component.getBarHeight(30, mockData);
      expect(height).toBe(100);
    });

    it('should return 0 for bar height when max value is 0', () => {
      const emptyData = [{ label: 'Empty', value: 0 }];
      const height = component.getBarHeight(0, emptyData);
      expect(height).toBe(0);
    });

    it('should generate aria label correctly', () => {
      component.chartTitle = 'Test Chart';
      expect(component.ariaLabel).toBe('Test Chart，包含3个数据项');
    });

    it('should generate default aria label when chartTitle is not set', () => {
      component.chartTitle = undefined;
      expect(component.ariaLabel).toBe('柱状图，包含3个数据项');
    });

    it('should get bar aria label correctly', () => {
      const label = component.getBarAriaLabel(mockData[0]);
      expect(label).toBe('A: 10');
    });

    it('should handle focus correctly', () => {
      component.onFocus();
      expect(component.focusedIndex()).toBe(0);
      expect(component.isKeyboardActive()).toBe(true);
    });

    it('should handle blur correctly', () => {
      component.onFocus();
      component.onBlur();
      expect(component.isKeyboardActive()).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(() => {
      component.onFocus();
    });

    it('should handle ArrowRight key', () => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      component.handleKeyboardEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(component.focusedIndex()).toBe(1);
    });

    it('should handle ArrowLeft key', () => {
      component.focusedIndex.set(1);
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      component.handleKeyboardEvent(event);
      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(component.focusedIndex()).toBe(0);
    });

    it('should handle Enter key to select', () => {
      const emitSpy = jest.spyOn(component.dataPointSelect, 'emit');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.handleKeyboardEvent(event);
      expect(emitSpy).toHaveBeenCalledWith(mockData[0]);
    });

    it('should handle Space key to select', () => {
      const emitSpy = jest.spyOn(component.dataPointSelect, 'emit');
      const event = new KeyboardEvent('keydown', { key: ' ' });
      component.handleKeyboardEvent(event);
      expect(emitSpy).toHaveBeenCalledWith(mockData[0]);
    });

    it('should not handle keyboard when data is empty', () => {
      component.data = [];
      component.onFocus();
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
      component.handleKeyboardEvent(event);
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe('Template Rendering', () => {
    it('should render chart container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.bar-chart')).toBeTruthy();
    });

    it('should render bars for each data point', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const bars = compiled.querySelectorAll('.bar-item');
      expect(bars.length).toBe(3);
    });

    it('should render bar labels when showLabels is true', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.bar-label');
      expect(labels.length).toBe(3);
    });
  });
});
