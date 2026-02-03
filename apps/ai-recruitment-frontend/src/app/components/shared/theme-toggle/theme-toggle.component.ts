import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Theme } from '../../../services/theme/theme.service';
import { ThemeService } from '../../../services/theme/theme.service';

/**
 * Represents the theme toggle component.
 */
@Component({
  selector: 'arc-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="theme-toggle-container">
      <button
        class="theme-toggle-btn"
        [class.active]="currentTheme() === 'light'"
        (click)="setTheme('light')"
        title="明亮模式"
        type="button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      </button>

      <button
        class="theme-toggle-btn"
        [class.active]="currentTheme() === 'auto'"
        (click)="setTheme('auto')"
        title="跟随系统"
        type="button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      </button>

      <button
        class="theme-toggle-btn"
        [class.active]="currentTheme() === 'dark'"
        (click)="setTheme('dark')"
        title="暗黑模式"
        type="button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      </button>
    </div>

    <!-- Mobile dropdown version -->
    <div class="theme-toggle-mobile">
      <button
        class="theme-toggle-dropdown-btn"
        (click)="toggleDropdown()"
        type="button"
      >
        <span class="theme-icon">
          <svg
            *ngIf="currentTheme() === 'light'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg
            *ngIf="currentTheme() === 'auto'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <svg
            *ngIf="currentTheme() === 'dark'"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </span>
        <span class="theme-label">{{ getThemeLabel() }}</span>
        <svg
          class="dropdown-arrow"
          [class.open]="dropdownOpen"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="theme-dropdown" [class.open]="dropdownOpen">
        <button
          class="theme-option"
          [class.active]="currentTheme() === 'light'"
          (click)="selectTheme('light')"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <span>明亮模式</span>
        </button>
        <button
          class="theme-option"
          [class.active]="currentTheme() === 'auto'"
          (click)="selectTheme('auto')"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
          <span>跟随系统</span>
        </button>
        <button
          class="theme-option"
          [class.active]="currentTheme() === 'dark'"
          (click)="selectTheme('dark')"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <span>暗黑模式</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .theme-toggle-container {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem;
        background: var(--color-surface, white);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 10px;
      }

      .theme-toggle-btn {
        padding: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--color-text-secondary, #6b7280);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .theme-toggle-btn:hover {
        background: var(--color-background, #f3f4f6);
        color: var(--color-text, #111827);
      }

      .theme-toggle-btn.active {
        background: var(--color-primary, #667eea);
        color: white;
      }

      /* Mobile dropdown version */
      .theme-toggle-mobile {
        display: none;
        position: relative;
      }

      .theme-toggle-dropdown-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: var(--color-surface, white);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--color-text, #111827);
        font-size: 0.875rem;
        font-weight: 500;
      }

      .theme-toggle-dropdown-btn:hover {
        background: var(--color-background, #f3f4f6);
        border-color: var(--color-text-secondary, #9ca3af);
      }

      .theme-icon {
        display: flex;
        align-items: center;
      }

      .theme-label {
        min-width: 60px;
        text-align: left;
      }

      .dropdown-arrow {
        transition: transform 0.2s;
      }

      .dropdown-arrow.open {
        transform: rotate(180deg);
      }

      .theme-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: var(--color-surface, white);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 8px;
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
        overflow: hidden;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s;
        z-index: 50;
      }

      .theme-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem 1rem;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s;
        color: var(--color-text, #111827);
        font-size: 0.875rem;
        text-align: left;
        white-space: nowrap;
      }

      .theme-option:hover {
        background: var(--color-background, #f3f4f6);
      }

      .theme-option.active {
        background: rgba(102, 126, 234, 0.1);
        color: var(--color-primary, #667eea);
        font-weight: 600;
      }

      /* Responsive design */
      @media (max-width: 640px) {
        .theme-toggle-container {
          display: none;
        }

        .theme-toggle-mobile {
          display: block;
        }
      }

      /* Animations */
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .theme-toggle-btn.active {
        animation: fadeIn 0.2s ease-out;
      }

      /* Focus styles for accessibility */
      .theme-toggle-btn:focus-visible,
      .theme-toggle-dropdown-btn:focus-visible,
      .theme-option:focus-visible {
        outline: 2px solid var(--color-primary, #667eea);
        outline-offset: 2px;
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .theme-toggle-btn,
        .theme-toggle-dropdown-btn,
        .theme-option,
        .dropdown-arrow,
        .theme-dropdown {
          transition: none;
        }

        .theme-toggle-btn.active {
          animation: none;
        }
      }
    `,
  ],
})
export class ThemeToggleComponent {
  public dropdownOpen = false;

  // Expose theme service properties
  public currentTheme = computed(() => this.themeService.currentTheme());
  public isDarkMode = computed(() => this.themeService.isDarkMode());

  private themeService = inject(ThemeService);

  /**
   * Initializes a new instance of the Theme Toggle Component.
   */
  constructor() {
    // Close dropdown on outside click
    this.setupOutsideClickHandler();
  }

  /**
   * Sets theme.
   * @param theme - The theme.
   */
  public setTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  /**
   * Performs the toggle dropdown operation.
   */
  public toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;
  }

  /**
   * Performs the select theme operation.
   * @param theme - The theme.
   */
  public selectTheme(theme: Theme): void {
    this.setTheme(theme);
    this.dropdownOpen = false;
  }

  /**
   * Retrieves theme label.
   * @returns The string value.
   */
  public getThemeLabel(): string {
    const theme = this.currentTheme();
    switch (theme) {
      case 'light':
        return '明亮';
      case 'dark':
        return '暗黑';
      case 'auto':
        return '自动';
      default:
        return '主题';
    }
  }

  private setupOutsideClickHandler(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const container = target.closest('.theme-toggle-mobile');

      if (!container && this.dropdownOpen) {
        this.dropdownOpen = false;
      }
    });
  }
}
