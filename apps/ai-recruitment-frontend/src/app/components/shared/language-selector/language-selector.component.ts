import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  I18nService,
  Language,
  LanguageConfig,
} from '../../../services/i18n/i18n.service';

/**
 * Represents the language selector component.
 */
@Component({
  selector: 'arc-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button
        class="language-btn"
        (click)="toggleDropdown()"
        [attr.aria-label]="'选择语言: ' + currentLanguageConfig().nativeName"
        [attr.aria-expanded]="dropdownOpen"
        aria-haspopup="listbox"
        type="button"
      >
        <span class="language-flag">{{ getFlagEmoji(currentLanguage()) }}</span>
        <span class="language-name">{{
          currentLanguageConfig().nativeName
        }}</span>
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

      <div
        class="language-dropdown"
        [class.open]="dropdownOpen"
        role="listbox"
        [attr.aria-label]="'可用语言'"
      >
        <button
          *ngFor="let lang of availableLanguages"
          class="language-option"
          [class.active]="lang.code === currentLanguage()"
          (click)="selectLanguage(lang.code)"
          [attr.aria-selected]="lang.code === currentLanguage()"
          role="option"
          type="button"
        >
          <span class="option-flag">{{ getFlagEmoji(lang.code) }}</span>
          <div class="option-text">
            <span class="option-native">{{ lang.nativeName }}</span>
            <span class="option-name">{{ lang.name }}</span>
          </div>
          <svg
            *ngIf="lang.code === currentLanguage()"
            class="check-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }

      .language-selector {
        position: relative;
      }

      .language-btn {
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
        min-width: 140px;
      }

      .language-btn:hover {
        background: var(--color-background, #f9fafb);
        border-color: var(--color-text-secondary, #9ca3af);
      }

      .language-btn:focus-visible {
        outline: 2px solid var(--color-primary, #667eea);
        outline-offset: 2px;
      }

      .language-flag {
        font-size: 1.25rem;
        line-height: 1;
      }

      .language-name {
        flex: 1;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dropdown-arrow {
        transition: transform 0.2s;
        color: var(--color-text-secondary, #6b7280);
      }

      .dropdown-arrow.open {
        transform: rotate(180deg);
      }

      .language-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        right: 0;
        min-width: 200px;
        background: var(--color-surface, white);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: 8px;
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
        overflow: hidden;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.2s;
        z-index: 100;
      }

      .language-dropdown.open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .language-option {
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
        text-align: left;
      }

      .language-option:hover {
        background: var(--color-background, #f3f4f6);
      }

      .language-option.active {
        background: rgba(102, 126, 234, 0.1);
      }

      .language-option:focus-visible {
        outline: 2px solid var(--color-primary, #667eea);
        outline-offset: -2px;
      }

      .option-flag {
        font-size: 1.5rem;
        line-height: 1;
      }

      .option-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .option-native {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-text, #111827);
      }

      .option-name {
        font-size: 0.75rem;
        color: var(--color-text-secondary, #6b7280);
      }

      .check-icon {
        color: var(--color-primary, #667eea);
        flex-shrink: 0;
      }

      /* Mobile responsive */
      @media (max-width: 640px) {
        .language-btn {
          min-width: auto;
          padding: 0.5rem;
        }

        .language-name {
          display: none;
        }

        .language-dropdown {
          position: fixed;
          top: auto;
          bottom: 0;
          left: 0;
          right: 0;
          border-radius: 16px 16px 0 0;
          transform: translateY(100%);
          max-height: 50vh;
          overflow-y: auto;
        }

        .language-dropdown.open {
          transform: translateY(0);
        }
      }

      /* Animations */
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .language-dropdown.open {
        animation: slideDown 0.2s ease-out;
      }

      /* Dark mode adjustments */
      :host-context([data-theme='dark']) {
        .language-dropdown {
          background: var(--color-surface, #1e293b);
          border-color: var(--color-border, #334155);
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .language-btn,
        .language-option {
          border: 2px solid transparent;
        }

        .language-btn:focus-visible,
        .language-option:focus-visible {
          border-color: var(--color-primary, #667eea);
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        .language-btn,
        .language-dropdown,
        .dropdown-arrow {
          transition: none;
        }

        .language-dropdown.open {
          animation: none;
        }
      }
    `,
  ],
})
export class LanguageSelectorComponent {
  dropdownOpen = false;

  // Expose i18n service properties
  currentLanguage = computed(() => this.i18nService.currentLanguage());
  currentLanguageConfig = computed(() =>
    this.i18nService.getCurrentLanguageConfig(),
  );
  availableLanguages!: LanguageConfig[];

  private i18nService = inject(I18nService);

  /**
   * Initializes a new instance of the Language Selector Component.
   */
  constructor() {
    this.availableLanguages = this.i18nService.getAvailableLanguages();
    // Close dropdown on outside click
    this.setupOutsideClickHandler();

    // Close dropdown on escape key
    this.setupKeyboardHandler();
  }

  /**
   * Performs the toggle dropdown operation.
   */
  toggleDropdown(): void {
    this.dropdownOpen = !this.dropdownOpen;

    if (this.dropdownOpen) {
      // Focus first option when opening
      setTimeout(() => {
        const firstOption = document.querySelector(
          '.language-option',
        ) as HTMLElement;
        firstOption?.focus();
      }, 100);
    }
  }

  /**
   * Performs the select language operation.
   * @param language - The language.
   */
  selectLanguage(language: Language): void {
    this.i18nService.setLanguage(language);
    this.dropdownOpen = false;
  }

  /**
   * Retrieves flag emoji.
   * @param language - The language.
   * @returns The string value.
   */
  getFlagEmoji(language: Language): string {
    const flags: Record<Language, string> = {
      'zh-CN': '🇨🇳',
      'en-US': '🇺🇸',
      'zh-TW': '🇹🇼',
      'ja-JP': '🇯🇵',
      'ko-KR': '🇰🇷',
    };

    return flags[language] || '🌐';
  }

  private setupOutsideClickHandler(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const container = target.closest('.language-selector');

      if (!container && this.dropdownOpen) {
        this.dropdownOpen = false;
      }
    });
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.dropdownOpen) {
        this.dropdownOpen = false;

        // Return focus to button
        const button = document.querySelector('.language-btn') as HTMLElement;
        button?.focus();
      }

      // Arrow navigation in dropdown
      if (
        this.dropdownOpen &&
        (event.key === 'ArrowDown' || event.key === 'ArrowUp')
      ) {
        event.preventDefault();

        const options = Array.from(
          document.querySelectorAll('.language-option'),
        ) as HTMLElement[];
        const currentIndex = options.findIndex(
          (opt) => opt === document.activeElement,
        );

        let nextIndex: number;
        if (event.key === 'ArrowDown') {
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        }

        options[nextIndex]?.focus();
      }
    });
  }
}
