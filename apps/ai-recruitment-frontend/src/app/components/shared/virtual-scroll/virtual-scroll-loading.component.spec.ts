import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { VirtualScrollLoadingComponent } from './virtual-scroll-loading.component';

describe('VirtualScrollLoadingComponent', () => {
  let component: VirtualScrollLoadingComponent;
  let fixture: ComponentFixture<VirtualScrollLoadingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VirtualScrollLoadingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VirtualScrollLoadingComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render loading container', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container).toBeTruthy();
    });

    it('should render spinner', () => {
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should render loading text', () => {
      fixture.detectChanges();

      const text = fixture.nativeElement.querySelector('.loading-text');
      expect(text).toBeTruthy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default message', () => {
      expect(component.message).toBe('加载中...');
    });

    it('should bind message input correctly', () => {
      component.message = 'Loading data...';
      fixture.detectChanges();

      expect(component.message).toBe('Loading data...');
    });
  });

  describe('Accessibility Tests', () => {
    it('should have role status', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.getAttribute('role')).toBe('status');
    });

    it('should have aria-live polite', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.getAttribute('aria-live')).toBe('polite');
    });

    it('should have aria-busy true', () => {
      fixture.detectChanges();

      const container =
        fixture.nativeElement.querySelector('.loading-container');
      expect(container.getAttribute('aria-busy')).toBe('true');
    });
  });
});
