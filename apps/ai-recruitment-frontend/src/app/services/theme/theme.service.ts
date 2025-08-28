import { Injectable, signal, effect } from '@angular/core';
import { ToastService } from '../toast.service';

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'app-theme-preference';
  private readonly THEME_ATTRIBUTE = 'data-theme';
  
  // Reactive state
  currentTheme = signal<Theme>('light');
  isDarkMode = signal(false);
  
  // Theme color palettes
  private readonly themes: Record<'light' | 'dark', ThemeColors> = {
    light: {
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
      info: '#3b82f6'
    },
    dark: {
      primary: '#818cf8',
      secondary: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#34d399',
      info: '#60a5fa'
    }
  };

  constructor(private toastService: ToastService) {
    // Initialize theme on service creation
    this.initializeTheme();
    
    // Listen for system theme changes
    this.listenToSystemTheme();
    
    // Apply theme changes reactively
    effect(() => {
      this.applyTheme(this.isDarkMode());
    });
  }

  private initializeTheme(): void {
    // Get saved preference or default to auto
    const savedTheme = this.getSavedTheme();
    this.currentTheme.set(savedTheme);
    
    // Determine initial dark mode state
    if (savedTheme === 'auto') {
      this.isDarkMode.set(this.getSystemPrefersDark());
    } else {
      this.isDarkMode.set(savedTheme === 'dark');
    }
  }

  private getSavedTheme(): Theme {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme;
    return saved && ['light', 'dark', 'auto'].includes(saved) ? saved : 'auto';
  }

  private getSystemPrefersDark(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private listenToSystemTheme(): void {
    if (!window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', (e) => {
        if (this.currentTheme() === 'auto') {
          this.isDarkMode.set(e.matches);
        }
      });
    } else if (mediaQuery.addListener) {
      // Legacy browsers
      mediaQuery.addListener((e) => {
        if (this.currentTheme() === 'auto') {
          this.isDarkMode.set(e.matches);
        }
      });
    }
  }

  private applyTheme(isDark: boolean): void {
    const theme = isDark ? 'dark' : 'light';
    const colors = this.themes[theme];
    
    // Set data attribute for CSS
    document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
    
    // Set CSS custom properties
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${this.kebabCase(key)}`, value);
    });
    
    // Additional theme-specific styles
    if (isDark) {
      root.classList.add('dark');
      root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.3)');
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(0, 0, 0, 0.05)');
      root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(0, 0, 0, 0.1)');
    }
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(colors.primary);
  }

  private updateMetaThemeColor(color: string): void {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    metaThemeColor.setAttribute('content', color);
  }

  private kebabCase(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  // Public API
  
  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    
    if (theme === 'auto') {
      this.isDarkMode.set(this.getSystemPrefersDark());
      this.toastService.info('主题已设置为跟随系统');
    } else {
      this.isDarkMode.set(theme === 'dark');
      this.toastService.success(`已切换到${theme === 'dark' ? '暗黑' : '明亮'}模式`);
    }
  }

  toggleTheme(): void {
    if (this.currentTheme() === 'auto') {
      // If auto, switch to opposite of current
      this.setTheme(this.isDarkMode() ? 'light' : 'dark');
    } else {
      // Toggle between light and dark
      this.setTheme(this.currentTheme() === 'light' ? 'dark' : 'light');
    }
  }

  getThemeColors(): ThemeColors {
    return this.themes[this.isDarkMode() ? 'dark' : 'light'];
  }

  // Utility method for components to get current theme
  getThemeClass(): string {
    return this.isDarkMode() ? 'theme-dark' : 'theme-light';
  }

  // Method to apply theme to a specific element
  applyThemeToElement(element: HTMLElement): void {
    element.classList.remove('theme-light', 'theme-dark');
    element.classList.add(this.getThemeClass());
  }

  // Prefers reduced motion check
  prefersReducedMotion(): boolean {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // High contrast mode check
  prefersHighContrast(): boolean {
    return window.matchMedia && 
           (window.matchMedia('(prefers-contrast: high)').matches ||
            window.matchMedia('(prefers-contrast: more)').matches);
  }
}