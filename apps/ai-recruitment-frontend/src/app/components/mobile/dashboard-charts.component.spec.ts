import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  DashboardChartsComponent,
  DashboardChart,
  ChartDataPoint,
  ChartSeries,
} from './dashboard-charts.component';

describe('DashboardChartsComponent', () => {
  let component: DashboardChartsComponent;
  let fixture: ComponentFixture<DashboardChartsComponent>;

  const mockDataPoints: ChartDataPoint[] = [
    { label: 'Mon', value: 10 },
    { label: 'Tue', value: 20 },
    { label: 'Wed', value: 15 },
  ];

  const mockCharts: DashboardChart[] = [
    {
      id: 'chart-1',
      title: 'Sparkline Chart',
      type: 'sparkline',
      data: mockDataPoints,
      height: 120,
    },
    {
      id: 'chart-2',
      title: 'Bar Chart',
      type: 'bar',
      data: mockDataPoints,
      showLabels: true,
      height: 180,
    },
    {
      id: 'chart-3',
      title: 'Pie Chart',
      type: 'pie',
      data: mockDataPoints,
      showLegend: true,
      height: 200,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardChartsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardChartsComponent);
    component = fixture.componentInstance;
    component.charts = mockCharts;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept charts input', () => {
      expect(component.charts).toBe(mockCharts);
    });

    it('should handle empty charts array', () => {
      component.charts = [];
      fixture.detectChanges();
      expect(component.charts.length).toBe(0);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should initialize ngOnInit', () => {
      component.ngOnInit();
      expect(component).toBeTruthy();
    });

    it('should cleanup ngOnDestroy', () => {
      component.ngOnInit();
      component.ngOnDestroy();
      expect(component).toBeTruthy();
    });
  });

  describe('Methods', () => {
    it('should refresh chart correctly', () => {
      const chart = { ...mockCharts[0], loading: false, error: null };
      component.charts = [chart];
      jest.useFakeTimers();
      component.refreshChart('chart-1');
      expect(chart.loading).toBe(true);
      jest.advanceTimersByTime(1000);
      expect(chart.loading).toBe(false);
      jest.useRealTimers();
    });

    it('should not refresh non-existent chart', () => {
      component.refreshChart('non-existent');
      // Should not throw
      expect(component).toBeTruthy();
    });

    it('should get chart data points correctly', () => {
      const result = component.getChartDataPoints(mockCharts[0]);
      expect(result).toEqual(mockDataPoints);
    });

    it('should get chart series correctly', () => {
      const seriesData: ChartSeries[] = [
        { name: 'Series 1', data: mockDataPoints },
      ];
      const chartWithSeries = { ...mockCharts[0], data: seriesData };
      const result = component.getChartSeries(chartWithSeries);
      expect(result).toEqual(seriesData);
    });

    it('should calculate sparkline meta with increase', () => {
      const data: ChartDataPoint[] = [
        { label: '1', value: 10 },
        { label: '2', value: 20 },
      ];
      const meta = component.getSparklineMeta(data);
      expect(meta.current).toBe(20);
      expect(meta.previous).toBe(10);
      expect(meta.changeType).toBe('increase');
    });

    it('should calculate sparkline meta with decrease', () => {
      const data: ChartDataPoint[] = [
        { label: '1', value: 20 },
        { label: '2', value: 10 },
      ];
      const meta = component.getSparklineMeta(data);
      expect(meta.current).toBe(10);
      expect(meta.previous).toBe(20);
      expect(meta.changeType).toBe('decrease');
    });

    it('should calculate sparkline meta with neutral change', () => {
      const data: ChartDataPoint[] = [
        { label: '1', value: 10 },
        { label: '2', value: 10.05 },
      ];
      const meta = component.getSparklineMeta(data);
      expect(meta.changeType).toBe('neutral');
    });

    it('should return default meta for empty data', () => {
      const meta = component.getSparklineMeta([]);
      expect(meta.current).toBe(0);
      expect(meta.previous).toBe(0);
      expect(meta.changeType).toBe('neutral');
    });
  });

  describe('Template Rendering', () => {
    it('should render charts container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.dashboard-charts')).toBeTruthy();
    });

    it('should render chart wrappers', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const wrappers = compiled.querySelectorAll('.chart-wrapper');
      expect(wrappers.length).toBe(3);
    });

    it('should render chart titles', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const titles = compiled.querySelectorAll('.chart-title');
      expect(titles.length).toBe(3);
      expect(titles[0].textContent).toContain('Sparkline Chart');
    });

    it('should show loading state', () => {
      component.charts = [{ ...mockCharts[0], loading: true }];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.chart-loading')).toBeTruthy();
    });

    it('should show error state', () => {
      component.charts = [{ ...mockCharts[0], error: 'Test error' }];
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.chart-error')).toBeTruthy();
    });
  });
});
