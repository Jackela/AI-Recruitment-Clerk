import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BentoTrendIndicatorComponent } from './bento-trend-indicator.component';

describe('BentoTrendIndicatorComponent', () => {
  let component: BentoTrendIndicatorComponent;
  let fixture: ComponentFixture<BentoTrendIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoTrendIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoTrendIndicatorComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render trend container', () => {
      component.value = 10;
      component.direction = 'up';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.trend-indicator');
      expect(container).toBeTruthy();
    });

    it('should render value', () => {
      component.value = 15;
      component.direction = 'up';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.trend-value');
      expect(value).toBeTruthy();
      expect(value.textContent).toContain('15');
    });
  });

  describe('Input/Output Tests', () => {
    it('should bind value input correctly', () => {
      component.value = 25;
      fixture.detectChanges();

      expect(component.value).toBe(25);
    });

    it('should bind direction input correctly', () => {
      component.direction = 'down';
      fixture.detectChanges();

      expect(component.direction).toBe('down');
    });

    it('should bind showIcon input correctly', () => {
      component.showIcon = false;
      fixture.detectChanges();

      expect(component.showIcon).toBe(false);
    });
  });

  describe('Trend Direction Tests', () => {
    it('should apply up trend class', () => {
      component.value = 10;
      component.direction = 'up';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.trend-indicator');
      expect(container.classList.contains('trend-up')).toBe(true);
    });

    it('should apply down trend class', () => {
      component.value = -10;
      component.direction = 'down';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.trend-indicator');
      expect(container.classList.contains('trend-down')).toBe(true);
    });

    it('should apply neutral trend class', () => {
      component.value = 0;
      component.direction = 'neutral';
      fixture.detectChanges();

      const container = fixture.nativeElement.querySelector('.trend-indicator');
      expect(container.classList.contains('trend-neutral')).toBe(true);
    });
  });

  describe('Icon Tests', () => {
    it('should render up icon for up trend', () => {
      component.value = 10;
      component.direction = 'up';
      component.showIcon = true;
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.trend-icon');
      expect(icon).toBeTruthy();
    });

    it('should render down icon for down trend', () => {
      component.value = -10;
      component.direction = 'down';
      component.showIcon = true;
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.trend-icon');
      expect(icon).toBeTruthy();
    });

    it('should not render icon when showIcon is false', () => {
      component.value = 10;
      component.direction = 'up';
      component.showIcon = false;
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector('.trend-icon');
      expect(icon).toBeFalsy();
    });
  });

  describe('Formatting Tests', () => {
    it('should format positive values with + sign', () => {
      component.value = 15;
      component.direction = 'up';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.trend-value');
      expect(value.textContent).toContain('+15');
    });

    it('should format negative values correctly', () => {
      component.value = -15;
      component.direction = 'down';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.trend-value');
      expect(value.textContent).toContain('-15');
    });

    it('should display percentage symbol', () => {
      component.value = 10;
      component.direction = 'up';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.trend-value');
      expect(value.textContent).toContain('%');
    });
  });
});
