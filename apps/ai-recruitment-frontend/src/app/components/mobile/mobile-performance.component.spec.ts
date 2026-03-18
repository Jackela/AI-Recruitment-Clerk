import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobilePerformanceComponent } from './mobile-performance.component';

describe('MobilePerformanceComponent', () => {
  let component: MobilePerformanceComponent;
  let fixture: ComponentFixture<MobilePerformanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobilePerformanceComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobilePerformanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should initialize with expanded signal false', () => {
      expect(component.expanded()).toBe(false);
    });

    it('should initialize with showMetrics signal', () => {
      expect(typeof component.showMetrics()).toBe('boolean');
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should initialize on ngOnInit', () => {
      const initSpy = jest.spyOn(component['performanceService'], 'initialize');
      component.ngOnInit();
      expect(initSpy).toHaveBeenCalled();
    });

    it('should destroy on ngOnDestroy', () => {
      const destroySpy = jest.spyOn(component['performanceService'], 'destroy');
      component.ngOnDestroy();
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Methods', () => {
    it('should toggle expanded state', () => {
      expect(component.expanded()).toBe(false);
      component.toggleExpanded();
      expect(component.expanded()).toBe(true);
      component.toggleExpanded();
      expect(component.expanded()).toBe(false);
    });

    it('should have performance service injected', () => {
      expect(component['performanceService']).toBeTruthy();
    });
  });

  describe('Template Rendering', () => {
    it('should render performance monitor when showMetrics is true', () => {
      component.showMetrics.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.performance-monitor')).toBeTruthy();
    });

    it('should not render performance monitor when showMetrics is false', () => {
      component.showMetrics.set(false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.performance-monitor')).toBeFalsy();
    });

    it('should render performance badge', () => {
      component.showMetrics.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.performance-badge')).toBeTruthy();
    });

    it('should render toggle button', () => {
      component.showMetrics.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.toggle-details')).toBeTruthy();
    });

    it('should show "Show Details" text when collapsed', () => {
      component.showMetrics.set(true);
      component.expanded.set(false);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Show Details');
    });

    it('should show "Hide Details" text when expanded', () => {
      component.showMetrics.set(true);
      component.expanded.set(true);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Hide Details');
    });
  });
});
