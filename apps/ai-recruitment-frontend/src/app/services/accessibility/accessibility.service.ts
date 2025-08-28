import { Injectable, ElementRef, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface AriaLiveMessage {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

export interface FocusTarget {
  element: HTMLElement;
  reason: 'navigation' | 'modal' | 'error' | 'notification' | 'restoration';
  priority: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
  context?: string;
  disabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  private router = inject(Router);
  
  // Focus management
  private focusHistory: HTMLElement[] = [];
  private currentFocus = signal<HTMLElement | null>(null);
  private trapFocus = signal<boolean>(false);
  private focusWithin = signal<HTMLElement | null>(null);
  
  // ARIA live regions
  private liveMessages = signal<AriaLiveMessage[]>([]);
  private messageIdCounter = 0;
  
  // Keyboard shortcuts
  private shortcuts = signal<KeyboardShortcut[]>([]);
  private shortcutContext = signal<string>('global');
  
  // Color contrast and accessibility preferences
  private highContrast = signal<boolean>(false);
  private reducedMotion = signal<boolean>(false);
  private fontSize = signal<'normal' | 'large' | 'larger'>('normal');
  
  // Screen reader detection
  private screenReaderActive = signal<boolean>(false);
  
  // Computed accessibility state
  readonly accessibilityState = computed(() => ({
    currentFocus: this.currentFocus(),
    trapFocus: this.trapFocus(),
    focusWithin: this.focusWithin(),
    liveMessages: this.liveMessages(),
    shortcuts: this.shortcuts(),
    shortcutContext: this.shortcutContext(),
    highContrast: this.highContrast(),
    reducedMotion: this.reducedMotion(),
    fontSize: this.fontSize(),
    screenReaderActive: this.screenReaderActive()
  }));

  constructor() {
    this.initializeAccessibilitySettings();
    this.setupRouterAccessibility();
    this.detectScreenReader();
    this.setupGlobalKeyboardHandling();
    this.loadUserPreferences();
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite', duration = 5000): string {
    const id = `msg-${++this.messageIdCounter}`;
    const ariaMessage: AriaLiveMessage = {
      id,
      message,
      priority,
      timestamp: Date.now()
    };

    this.liveMessages.update(messages => [...messages, ariaMessage]);

    // Auto-remove message after duration
    setTimeout(() => {
      this.liveMessages.update(messages => 
        messages.filter(msg => msg.id !== id)
      );
    }, duration);

    return id;
  }

  /**
   * Set focus to element with tracking
   */
  setFocus(element: HTMLElement | ElementRef, reason: FocusTarget['reason'] = 'navigation'): void {
    const targetElement = element instanceof ElementRef ? element.nativeElement : element;
    
    if (!targetElement || targetElement === this.currentFocus()) {
      return;
    }

    // Store previous focus for restoration
    if (this.currentFocus() && reason !== 'restoration') {
      this.focusHistory.push(this.currentFocus()!);
    }

    // Set focus
    targetElement.focus();
    this.currentFocus.set(targetElement);

    // Announce focus change for screen readers
    const focusAnnouncement = this.getFocusAnnouncement(targetElement, reason);
    if (focusAnnouncement) {
      this.announce(focusAnnouncement, 'polite');
    }
  }

  /**
   * Restore focus to previous element
   */
  restoreFocus(): void {
    const previousElement = this.focusHistory.pop();
    if (previousElement && document.contains(previousElement)) {
      this.setFocus(previousElement, 'restoration');
    }
  }

  /**
   * Set focus trap within container
   */
  setFocusTrap(container: HTMLElement | ElementRef): void {
    const containerElement = container instanceof ElementRef ? container.nativeElement : container;
    
    this.trapFocus.set(true);
    this.focusWithin.set(containerElement);
    
    // Focus first focusable element
    const firstFocusable = this.getFocusableElements(containerElement)[0];
    if (firstFocusable) {
      this.setFocus(firstFocusable, 'modal');
    }
  }

  /**
   * Release focus trap
   */
  releaseFocusTrap(): void {
    this.trapFocus.set(false);
    this.focusWithin.set(null);
    this.restoreFocus();
  }

  /**
   * Register keyboard shortcut
   */
  registerShortcut(shortcut: KeyboardShortcut): void {
    this.shortcuts.update(shortcuts => [...shortcuts, shortcut]);
  }

  /**
   * Unregister keyboard shortcut
   */
  unregisterShortcut(key: string, context?: string): void {
    this.shortcuts.update(shortcuts => 
      shortcuts.filter(s => !(s.key === key && (!context || s.context === context)))
    );
  }

  /**
   * Set keyboard shortcut context
   */
  setShortcutContext(context: string): void {
    this.shortcutContext.set(context);
  }

  /**
   * Generate ARIA label for complex elements
   */
  generateAriaLabel(element: {
    type?: string;
    title?: string;
    description?: string;
    value?: string | number;
    state?: string;
    count?: number;
  }): string {
    const parts: string[] = [];
    
    if (element.title) parts.push(element.title);
    if (element.value !== undefined) parts.push(`value ${element.value}`);
    if (element.description) parts.push(element.description);
    if (element.state) parts.push(`state ${element.state}`);
    if (element.count !== undefined) parts.push(`${element.count} items`);
    if (element.type) parts.push(`${element.type} element`);
    
    return parts.join(', ');
  }

  /**
   * Generate ARIA description
   */
  generateAriaDescription(element: {
    instructions?: string;
    shortcuts?: string[];
    context?: string;
    validation?: string;
  }): string {
    const parts: string[] = [];
    
    if (element.instructions) parts.push(element.instructions);
    if (element.shortcuts?.length) {
      parts.push(`Keyboard shortcuts: ${element.shortcuts.join(', ')}`);
    }
    if (element.context) parts.push(element.context);
    if (element.validation) parts.push(element.validation);
    
    return parts.join('. ');
  }

  /**
   * Validate WCAG color contrast
   */
  checkColorContrast(foreground: string, background: string): {
    ratio: number;
    level: 'AA' | 'AAA' | 'fail';
    valid: boolean;
  } {
    const ratio = this.calculateContrastRatio(foreground, background);
    
    return {
      ratio,
      level: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'fail',
      valid: ratio >= 4.5
    };
  }

  /**
   * Get accessible color variant
   */
  getAccessibleColor(baseColor: string, background = '#ffffff'): string {
    const contrast = this.checkColorContrast(baseColor, background);
    
    if (contrast.valid) {
      return baseColor;
    }
    
    // Darken color until contrast is sufficient
    return this.adjustColorForContrast(baseColor, background);
  }

  /**
   * Set high contrast mode
   */
  setHighContrast(enabled: boolean): void {
    this.highContrast.set(enabled);
    this.saveUserPreferences();
    
    if (enabled) {
      document.body.classList.add('high-contrast');
      this.announce('High contrast mode enabled', 'polite');
    } else {
      document.body.classList.remove('high-contrast');
      this.announce('High contrast mode disabled', 'polite');
    }
  }

  /**
   * Set reduced motion preference
   */
  setReducedMotion(enabled: boolean): void {
    this.reducedMotion.set(enabled);
    this.saveUserPreferences();
    
    if (enabled) {
      document.body.classList.add('reduced-motion');
      this.announce('Reduced motion enabled', 'polite');
    } else {
      document.body.classList.remove('reduced-motion');
      this.announce('Reduced motion disabled', 'polite');
    }
  }

  /**
   * Set font size preference
   */
  setFontSize(size: 'normal' | 'large' | 'larger'): void {
    this.fontSize.set(size);
    this.saveUserPreferences();
    
    // Remove existing font size classes
    document.body.classList.remove('font-large', 'font-larger');
    
    if (size !== 'normal') {
      document.body.classList.add(`font-${size}`);
    }
    
    this.announce(`Font size set to ${size}`, 'polite');
  }

  /**
   * Get focusable elements within container
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(el => this.isElementVisible(el)) as HTMLElement[];
  }

  /**
   * Check if element is visible and focusable
   */
  private isElementVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * Initialize accessibility settings
   */
  private initializeAccessibilitySettings(): void {
    // Check if window.matchMedia is available (not in test environment)
    if (typeof window !== 'undefined' && window.matchMedia) {
      // Detect user preferences from media queries
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        this.setReducedMotion(true);
      }
      
      if (window.matchMedia('(prefers-contrast: high)').matches) {
        this.setHighContrast(true);
      }

      // Listen for preference changes
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', (e) => this.setReducedMotion(e.matches));
      
      window.matchMedia('(prefers-contrast: high)')
        .addEventListener('change', (e) => this.setHighContrast(e.matches));
    }
  }

  /**
   * Setup router accessibility
   */
  private setupRouterAccessibility(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        // Announce page change
        const pageName = this.getPageNameFromUrl(event.url);
        this.announce(`Navigated to ${pageName} page`, 'assertive');
        
        // Reset focus to main content
        setTimeout(() => {
          const mainContent = document.querySelector('main, [role="main"], #main-content');
          if (mainContent) {
            this.setFocus(mainContent as HTMLElement, 'navigation');
          }
        }, 100);
      });
  }

  /**
   * Detect screen reader
   */
  private detectScreenReader(): void {
    // Check for screen reader indicators
    const hasScreenReader = 
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('VoiceOver') ||
      !!(window.speechSynthesis) ||
      'speechSynthesis' in window;

    this.screenReaderActive.set(hasScreenReader);
  }

  /**
   * Setup global keyboard handling
   */
  private setupGlobalKeyboardHandling(): void {
    document.addEventListener('keydown', (event) => {
      // Handle focus trap
      if (this.trapFocus() && this.focusWithin()) {
        this.handleFocusTrapKeydown(event);
      }

      // Handle keyboard shortcuts
      this.handleShortcutKeydown(event);
    });

    // Track focus changes
    document.addEventListener('focusin', (event) => {
      if (event.target instanceof HTMLElement) {
        this.currentFocus.set(event.target);
      }
    });
  }

  /**
   * Handle focus trap keyboard navigation
   */
  private handleFocusTrapKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.focusWithin()) return;

    const focusableElements = this.getFocusableElements(this.focusWithin()!);
    const currentIndex = focusableElements.indexOf(this.currentFocus()!);
    
    if (event.shiftKey) {
      // Shift+Tab: Previous element
      event.preventDefault();
      const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
      this.setFocus(focusableElements[previousIndex]);
    } else {
      // Tab: Next element
      event.preventDefault();
      const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
      this.setFocus(focusableElements[nextIndex]);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleShortcutKeydown(event: KeyboardEvent): void {
    const activeShortcuts = this.shortcuts().filter(s => 
      !s.disabled && 
      (!s.context || s.context === this.shortcutContext() || s.context === 'global')
    );

    for (const shortcut of activeShortcuts) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }

  /**
   * Check if event matches shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return event.key.toLowerCase() === shortcut.key.toLowerCase() &&
           !!event.ctrlKey === !!shortcut.ctrlKey &&
           !!event.altKey === !!shortcut.altKey &&
           !!event.shiftKey === !!shortcut.shiftKey &&
           !!event.metaKey === !!shortcut.metaKey;
  }

  /**
   * Get focus announcement for screen readers
   */
  private getFocusAnnouncement(element: HTMLElement, reason: FocusTarget['reason']): string {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || element.textContent?.trim() || '';
    
    let announcement = '';
    
    switch (reason) {
      case 'navigation':
        announcement = `Focused ${role || tagName}${label ? ': ' + label : ''}`;
        break;
      case 'modal':
        announcement = `Modal opened, focused ${label || 'dialog'}`;
        break;
      case 'error':
        announcement = `Error: ${label}`;
        break;
      case 'notification':
        announcement = `Notification: ${label}`;
        break;
    }
    
    return announcement;
  }

  /**
   * Get page name from URL
   */
  private getPageNameFromUrl(url: string): string {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(s => s);
    
    if (segments.length === 0) return 'Home';
    
    const pageName = segments[segments.length - 1];
    return pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, ' ');
  }

  /**
   * Calculate color contrast ratio
   */
  private calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Convert hex color to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Get luminance of RGB color
   */
  private getLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;
    
    const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
    
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
  }

  /**
   * Adjust color for sufficient contrast
   */
  private adjustColorForContrast(color: string, background: string): string {
    // This is a simplified version - in production, you'd use a more sophisticated algorithm
    const rgb = this.hexToRgb(color);
    if (!rgb) return color;
    
    // Darken or lighten color until contrast is sufficient
    let adjustment = -20;
    let adjustedColor = color;
    
    for (let i = 0; i < 10; i++) {
      const adjustedRgb = {
        r: Math.max(0, Math.min(255, rgb.r + adjustment)),
        g: Math.max(0, Math.min(255, rgb.g + adjustment)),
        b: Math.max(0, Math.min(255, rgb.b + adjustment))
      };
      
      adjustedColor = `#${adjustedRgb.r.toString(16).padStart(2, '0')}${adjustedRgb.g.toString(16).padStart(2, '0')}${adjustedRgb.b.toString(16).padStart(2, '0')}`;
      
      if (this.checkColorContrast(adjustedColor, background).valid) {
        break;
      }
      
      adjustment -= 20;
    }
    
    return adjustedColor;
  }

  /**
   * Save user preferences
   */
  private saveUserPreferences(): void {
    const preferences = {
      highContrast: this.highContrast(),
      reducedMotion: this.reducedMotion(),
      fontSize: this.fontSize()
    };
    
    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }

  /**
   * Load user preferences
   */
  private loadUserPreferences(): void {
    try {
      const saved = localStorage.getItem('accessibility-preferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        
        if (preferences.highContrast) this.setHighContrast(true);
        if (preferences.reducedMotion) this.setReducedMotion(true);
        if (preferences.fontSize) this.setFontSize(preferences.fontSize);
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }
}