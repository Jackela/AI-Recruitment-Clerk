import { TestBed } from '@angular/core/testing';
import type { ThemeColors } from './theme.service';
import { ThemeService } from './theme.service';
import { ToastService } from '../toast.service';

// Set up matchMedia mock - use simple assignment if defineProperty fails
const mockMatchMedia = jest.fn((query: string) => ({
  matches: query.includes('dark'),
  media: query,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
}));

try {
  // Try to delete and redefine
  delete (window as Record<string, unknown>).matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    value: mockMatchMedia,
    writable: true,
    configurable: true,
  });
} catch {
  // If that fails, just assign directly
  (window as Record<string, unknown>).matchMedia = mockMatchMedia;
}

describe('ThemeService', () => {
  let service: ThemeService;
  let toastServiceMock: jest.Mocked<ToastService>;

  beforeEach(() => {
    mockMatchMedia.mockClear();

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      clear: jest.fn(),
      removeItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    toastServiceMock = {
      info: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      clear: jest.fn(),
      getToasts: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<ToastService>;

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: ToastService, useValue: toastServiceMock },
      ],
    });

    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with a theme', () => {
      expect(service.currentTheme()).toBeDefined();
    });

    it('should have isDarkMode signal', () => {
      expect(typeof service.isDarkMode()).toBe('boolean');
    });
  });

  describe('setTheme()', () => {
    it('should set light theme', () => {
      service.setTheme('light');

      expect(service.currentTheme()).toBe('light');
      expect(service.isDarkMode()).toBe(false);
    });

    it('should set dark theme', () => {
      service.setTheme('dark');

      expect(service.currentTheme()).toBe('dark');
      expect(service.isDarkMode()).toBe(true);
    });

    it('should set auto theme', () => {
      service.setTheme('auto');

      expect(service.currentTheme()).toBe('auto');
    });

    it('should save theme to localStorage', () => {
      service.setTheme('dark');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'app-theme-preference',
        'dark'
      );
    });
  });

  describe('toggleTheme()', () => {
    it('should toggle from light to dark', () => {
      service.setTheme('light');
      service.toggleTheme();

      expect(service.currentTheme()).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      service.setTheme('dark');
      service.toggleTheme();

      expect(service.currentTheme()).toBe('light');
    });
  });

  describe('getThemeColors()', () => {
    it('should return light theme colors when not in dark mode', () => {
      service.setTheme('light');
      const colors = service.getThemeColors();

      expect(colors.background).toBe('#ffffff');
      expect(colors.text).toBe('#111827');
    });

    it('should return dark theme colors when in dark mode', () => {
      service.setTheme('dark');
      const colors = service.getThemeColors();

      expect(colors.background).toBe('#0f172a');
      expect(colors.text).toBe('#f1f5f9');
    });

    it('should return all required color properties', () => {
      const colors = service.getThemeColors() as ThemeColors;

      expect(colors).toHaveProperty('primary');
      expect(colors).toHaveProperty('secondary');
      expect(colors).toHaveProperty('background');
      expect(colors).toHaveProperty('surface');
      expect(colors).toHaveProperty('text');
      expect(colors).toHaveProperty('textSecondary');
      expect(colors).toHaveProperty('border');
      expect(colors).toHaveProperty('error');
      expect(colors).toHaveProperty('warning');
      expect(colors).toHaveProperty('success');
      expect(colors).toHaveProperty('info');
    });
  });

  describe('getThemeClass()', () => {
    it('should return theme-light for light mode', () => {
      service.setTheme('light');

      expect(service.getThemeClass()).toBe('theme-light');
    });

    it('should return theme-dark for dark mode', () => {
      service.setTheme('dark');

      expect(service.getThemeClass()).toBe('theme-dark');
    });
  });

  describe('applyThemeToElement()', () => {
    it('should apply dark theme class to element', () => {
      const element = document.createElement('div');
      service.setTheme('dark');
      service.applyThemeToElement(element);

      expect(element.classList.contains('theme-dark')).toBe(true);
    });

    it('should apply light theme class to element', () => {
      const element = document.createElement('div');
      service.setTheme('light');
      service.applyThemeToElement(element);

      expect(element.classList.contains('theme-light')).toBe(true);
    });

    it('should remove existing theme classes before applying new one', () => {
      const element = document.createElement('div');
      element.classList.add('theme-light');
      service.setTheme('dark');
      service.applyThemeToElement(element);

      expect(element.classList.contains('theme-light')).toBe(false);
      expect(element.classList.contains('theme-dark')).toBe(true);
    });
  });

  describe('prefersReducedMotion()', () => {
    it('should return a boolean', () => {
      const result = service.prefersReducedMotion();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('prefersHighContrast()', () => {
    it('should return a boolean', () => {
      const result = service.prefersHighContrast();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Theme Persistence', () => {
    it('should persist theme preference', () => {
      service.setTheme('dark');
      service.setTheme('light');

      expect(localStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Theme Types', () => {
    it('should accept all valid theme values', () => {
      const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];

      themes.forEach((theme) => {
        expect(() => service.setTheme(theme)).not.toThrow();
      });
    });
  });
});
