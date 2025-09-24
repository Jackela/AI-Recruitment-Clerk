import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
  context?: string;
}

export interface NavigationState {
  currentPage: string;
  previousPage?: string;
  preservedState?: any;
}

@Injectable({
  providedIn: 'root',
})
export class KeyboardNavigationService {
  // State management
  private _shortcuts = new Map<string, KeyboardShortcut>(); // Reserved for keyboard shortcuts implementation
  private globalShortcuts: KeyboardShortcut[] = [];
  private contextShortcuts = new Map<string, KeyboardShortcut[]>();

  // Navigation state
  private navigationState = signal<NavigationState>({
    currentPage: '',
  });

  // Help overlay
  showKeyboardHelp = signal(false);

  // Events
  private shortcutTriggered$ = new Subject<{
    shortcut: KeyboardShortcut;
    event: KeyboardEvent;
  }>();

  constructor() {
    this.initializeGlobalShortcuts();
    this.setupEventListeners();
  }

  private initializeGlobalShortcuts(): void {
    // Global navigation shortcuts
    this.registerGlobalShortcut({
      key: 'h',
      altKey: true,
      description: '显示/隐藏快捷键帮助',
      action: () => this._toggleKeyboardHelp(),
    });

    this.registerGlobalShortcut({
      key: '1',
      altKey: true,
      description: '跳转到首页',
      action: () => this.navigateToPage('/'),
    });

    this.registerGlobalShortcut({
      key: '2',
      altKey: true,
      description: '跳转到分析页面',
      action: () => this.navigateToPage('/analysis'),
    });

    this.registerGlobalShortcut({
      key: '3',
      altKey: true,
      description: '跳转到结果页面',
      action: () => this.navigateToPage('/results'),
    });

    this.registerGlobalShortcut({
      key: 'Escape',
      description: '关闭弹窗/返回',
      action: () => this._handleEscape(),
    });

    this.registerGlobalShortcut({
      key: 'u',
      ctrlKey: true,
      description: '上传文件',
      action: () => this._triggerFileUpload(),
    });

    this.registerGlobalShortcut({
      key: 's',
      ctrlKey: true,
      description: '开始分析',
      action: () => this._startAnalysis(),
    });

    this.registerGlobalShortcut({
      key: 'e',
      ctrlKey: true,
      description: '导出结果',
      action: () => this._exportResults(),
    });

    // Focus management
    this.registerGlobalShortcut({
      key: 'Tab',
      description: '下一个焦点元素',
      action: () => this._focusNext(),
    });

    this.registerGlobalShortcut({
      key: 'Tab',
      shiftKey: true,
      description: '上一个焦点元素',
      action: () => this._focusPrevious(),
    });
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    // Track focus for accessibility
    document.addEventListener('focusin', (event) => {
      this.handleFocusIn(event);
    });
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Don't trigger shortcuts when typing in inputs
    if (this.isInputFocused()) {
      return;
    }

    // Check shortcuts without storing key

    // Check global shortcuts first
    const globalShortcut = this.globalShortcuts.find((s) =>
      this.matchesShortcut(s, event),
    );

    if (globalShortcut) {
      event.preventDefault();
      globalShortcut.action();
      this.shortcutTriggered$.next({ shortcut: globalShortcut, event });
      return;
    }

    // Check context-specific shortcuts
    const currentContext = this.getCurrentContext();
    const contextShortcuts = this.contextShortcuts.get(currentContext) || [];

    const contextShortcut = contextShortcuts.find((s) =>
      this.matchesShortcut(s, event),
    );

    if (contextShortcut) {
      event.preventDefault();
      contextShortcut.action();
      this.shortcutTriggered$.next({ shortcut: contextShortcut, event });
    }
  }

  private handleFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    if (target) {
      // Add focus indicator for keyboard navigation
      target.classList.add('keyboard-focused');

      // Remove indicator on mouse interaction
      const removeIndicator = () => {
        target.classList.remove('keyboard-focused');
        target.removeEventListener('mousedown', removeIndicator);
        target.removeEventListener('mouseup', removeIndicator);
      };

      target.addEventListener('mousedown', removeIndicator);
      target.addEventListener('mouseup', removeIndicator);
    }
  }

  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const inputElements = ['INPUT', 'TEXTAREA', 'SELECT'];
    const isInput = inputElements.includes(activeElement.tagName);
    const isContentEditable =
      activeElement.getAttribute('contenteditable') === 'true';

    return isInput || isContentEditable;
  }

  private matchesShortcut(
    shortcut: KeyboardShortcut,
    event: KeyboardEvent,
  ): boolean {
    return (
      shortcut.key.toLowerCase() === event.key.toLowerCase() &&
      !!shortcut.ctrlKey === event.ctrlKey &&
      !!shortcut.altKey === event.altKey &&
      !!shortcut.shiftKey === event.shiftKey
    );
  }

  private createShortcutKey(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  private getCurrentContext(): string {
    const path = window.location.pathname;
    if (path.includes('/analysis')) return 'analysis';
    if (path.includes('/results')) return 'results';
    if (path.includes('/dashboard')) return 'dashboard';
    return 'global';
  }

  // Public API methods
  registerGlobalShortcut(shortcut: KeyboardShortcut): void {
    this.globalShortcuts.push(shortcut);
  }

  registerContextShortcut(context: string, shortcut: KeyboardShortcut): void {
    if (!this.contextShortcuts.has(context)) {
      this.contextShortcuts.set(context, []);
    }
    this.contextShortcuts.get(context)!.push(shortcut);
  }

  unregisterShortcut(key: string, context?: string): void {
    if (context) {
      const shortcuts = this.contextShortcuts.get(context);
      if (shortcuts) {
        const index = shortcuts.findIndex(
          (s) =>
            this.createShortcutKey({
              key: s.key,
              ctrlKey: s.ctrlKey,
              altKey: s.altKey,
              shiftKey: s.shiftKey,
            } as KeyboardEvent) === key,
        );
        if (index > -1) {
          shortcuts.splice(index, 1);
        }
      }
    } else {
      const index = this.globalShortcuts.findIndex(
        (s) =>
          this.createShortcutKey({
            key: s.key,
            ctrlKey: s.ctrlKey,
            altKey: s.altKey,
            shiftKey: s.shiftKey,
          } as KeyboardEvent) === key,
      );
      if (index > -1) {
        this.globalShortcuts.splice(index, 1);
      }
    }
  }

  // Navigation actions
  private navigateToPage(path: string): void {
    const currentState = this.navigationState();
    this.navigationState.set({
      currentPage: path,
      previousPage: currentState.currentPage,
      preservedState: this.preserveCurrentState(),
    });

    // Use Angular Router if available
    if ((window as any).ngRouter) {
      (window as any).ngRouter.navigate([path]);
    } else {
      window.location.href = path;
    }
  }

  private preserveCurrentState(): any {
    // Preserve scroll position and form data
    return {
      scrollTop: window.scrollY,
      scrollLeft: window.scrollX,
      formData: this.extractFormData(),
      timestamp: Date.now(),
    };
  }

  private extractFormData(): Record<string, any> {
    const formData: Record<string, any> = {};
    const inputs = document.querySelectorAll('input, textarea, select');

    inputs.forEach((input: any) => {
      if (input.name || input.id) {
        const key = input.name || input.id;
        formData[key] = input.value;
      }
    });

    return formData;
  }

  // Reserved for future state restoration functionality
  private _restoreState(state: any): void {
    if (!state) return;

    // Restore scroll position
    setTimeout(() => {
      window.scrollTo(state.scrollLeft || 0, state.scrollTop || 0);
    }, 100);

    // Restore form data
    Object.entries(state.formData || {}).forEach(([key, value]) => {
      const element = document.querySelector(
        `[name="${key}"], #${key}`,
      ) as HTMLInputElement;
      if (element) {
        element.value = value as string;
      }
    });
  }

  // Action handlers
  private _handleEscape(): void {
    // Close modals, guides, or return to previous page
    if (this.showKeyboardHelp()) {
      this.showKeyboardHelp.set(false);
      return;
    }

    // Check for open modals or overlays
    const modal = document.querySelector(
      '.modal, .overlay, .guide-overlay-container',
    );
    if (modal) {
      const closeButton = modal.querySelector(
        '.close, .cancel, [aria-label*="关闭"]',
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
        return;
      }
    }

    // Navigate back
    const state = this.navigationState();
    if (state.previousPage) {
      this.navigateToPage(state.previousPage);
    }
  }

  private _triggerFileUpload(): void {
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  private _startAnalysis(): void {
    const startButton = document.querySelector(
      '.start-analysis-btn, [class*="start"], [class*="analyze"]',
    ) as HTMLElement;
    if (startButton && !startButton.hasAttribute('disabled')) {
      startButton.click();
    }
  }

  private _exportResults(): void {
    const exportButton = document.querySelector(
      '.export-btn, [class*="export"]',
    ) as HTMLElement;
    if (exportButton) {
      exportButton.click();
    }
  }

  private _focusNext(): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = Array.from(focusableElements).indexOf(
      document.activeElement as HTMLElement,
    );
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    (focusableElements[nextIndex] as HTMLElement).focus();
  }

  private _focusPrevious(): void {
    const focusableElements = this.getFocusableElements();
    const currentIndex = Array.from(focusableElements).indexOf(
      document.activeElement as HTMLElement,
    );
    const prevIndex =
      currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    (focusableElements[prevIndex] as HTMLElement).focus();
  }

  private getFocusableElements(): NodeListOf<Element> {
    return document.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
  }

  private _toggleKeyboardHelp(): void {
    this.showKeyboardHelp.set(!this.showKeyboardHelp());
  }

  // Help system
  getAllShortcuts(): {
    global: KeyboardShortcut[];
    contexts: Record<string, KeyboardShortcut[]>;
  } {
    const contexts: Record<string, KeyboardShortcut[]> = {};
    this.contextShortcuts.forEach((shortcuts, context) => {
      contexts[context] = shortcuts;
    });

    return {
      global: this.globalShortcuts,
      contexts,
    };
  }

  getShortcutsForContext(context: string): KeyboardShortcut[] {
    return this.contextShortcuts.get(context) || [];
  }

  // Accessibility helpers
  announceShortcut(shortcut: KeyboardShortcut): void {
    const announcement = `快捷键: ${this.formatShortcutKey(shortcut)}, ${shortcut.description}`;
    this.announceToScreenReader(announcement);
  }

  private formatShortcutKey(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Cleanup
  destroy(): void {
    // Remove event listeners if needed
    this._shortcuts.clear();
    this.globalShortcuts.length = 0;
    this.contextShortcuts.clear();
  }
}
