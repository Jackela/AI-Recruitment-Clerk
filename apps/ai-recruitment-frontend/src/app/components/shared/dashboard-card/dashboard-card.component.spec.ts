import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DashboardCardComponent } from './dashboard-card.component';

describe('DashboardCardComponent', () => {
  let component: DashboardCardComponent;
  let fixture: ComponentFixture<DashboardCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Rendering Tests', () => {
    it('should create component', () => {
      expect(component).toBeTruthy();
    });

    it('should render card element', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      expect(card).toBeTruthy();
    });

    it('should render card content', () => {
      component.value = '100';
      component.title = 'Test Title';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.card-value');
      const title = fixture.nativeElement.querySelector('.card-title');
      expect(value.textContent).toBe('100');
      expect(title.textContent).toBe('Test Title');
    });

    it('should render subtitle when provided', () => {
      component.subtitle = 'Test Subtitle';
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.card-subtitle');
      expect(subtitle).toBeTruthy();
      expect(subtitle.textContent).toBe('Test Subtitle');
    });

    it('should not render subtitle when not provided', () => {
      component.subtitle = '';
      fixture.detectChanges();

      const subtitle = fixture.nativeElement.querySelector('.card-subtitle');
      expect(subtitle).toBeFalsy();
    });
  });

  describe('Input/Output Tests', () => {
    it('should have default values', () => {
      expect(component.title).toBe('');
      expect(component.subtitle).toBe('');
      expect(component.value).toBe('');
      expect(component.icon).toBeNull();
      expect(component.variant).toBe('default');
      expect(component.trend).toBeNull();
    });

    it('should bind title input correctly', () => {
      component.title = 'Dashboard Title';
      fixture.detectChanges();

      expect(component.title).toBe('Dashboard Title');
    });

    it('should bind value input correctly', () => {
      component.value = '42';
      fixture.detectChanges();

      expect(component.value).toBe('42');
    });

    it('should bind all icon types correctly', () => {
      const icons: Array<'jobs' | 'resumes' | 'reports' | 'matches'> = [
        'jobs',
        'resumes',
        'reports',
        'matches',
      ];

      icons.forEach((iconType) => {
        component.icon = iconType;
        fixture.detectChanges();

        expect(component.icon).toBe(iconType);
      });
    });

    it('should bind all variant types correctly', () => {
      const variants: Array<
        'default' | 'primary' | 'success' | 'warning' | 'info'
      > = ['default', 'primary', 'success', 'warning', 'info'];

      variants.forEach((variantType) => {
        component.variant = variantType;
        fixture.detectChanges();

        expect(component.variant).toBe(variantType);
      });
    });

    it('should bind trend input correctly', () => {
      component.trend = { type: 'up', value: '12%' };
      fixture.detectChanges();

      expect(component.trend).toEqual({ type: 'up', value: '12%' });
    });

    it('should render trend indicator for up trend', () => {
      component.trend = { type: 'up', value: '15%' };
      fixture.detectChanges();

      const trendIndicator =
        fixture.nativeElement.querySelector('.trend-indicator');
      expect(trendIndicator).toBeTruthy();
      expect(trendIndicator.classList.contains('trend-up')).toBe(true);
    });

    it('should render trend indicator for down trend', () => {
      component.trend = { type: 'down', value: '-8%' };
      fixture.detectChanges();

      const trendIndicator =
        fixture.nativeElement.querySelector('.trend-indicator');
      expect(trendIndicator).toBeTruthy();
      expect(trendIndicator.classList.contains('trend-down')).toBe(true);
    });
  });

  describe('Icon Rendering Tests', () => {
    it('should render jobs icon', () => {
      component.icon = 'jobs';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeTruthy();
      expect(iconContainer.querySelector('svg')).toBeTruthy();
    });

    it('should render resumes icon', () => {
      component.icon = 'resumes';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render reports icon', () => {
      component.icon = 'reports';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should render matches icon', () => {
      component.icon = 'matches';
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeTruthy();
    });

    it('should not render icon when icon is null', () => {
      component.icon = null;
      fixture.detectChanges();

      const iconContainer = fixture.nativeElement.querySelector('.card-icon');
      expect(iconContainer).toBeFalsy();
    });
  });

  describe('Variant Class Tests', () => {
    it('should apply correct variant class', () => {
      component.variant = 'success';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      expect(card.classList.contains('success')).toBe(true);
    });

    it('should apply primary variant class', () => {
      component.variant = 'primary';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      expect(card.classList.contains('primary')).toBe(true);
    });

    it('should apply warning variant class', () => {
      component.variant = 'warning';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      expect(card.classList.contains('warning')).toBe(true);
    });

    it('should apply info variant class', () => {
      component.variant = 'info';
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      expect(card.classList.contains('info')).toBe(true);
    });
  });

  describe('Accessibility Tests', () => {
    it('should have semantic structure', () => {
      fixture.detectChanges();

      const card = fixture.nativeElement.querySelector('.dashboard-card');
      const content = card.querySelector('.card-content');
      expect(content).toBeTruthy();
    });

    it('should display value with appropriate formatting', () => {
      component.value = '1,234';
      fixture.detectChanges();

      const value = fixture.nativeElement.querySelector('.card-value');
      expect(value.textContent).toBe('1,234');
    });
  });
});
