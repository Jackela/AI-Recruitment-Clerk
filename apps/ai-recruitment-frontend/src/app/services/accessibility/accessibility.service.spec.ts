import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { NavigationEnd } from '@angular/router';
import { AccessibilityService, type KeyboardShortcut } from './accessibility.service';
import { Subject } from 'rxjs';

describe('AccessibilityService', () => {
  let service: AccessibilityService;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(() => {
    routerEvents$ = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            events: routerEvents$.asObservable(),
          },
        },
      ],
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn().mockReturnValue(null),
      setItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    // Mock document.body.classList
    document.body.classList.remove('high-contrast', 'reduced-motion', 'font-large', 'font-larger');
  });

  beforeEach(() => {
    service = TestBed.inject(AccessibilityService);
  });

  afterEach(() => {
    // Clean up event listeners
    document.body.classList.remove('high-contrast', 'reduced-motion', 'font-large', 'font-larger');
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have initial accessibility state', () => {
      const state = service.accessibilityState();
      expect(state.currentFocus).toBeNull();
      expect(state.trapFocus).toBe(false);
      expect(state.focusWithin).toBeNull();
      expect(state.liveMessages).toEqual([]);
      expect(state.shortcuts).toEqual([]);
      expect(state.shortcutContext).toBe('global');
    });
  });

  describe('announce()', () => {
    it('should add message to live messages', () => {
      const id = service.announce('Test message', 'polite');

      expect(id).toMatch(/^msg-\d+$/);
      const messages = service.accessibilityState().liveMessages;
      expect(messages).toHaveLength(1);
      expect(messages[0].message).toBe('Test message');
      expect(messages[0].priority).toBe('polite');
    });

    it('should use assertive priority when specified', () => {
      service.announce('Alert message', 'assertive');

      const messages = service.accessibilityState().liveMessages;
      expect(messages[0].priority).toBe('assertive');
    });

    it('should auto-remove message after duration', fakeAsync(() => {
      service.announce('Test message', 'polite', 1000);

      expect(service.accessibilityState().liveMessages).toHaveLength(1);

      tick(1001);

      expect(service.accessibilityState().liveMessages).toHaveLength(0);
    }));
  });

  describe('setFocus()', () => {
    it('should set focus to element', () => {
      const element = document.createElement('button');
      element.focus = jest.fn();
      document.body.appendChild(element);

      service.setFocus(element, 'navigation');

      expect(element.focus).toHaveBeenCalled();
      document.body.removeChild(element);
    });

    it('should not set focus if element is already focused', () => {
      const element = document.createElement('button');
      element.focus = jest.fn();
      document.body.appendChild(element);

      service.setFocus(element, 'navigation');
      element.focus.mockClear();
      service.setFocus(element, 'navigation');

      expect(element.focus).not.toHaveBeenCalled();
      document.body.removeChild(element);
    });
  });

  describe('restoreFocus()', () => {
    it('should restore focus to previous element', () => {
      const element1 = document.createElement('button');
      const element2 = document.createElement('input');
      element1.focus = jest.fn();
      element2.focus = jest.fn();
      document.body.appendChild(element1);
      document.body.appendChild(element2);

      service.setFocus(element1, 'navigation');
      service.setFocus(element2, 'navigation');
      service.restoreFocus();

      expect(element1.focus).toHaveBeenCalled();
      document.body.removeChild(element1);
      document.body.removeChild(element2);
    });
  });

  describe('Focus Trap', () => {
    it('should set focus trap', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      container.appendChild(button);
      document.body.appendChild(container);

      service.setFocusTrap(container);

      expect(service.accessibilityState().trapFocus).toBe(true);
      expect(service.accessibilityState().focusWithin).toBe(container);

      document.body.removeChild(container);
    });

    it('should release focus trap', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      service.setFocusTrap(container);
      service.releaseFocusTrap();

      expect(service.accessibilityState().trapFocus).toBe(false);
      expect(service.accessibilityState().focusWithin).toBeNull();

      document.body.removeChild(container);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should register keyboard shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        description: 'Save',
        action: jest.fn(),
      };

      service.registerShortcut(shortcut);

      expect(service.accessibilityState().shortcuts).toContainEqual(shortcut);
    });

    it('should unregister keyboard shortcut', () => {
      const shortcut: KeyboardShortcut = {
        key: 's',
        ctrlKey: true,
        description: 'Save',
        action: jest.fn(),
      };

      service.registerShortcut(shortcut);
      service.unregisterShortcut('s');

      expect(service.accessibilityState().shortcuts).not.toContainEqual(shortcut);
    });

    it('should set shortcut context', () => {
      service.setShortcutContext('editor');

      expect(service.accessibilityState().shortcutContext).toBe('editor');
    });
  });

  describe('generateAriaLabel()', () => {
    it('should generate aria label with all parts', () => {
      const label = service.generateAriaLabel({
        type: 'button',
        title: 'Submit',
        description: 'Submit the form',
        value: 'ready',
        state: 'enabled',
        count: 5,
      });

      expect(label).toContain('Submit');
      expect(label).toContain('value ready');
      expect(label).toContain('Submit the form');
      expect(label).toContain('state enabled');
      expect(label).toContain('5 items');
      expect(label).toContain('button element');
    });

    it('should handle empty parts', () => {
      const label = service.generateAriaLabel({});

      expect(label).toBe('');
    });
  });

  describe('generateAriaDescription()', () => {
    it('should generate aria description', () => {
      const description = service.generateAriaDescription({
        instructions: 'Press enter to submit',
        shortcuts: ['Ctrl+S', 'Ctrl+Enter'],
        context: 'Form editing',
        validation: 'All fields required',
      });

      expect(description).toContain('Press enter to submit');
      expect(description).toContain('Keyboard shortcuts: Ctrl+S, Ctrl+Enter');
      expect(description).toContain('Form editing');
      expect(description).toContain('All fields required');
    });
  });

  describe('checkColorContrast()', () => {
    it('should return AAA for high contrast ratio', () => {
      const result = service.checkColorContrast('#000000', '#ffffff');

      expect(result.ratio).toBeGreaterThan(7);
      expect(result.level).toBe('AAA');
      expect(result.valid).toBe(true);
    });

    it('should return fail for low contrast ratio', () => {
      const result = service.checkColorContrast('#777777', '#888888');

      expect(result.ratio).toBeLessThan(4.5);
      expect(result.level).toBe('fail');
      expect(result.valid).toBe(false);
    });

    it('should return AA for medium contrast ratio', () => {
      const result = service.checkColorContrast('#666666', '#ffffff');

      expect(result.valid).toBe(true);
    });
  });

  describe('getAccessibleColor()', () => {
    it('should return original color if contrast is valid', () => {
      const color = service.getAccessibleColor('#000000', '#ffffff');

      expect(color).toBe('#000000');
    });

    it('should adjust color if contrast is invalid', () => {
      const color = service.getAccessibleColor('#777777', '#888888');

      // Should return a darker adjusted color
      expect(color).toBeDefined();
    });
  });

  describe('Accessibility Preferences', () => {
    it('should set high contrast mode', () => {
      service.setHighContrast(true);

      expect(service.accessibilityState().highContrast).toBe(true);
      expect(document.body.classList.contains('high-contrast')).toBe(true);
    });

    it('should disable high contrast mode', () => {
      service.setHighContrast(true);
      service.setHighContrast(false);

      expect(service.accessibilityState().highContrast).toBe(false);
      expect(document.body.classList.contains('high-contrast')).toBe(false);
    });

    it('should set reduced motion preference', () => {
      service.setReducedMotion(true);

      expect(service.accessibilityState().reducedMotion).toBe(true);
      expect(document.body.classList.contains('reduced-motion')).toBe(true);
    });

    it('should set font size preference', () => {
      service.setFontSize('large');

      expect(service.accessibilityState().fontSize).toBe('large');
      expect(document.body.classList.contains('font-large')).toBe(true);
    });

    it('should set larger font size preference', () => {
      service.setFontSize('larger');

      expect(service.accessibilityState().fontSize).toBe('larger');
      expect(document.body.classList.contains('font-larger')).toBe(true);
    });

    it('should remove font size classes when set to normal', () => {
      service.setFontSize('large');
      service.setFontSize('normal');

      expect(document.body.classList.contains('font-large')).toBe(false);
      expect(document.body.classList.contains('font-larger')).toBe(false);
    });
  });

  describe('getFocusableElements()', () => {
    it('should return focusable elements', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      const input = document.createElement('input');
      const span = document.createElement('span');

      container.appendChild(button);
      container.appendChild(input);
      container.appendChild(span);
      document.body.appendChild(container);

      const focusable = service.getFocusableElements(container);

      expect(focusable).toContain(button);
      expect(focusable).toContain(input);
      expect(focusable).not.toContain(span);

      document.body.removeChild(container);
    });

    it('should exclude disabled elements', () => {
      const container = document.createElement('div');
      const button = document.createElement('button');
      const disabledButton = document.createElement('button');
      disabledButton.disabled = true;

      container.appendChild(button);
      container.appendChild(disabledButton);
      document.body.appendChild(container);

      const focusable = service.getFocusableElements(container);

      expect(focusable).toContain(button);
      expect(focusable).not.toContain(disabledButton);

      document.body.removeChild(container);
    });
  });
});
