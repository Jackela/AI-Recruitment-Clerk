import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { MobileBottomNavComponent } from './mobile-bottom-nav.component';
import type { MobileNavItem } from './mobile-navigation.component';

describe('MobileBottomNavComponent', () => {
  let component: MobileBottomNavComponent;
  let fixture: ComponentFixture<MobileBottomNavComponent>;

  const mockNavItems: MobileNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3',
      route: '/dashboard',
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
      route: '/upload',
      badge: 3,
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
      route: '/jobs',
      disabled: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileBottomNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileBottomNavComponent);
    component = fixture.componentInstance;
    component.navItems = mockNavItems;
    component.isActive = (route: string) => route === '/dashboard';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input Properties', () => {
    it('should accept navItems input', () => {
      expect(component.navItems).toBe(mockNavItems);
    });

    it('should accept isActive function input', () => {
      expect(component.isActive('/dashboard')).toBe(true);
      expect(component.isActive('/upload')).toBe(false);
    });

    it('should handle empty navItems array', () => {
      component.navItems = [];
      fixture.detectChanges();
      expect(component.navItems.length).toBe(0);
    });
  });

  describe('Template Rendering', () => {
    it('should render navigation container', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.mobile-bottom-nav')).toBeTruthy();
    });

    it('should render navigation items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.nav-item');
      expect(items.length).toBe(3);
    });

    it('should render nav labels', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const labels = compiled.querySelectorAll('.nav-label');
      expect(labels.length).toBe(3);
      expect(labels[0].textContent).toContain('Dashboard');
    });

    it('should apply active class to current route', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.nav-item');
      expect(items[0].classList.contains('active')).toBe(true);
      expect(items[1].classList.contains('active')).toBe(false);
    });

    it('should apply disabled class to disabled items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.nav-item');
      expect(items[2].classList.contains('disabled')).toBe(true);
    });

    it('should render badges when present', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const badges = compiled.querySelectorAll('.nav-badge');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent).toContain('3');
    });

    it('should have correct aria-label on nav', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const nav = compiled.querySelector('nav');
      expect(nav?.getAttribute('aria-label')).toBe('Main navigation');
    });

    it('should set aria-current on active item', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.nav-item');
      expect(items[0].getAttribute('aria-current')).toBe('page');
    });

    it('should not set aria-current on inactive items', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const items = compiled.querySelectorAll('.nav-item');
      expect(items[1].getAttribute('aria-current')).toBeNull();
    });
  });
});
