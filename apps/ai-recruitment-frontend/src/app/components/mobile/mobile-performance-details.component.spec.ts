import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobilePerformanceDetailsComponent } from './mobile-performance-details.component';
import type { PerformanceMetrics } from '../../types/performance-metrics.type';

describe('MobilePerformanceDetailsComponent', () => {
  let component: MobilePerformanceDetailsComponent;
  let fixture: ComponentFixture<MobilePerformanceDetailsComponent>;

  const mockMetrics: PerformanceMetrics = {
    lcp: 1200,
    fid: 50,
    cls: 0.05,
    fcp: 800,
    ttfb: 100,
    tbt: 150,
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    connectionType: '4g',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    deviceMemory: 8,
    hardwareConcurrency: 8,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobilePerformanceDetailsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MobilePerformanceDetailsComponent);
    component = fixture.componentInstance;
    component.metrics = mockMetrics;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept metrics input', () => {
      expect(component.metrics).toBe(mockMetrics);
    });

    it('should have performance service injected', () => {
      expect(component['performanceService']).toBeTruthy();
    });
  });

  describe('Template Rendering', () => {
    it('should render performance details container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.performance-details')).toBeTruthy();
    });

    it('should render Core Web Vitals section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const sections = compiled.querySelectorAll('.metrics-section');
      expect(sections.length).toBeGreaterThanOrEqual(1);
      expect(sections[0].textContent).toContain('Core Web Vitals');
    });

    it('should render LCP metric', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('LCP');
      expect(compiled.textContent).toContain('Largest Contentful Paint');
    });

    it('should render FID metric', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('FID');
      expect(compiled.textContent).toContain('First Input Delay');
    });

    it('should render CLS metric', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('CLS');
      expect(compiled.textContent).toContain('Cumulative Layout Shift');
    });

    it('should render Loading Performance section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Loading Performance');
    });

    it('should render Memory Usage section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Memory Usage');
    });

    it('should render Network section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Network');
    });

    it('should render Device section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Device');
    });

    it('should render metric grids', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const grid = compiled.querySelector('.metric-grid');
      expect(grid).toBeTruthy();
    });

    it('should render memory bar', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const memoryBar = compiled.querySelector('.memory-bar');
      expect(memoryBar).toBeTruthy();
    });
  });
});
