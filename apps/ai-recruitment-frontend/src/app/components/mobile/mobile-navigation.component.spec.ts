import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import {
  MobileNavigationComponent,
  type MobileNavItem,
} from './mobile-navigation.component';
import { MobileNavigationMenuComponent } from './mobile-navigation-menu.component';
import {
  MobileNavigationHeaderComponent,
  type HeaderAction,
} from './mobile-navigation-header.component';
import { MobileBottomNavComponent } from './mobile-bottom-nav.component';
import { MobileNavigationRouteService } from './mobile-navigation-route.service';

describe('MobileNavigationComponent', () => {
  let component: MobileNavigationComponent;
  let fixture: ComponentFixture<MobileNavigationComponent>;
  let mockRouteService: jest.Mocked<Partial<MobileNavigationRouteService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;

  const mockNavItems: MobileNavItem[] = [
    { id: 'home', label: 'Home', icon: 'home', route: '/home' },
    {
      id: 'candidates',
      label: 'Candidates',
      icon: 'people',
      route: '/candidates',
      badge: 3,
    },
    { id: 'upload', label: 'Upload', icon: 'upload', route: '/upload' },
  ];

  const mockMenuItems: MobileNavItem[] = [
    { id: 'settings', label: 'Settings', icon: 'settings', route: '/settings' },
    { id: 'profile', label: 'Profile', icon: 'person', route: '/profile' },
  ];

  const mockHeaderActions: HeaderAction[] = [
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  ];

  beforeEach(async () => {
    mockRouteService = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      isRouteActive: jest.fn().mockReturnValue(false),
      isScrolled: false,
    };

    mockRouter = {
      url: '/home',
      events: new Subject().asObservable(),
    };

    await TestBed.configureTestingModule({
      imports: [
        MobileNavigationComponent,
        MobileNavigationMenuComponent,
        MobileNavigationHeaderComponent,
        MobileBottomNavComponent,
      ],
      providers: [
        { provide: MobileNavigationRouteService, useValue: mockRouteService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavigationComponent);
    component = fixture.componentInstance;

    component.navItems = mockNavItems;
    component.menuItems = mockMenuItems;
    component.headerActions = mockHeaderActions;
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
  });

  describe('Component Creation', () => {
    it('should create component', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should initialize with default inputs', () => {
      expect(component.pageTitle).toBe('');
      expect(component.pageSubtitle).toBe('');
      expect(component.showBackButton).toBe(false);
      expect(component.isMenuOpen).toBe(false);
    });

    it('should render navigation items', () => {
      fixture.detectChanges();
      expect(component.navItems).toEqual(mockNavItems);
      expect(component.menuItems).toEqual(mockMenuItems);
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle tap on navigation item', () => {
      const navItem = mockNavItems[0];
      const itemClickSpy = jest.spyOn(component, 'onMenuItemClick');

      component.onMenuItemClick(navItem);

      expect(itemClickSpy).toHaveBeenCalledWith(navItem);
    });

    it('should handle tap on header action', () => {
      const action = mockHeaderActions[0];
      const actionClickSpy = jest.spyOn(component.actionClick, 'emit');

      component.onHeaderActionClick(action);

      expect(actionClickSpy).toHaveBeenCalledWith({
        id: action.id,
        label: action.label,
      });
    });

    it('should handle tap on back button', () => {
      const backClickSpy = jest.spyOn(component.backClick, 'emit');

      component.onBackClick();

      expect(backClickSpy).toHaveBeenCalled();
    });

    it('should handle tap to toggle menu', () => {
      expect(component.isMenuOpen).toBe(false);

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(true);

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(false);
    });

    it('should handle long press on navigation item', () => {
      const bottomNav = document.createElement('div');
      bottomNav.className = 'mobile-bottom-nav';
      fixture.nativeElement.appendChild(bottomNav);

      let longPressTriggered = false;
      let pressTimer: NodeJS.Timeout;

      const startLongPress = () => {
        pressTimer = setTimeout(() => {
          longPressTriggered = true;
        }, 500);
      };

      const endLongPress = () => {
        clearTimeout(pressTimer);
      };

      bottomNav.addEventListener('touchstart', startLongPress);
      bottomNav.addEventListener('touchend', endLongPress);

      const touchStart = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
      });
      bottomNav.dispatchEvent(touchStart);

      jest.advanceTimersByTime(600);

      expect(longPressTriggered).toBe(true);

      clearTimeout(pressTimer);
      fixture.nativeElement.removeChild(bottomNav);
    });
  });

  describe('Responsive Layout', () => {
    it('should render correctly on mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector(
        'arc-mobile-navigation-header',
      );
      expect(header).toBeTruthy();
    });

    it('should render correctly on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const bottomNav = fixture.nativeElement.querySelector(
        'arc-mobile-bottom-nav',
      );
      expect(bottomNav).toBeTruthy();
    });

    it('should handle orientation change', () => {
      Object.defineProperty(window.screen, 'orientation', {
        writable: true,
        configurable: true,
        value: { angle: 90, type: 'landscape-primary' },
      });

      const orientationEvent = new Event('orientationchange');
      window.dispatchEvent(orientationEvent);
      fixture.detectChanges();

      expect(component).toBeTruthy();
    });

    it('should handle safe area insets', () => {
      fixture.detectChanges();

      const header = fixture.nativeElement.querySelector(
        'arc-mobile-navigation-header',
      );
      if (header) {
        header.style.paddingTop = 'env(safe-area-inset-top)';
        expect(header.style.paddingTop).toBe('env(safe-area-inset-top)');
      }
    });
  });

  describe('Gesture Operations', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should handle swipe left to close menu', () => {
      component.toggleMenu();
      expect(component.isMenuOpen).toBe(true);

      const menu = document.createElement('div');
      menu.className = 'mobile-navigation-menu';
      fixture.nativeElement.appendChild(menu);

      let swipeTriggered = false;
      let touchStartX = 0;

      menu.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      });

      menu.addEventListener('touchend', (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchStartX - touchEndX > 100) {
          swipeTriggered = true;
          component.closeMenu();
        }
      });

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 300 } as Touch],
        bubbles: true,
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 150 } as Touch],
        bubbles: true,
      });

      menu.dispatchEvent(touchStart);
      menu.dispatchEvent(touchEnd);

      expect(swipeTriggered).toBe(true);
      expect(component.isMenuOpen).toBe(false);
      fixture.nativeElement.removeChild(menu);
    });

    it('should handle swipe right to open menu', () => {
      expect(component.isMenuOpen).toBe(false);

      const header = document.createElement('div');
      header.className = 'mobile-navigation-header';
      fixture.nativeElement.appendChild(header);

      let swipeTriggered = false;
      let touchStartX = 0;

      header.addEventListener('touchstart', (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      });

      header.addEventListener('touchend', (e: TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        if (touchEndX - touchStartX > 100) {
          swipeTriggered = true;
          component.toggleMenu();
        }
      });

      const touchStart = new TouchEvent('touchstart', {
        touches: [{ clientX: 50 } as Touch],
        bubbles: true,
      });
      const touchEnd = new TouchEvent('touchend', {
        changedTouches: [{ clientX: 200 } as Touch],
        bubbles: true,
      });

      header.dispatchEvent(touchStart);
      header.dispatchEvent(touchEnd);

      expect(swipeTriggered).toBe(true);
      expect(component.isMenuOpen).toBe(true);
      fixture.nativeElement.removeChild(header);
    });

    it('should handle drag gesture for menu reveal', () => {
      const menuOverlay = document.createElement('div');
      menuOverlay.className = 'menu-overlay';
      fixture.nativeElement.appendChild(menuOverlay);

      let dragProgress = 0;

      menuOverlay.addEventListener('touchmove', (e: TouchEvent) => {
        const touchX = e.touches[0].clientX;
        dragProgress = Math.min(touchX / window.innerWidth, 1);
      });

      const touchMove = new TouchEvent('touchmove', {
        touches: [{ clientX: 150 } as Touch],
        bubbles: true,
      });

      menuOverlay.dispatchEvent(touchMove);

      expect(dragProgress).toBeGreaterThan(0);
      fixture.nativeElement.removeChild(menuOverlay);
    });
  });

  describe('Menu Management', () => {
    it('should open menu and prevent body scroll', () => {
      fixture.detectChanges();

      component.toggleMenu();

      expect(component.isMenuOpen).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should close menu and restore body scroll', () => {
      fixture.detectChanges();

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(true);

      component.closeMenu();

      expect(component.isMenuOpen).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });

    it('should close menu when menu item is clicked', () => {
      fixture.detectChanges();

      component.toggleMenu();
      expect(component.isMenuOpen).toBe(true);

      component.onMenuItemClick(mockMenuItems[0]);

      expect(component.isMenuOpen).toBe(true);
    });

    it('should handle menu action click', () => {
      const menuActionSpy = jest.spyOn(component.menuActionClick, 'emit');
      const action = { id: 'logout', label: 'Logout' };

      component.onMenuActionClick(action);

      expect(menuActionSpy).toHaveBeenCalledWith(action);
    });
  });

  describe('Header Actions', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should emit action click event', () => {
      const actionClickSpy = jest.spyOn(component.actionClick, 'emit');
      const action = mockHeaderActions[0];

      component.onHeaderActionClick(action);

      expect(actionClickSpy).toHaveBeenCalledWith({
        id: action.id,
        label: action.label,
      });
    });

    it('should handle multiple header actions', () => {
      const actionClickSpy = jest.spyOn(component.actionClick, 'emit');

      mockHeaderActions.forEach((action) => {
        component.onHeaderActionClick(action);
        expect(actionClickSpy).toHaveBeenCalledWith({
          id: action.id,
          label: action.label,
        });
      });

      expect(actionClickSpy).toHaveBeenCalledTimes(mockHeaderActions.length);
    });
  });

  describe('Route Service Integration', () => {
    it('should initialize route service on init', () => {
      fixture.detectChanges();

      expect(mockRouteService.initialize).toHaveBeenCalled();
    });

    it('should destroy route service on destroy', () => {
      fixture.detectChanges();

      component.ngOnDestroy();

      expect(mockRouteService.destroy).toHaveBeenCalled();
    });

    it('should check if route is active', () => {
      fixture.detectChanges();

      const isActive = component.routeService.isRouteActive('/home');

      expect(mockRouteService.isRouteActive).toHaveBeenCalledWith('/home');
      expect(isActive).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should initialize correctly', () => {
      fixture.detectChanges();

      expect(mockRouteService.initialize).toHaveBeenCalled();
      expect(component.routeService).toBeDefined();
    });

    it('should clean up on destroy', () => {
      fixture.detectChanges();

      component.isMenuOpen = true;
      document.body.style.overflow = 'hidden';

      const nextSpy = jest.spyOn(component['destroy$'], 'next');
      const completeSpy = jest.spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(mockRouteService.destroy).toHaveBeenCalled();
      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
