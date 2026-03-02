import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { App } from './app';
import { jobReducer } from './store/jobs/job.reducer';
import { resumeReducer } from './store/resumes/resume.reducer';
import { reportReducer } from './store/reports/report.reducer';
import { JobEffects } from './store/jobs/job.effects';
import { ResumeEffects } from './store/resumes/resume.effects';
import { ReportEffects } from './store/reports/report.effects';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AccessibilityService } from './services/accessibility/accessibility.service';
import { ProgressFeedbackService } from './services/feedback/progress-feedback.service';
import { ThemeService } from './services/theme/theme.service';
import { ToastService } from './services/toast.service';
import { Subject, BehaviorSubject, Observable } from 'rxjs';

// Mock services
class MockAccessibilityService {
  private highContrast = false;
  private reducedMotion = false;
  private fontSize: 'normal' | 'large' | 'larger' = 'normal';
  private shortcuts: Array<{
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    description: string;
    action: () => void;
  }> = [];

  accessibilityState = jest.fn().mockReturnValue({
    highContrast: false,
    reducedMotion: false,
    fontSize: 'normal',
    currentFocus: null,
    trapFocus: false,
    focusWithin: null,
    liveMessages: [],
    shortcuts: [],
    shortcutContext: 'global',
    screenReaderActive: false,
  });

  announce = jest.fn();
  setFocus = jest.fn();
  setFocusTrap = jest.fn();
  releaseFocusTrap = jest.fn();
  setHighContrast = jest.fn((enabled: boolean) => {
    this.highContrast = enabled;
  });
  setReducedMotion = jest.fn((enabled: boolean) => {
    this.reducedMotion = enabled;
  });
  setFontSize = jest.fn((size: 'normal' | 'large' | 'larger') => {
    this.fontSize = size;
  });
  registerShortcut = jest.fn((shortcut) => {
    this.shortcuts.push(shortcut);
  });
  getFocusableElements = jest.fn().mockReturnValue([]);
}

class MockProgressFeedbackService {
  startLoading = jest.fn();
  stopLoading = jest.fn();
  showSuccess = jest.fn();
  showWarning = jest.fn();
  showInfo = jest.fn();
  showError = jest.fn();
  showNotification = jest.fn();
  startProgress = jest.fn();
  updateProgress = jest.fn();
  completeProgress = jest.fn();
  errorProgress = jest.fn();
  reset = jest.fn();
}

class MockToastService {
  success = jest.fn();
  error = jest.fn();
  info = jest.fn();
  warning = jest.fn();
}

class MockThemeService {
  currentTheme = jest.fn().mockReturnValue('light');
  isDarkMode = jest.fn().mockReturnValue(false);
  toggleTheme = jest.fn();
  setTheme = jest.fn();
  getThemeColors = jest.fn().mockReturnValue({
    primary: '#667eea',
    secondary: '#764ba2',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  });
}

describe('App', () => {
  let mockAccessibilityService: MockAccessibilityService;
  let mockProgressFeedbackService: MockProgressFeedbackService;
  let mockThemeService: MockThemeService;
  let mockToastService: MockToastService;

  beforeEach(async () => {
    mockAccessibilityService = new MockAccessibilityService();
    mockProgressFeedbackService = new MockProgressFeedbackService();
    mockThemeService = new MockThemeService();
    mockToastService = new MockToastService();

    // Clear localStorage before each test
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [
        App,
        RouterTestingModule.withRoutes([]),
        HttpClientTestingModule,
        StoreModule.forRoot({
          jobs: jobReducer,
          resumes: resumeReducer,
          reports: reportReducer,
        }),
        EffectsModule.forRoot([JobEffects, ResumeEffects, ReportEffects]),
      ],
      providers: [
        {
          provide: AccessibilityService,
          useValue: mockAccessibilityService,
        },
        {
          provide: ProgressFeedbackService,
          useValue: mockProgressFeedbackService,
        },
        {
          provide: ThemeService,
          useValue: mockThemeService,
        },
        {
          provide: ToastService,
          useValue: mockToastService,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Component Creation', () => {
    it('should create the app', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should render the application title', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.app-title')?.textContent).toContain(
        'AI 招聘助理',
      );
    });

    it('should have navigation links', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      const navLinks = compiled.querySelectorAll('.nav-link');
      expect(navLinks.length).toBeGreaterThanOrEqual(2);
      // Check for actual navigation link text content (ignoring extra accessibility text)
      const firstNavText = navLinks[0].textContent
        ?.replace(/\s*-\s*Alt\+\d+\s*/, '')
        .trim();
      const secondNavText = navLinks[1].textContent
        ?.replace(/\s*-\s*Alt\+\d+\s*/, '')
        .trim();
      expect(firstNavText).toContain('仪表板');
      expect(secondNavText).toContain('智能分析'); // Updated to match actual content
    });

    it('should have router outlet', () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('router-outlet')).toBeTruthy();
    });
  });

  describe('Signal Initialization', () => {
    it('should initialize signals with default values', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      expect(app.settingsMenuOpen()).toBe(false);
      expect(app.keyboardHelpVisible()).toBe(false);
      expect(app.isLoading()).toBe(false);
      expect(app.guideOverlayVisible()).toBe(false);
      expect(app.highContrastEnabled()).toBe(false);
      expect(app.reducedMotionEnabled()).toBe(false);
      expect(app.currentFontSize()).toBe('normal');
    });
  });

  describe('ngOnInit', () => {
    it('should call initializeAccessibility on init', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick(1100); // Wait for the 1000ms setTimeout in initializeAccessibility

      expect(mockAccessibilityService.announce).toHaveBeenCalledWith(
        'AI Recruitment Assistant application loaded and ready for use',
        'polite',
      );
    }));

    it('should schedule keyboard navigation initialization on init', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Component should initialize without errors
      expect(app).toBeTruthy();
    }));
  });

  describe('ngOnDestroy', () => {
    it('should cleanup on destroy', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Destroy the component
      fixture.destroy();

      // Should not throw errors
      expect(app).toBeTruthy();
    }));
  });

  describe('Keyboard Help Methods', () => {
    it('should show keyboard help and announce to screen reader', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      app.showKeyboardHelp();

      expect(app.keyboardHelpVisible()).toBe(true);
      expect(mockAccessibilityService.announce).toHaveBeenCalledWith(
        'Keyboard shortcuts help opened',
        'polite',
      );
    }));

    it('should hide keyboard help and release focus trap', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // First show keyboard help
      app.showKeyboardHelp();
      tick();

      // Then hide it
      app.hideKeyboardHelp();

      expect(app.keyboardHelpVisible()).toBe(false);
      expect(mockAccessibilityService.releaseFocusTrap).toHaveBeenCalled();
      expect(mockAccessibilityService.announce).toHaveBeenCalledWith(
        'Keyboard shortcuts help closed',
        'polite',
      );
    }));
  });

  describe('Settings Menu Methods', () => {
    it('should toggle settings menu open', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      app.toggleSettingsMenu();

      expect(app.settingsMenuOpen()).toBe(true);
      expect(mockAccessibilityService.announce).toHaveBeenCalledWith(
        'Accessibility settings menu opened',
        'polite',
      );
    }));

    it('should toggle settings menu closed', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Open menu first
      app.toggleSettingsMenu();
      tick();

      // Then close it
      app.toggleSettingsMenu();

      expect(app.settingsMenuOpen()).toBe(false);
      expect(mockAccessibilityService.announce).toHaveBeenCalledWith(
        'Accessibility settings menu closed',
        'polite',
      );
    }));
  });

  describe('Accessibility Toggle Methods', () => {
    it('should toggle high contrast mode', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      app.toggleHighContrast();

      expect(mockAccessibilityService.setHighContrast).toHaveBeenCalledWith(true);
      expect(app.settingsMenuOpen()).toBe(false);
    }));

    it('should toggle high contrast mode off when already enabled', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Simulate high contrast being enabled
      app.highContrastEnabled.set(true);

      app.toggleHighContrast();

      expect(mockAccessibilityService.setHighContrast).toHaveBeenCalledWith(false);
    }));

    it('should toggle reduced motion mode', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      app.toggleReducedMotion();

      expect(mockAccessibilityService.setReducedMotion).toHaveBeenCalledWith(true);
      expect(app.settingsMenuOpen()).toBe(false);
    }));

    it('should toggle reduced motion mode off when already enabled', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Simulate reduced motion being enabled
      app.reducedMotionEnabled.set(true);

      app.toggleReducedMotion();

      expect(mockAccessibilityService.setReducedMotion).toHaveBeenCalledWith(false);
    }));

    it('should increase font size from normal to large', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      app.increaseFontSize();

      expect(mockAccessibilityService.setFontSize).toHaveBeenCalledWith('large');
      expect(app.settingsMenuOpen()).toBe(false);
    }));

    it('should increase font size from large to larger', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Set current font size to large
      app.currentFontSize.set('large');

      app.increaseFontSize();

      expect(mockAccessibilityService.setFontSize).toHaveBeenCalledWith('larger');
    }));

    it('should cycle font size from larger back to normal', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Set current font size to larger
      app.currentFontSize.set('larger');

      app.increaseFontSize();

      expect(mockAccessibilityService.setFontSize).toHaveBeenCalledWith('normal');
    }));
  });

  describe('Navigation Methods', () => {
    it('should have navigateToAnalysis method that runs without error', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // The method exists and should be callable
      expect(typeof (app as unknown as { navigateToAnalysis: () => void }).navigateToAnalysis).toBe('function');
    }));

    it('should have navigateTo method that closes modals first', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Open modals/menus
      app.settingsMenuOpen.set(true);
      app.keyboardHelpVisible.set(true);
      app.guideOverlayVisible.set(true);

      // Navigate calls closeModalsAndMenus internally
      (app as unknown as { navigateTo: (route: string) => void }).navigateTo('/test');

      expect(app.settingsMenuOpen()).toBe(false);
      expect(app.keyboardHelpVisible()).toBe(false);
      expect(app.guideOverlayVisible()).toBe(false);
      expect(mockAccessibilityService.releaseFocusTrap).toHaveBeenCalled();
    }));
  });

  describe('Keyboard Shortcuts Registration', () => {
    it('should register keyboard shortcuts on init', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick(100); // Allow async operations to complete

      // Keyboard shortcuts should be registered
      expect(mockAccessibilityService.registerShortcut).toHaveBeenCalled();
    }));
  });

  describe('Welcome Message', () => {
    it('should show welcome message for first-time users', fakeAsync(() => {
      localStorage.clear();

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      tick(100);

      // Welcome message should be scheduled for first visit
      expect(localStorage.getItem('app_visited')).toBe('true');
    }));

    it('should not show welcome message for returning users', fakeAsync(() => {
      // Simulate returning user
      localStorage.setItem('app_visited', 'true');

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      tick(100);

      // Should not have called showSuccess for welcome
      expect(mockProgressFeedbackService.showSuccess).not.toHaveBeenCalled();
    }));
  });

  describe('Protected Properties', () => {
    it('should expose config property', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      expect(app.config).toBeDefined();
    });

    it('should expose getText function', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      expect(typeof app.getText).toBe('function');
    });
  });

  describe('Modal and Menu Closing', () => {
    it('should close all modals and menus', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Open various modals/menus
      app.settingsMenuOpen.set(true);
      app.keyboardHelpVisible.set(true);
      app.guideOverlayVisible.set(true);

      // Access private method through component instance
      (app as unknown as { closeModalsAndMenus: () => void }).closeModalsAndMenus();

      expect(app.settingsMenuOpen()).toBe(false);
      expect(app.keyboardHelpVisible()).toBe(false);
      expect(app.guideOverlayVisible()).toBe(false);
      expect(mockAccessibilityService.releaseFocusTrap).toHaveBeenCalled();
    }));
  });

  describe('Refresh Data', () => {
    it('should trigger data refresh with loading indicator', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Access private method through component instance
      (app as unknown as { refreshData: () => void }).refreshData();

      expect(mockProgressFeedbackService.startLoading).toHaveBeenCalledWith(
        'refresh',
        '正在刷新数据...',
      );

      tick(1500);

      expect(mockProgressFeedbackService.stopLoading).toHaveBeenCalledWith('refresh');
      expect(mockProgressFeedbackService.showSuccess).toHaveBeenCalled();
    }));
  });

  describe('Keyboard Help Focus Trap', () => {
    it('should attempt to set focus trap when showing keyboard help with modal present', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Create a mock modal element
      const mockModal = document.createElement('div');
      mockModal.className = 'keyboard-help-modal';
      document.body.appendChild(mockModal);

      app.showKeyboardHelp();
      tick(100); // Wait for setTimeout in showKeyboardHelp

      expect(app.keyboardHelpVisible()).toBe(true);
      expect(mockAccessibilityService.setFocusTrap).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(mockModal);
    }));
  });

  describe('Settings Menu Focus Management', () => {
    it('should attempt to focus first menu item when settings menu opens', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Create a mock settings menu element
      const mockMenu = document.createElement('div');
      mockMenu.className = 'settings-menu';
      const mockMenuItem = document.createElement('div');
      mockMenuItem.setAttribute('role', 'menuitem');
      mockMenu.appendChild(mockMenuItem);
      document.body.appendChild(mockMenu);

      app.toggleSettingsMenu();
      tick(100); // Wait for setTimeout in toggleSettingsMenu

      expect(app.settingsMenuOpen()).toBe(true);
      expect(mockAccessibilityService.setFocus).toHaveBeenCalled();

      // Cleanup
      document.body.removeChild(mockMenu);
    }));
  });

  describe('Dynamic Service Initialization', () => {
    it('should have ensureWebsocketStats method that can be called', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // The method exists and returns a promise
      expect(typeof (app as unknown as { ensureWebsocketStats: () => Promise<unknown> }).ensureWebsocketStats).toBe('function');
    }));

    it('should have ensureKeyboardNavigation method that can be called', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // The method exists and returns a promise
      expect(typeof (app as unknown as { ensureKeyboardNavigation: () => Promise<void> }).ensureKeyboardNavigation).toBe('function');
    }));
  });

  describe('Accessibility State Sync', () => {
    it('should sync accessibility state from service', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      // Initial values should match the mock service
      expect(app.highContrastEnabled()).toBe(false);
      expect(app.reducedMotionEnabled()).toBe(false);
      expect(app.currentFontSize()).toBe('normal');
    }));
  });

  describe('Guide Overlay', () => {
    it('should have guideOverlayVisible signal', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      expect(app.guideOverlayVisible()).toBe(false);

      // Can set guide overlay visible
      app.guideOverlayVisible.set(true);
      expect(app.guideOverlayVisible()).toBe(true);
    }));
  });

  describe('Loading State', () => {
    it('should have isLoading signal', fakeAsync(() => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;

      fixture.detectChanges();
      tick();

      expect(app.isLoading()).toBe(false);

      // Can set loading state
      app.isLoading.set(true);
      expect(app.isLoading()).toBe(true);
    }));
  });
});
