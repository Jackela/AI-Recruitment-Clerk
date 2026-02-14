import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of a header action button.
 */
export interface HeaderAction {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  disabled?: boolean;
}

/**
 * Mobile navigation header component.
 * Displays the header with back button, title, subtitle, action buttons, and menu toggle.
 */
@Component({
  selector: 'arc-mobile-navigation-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="mobile-header" [class.scrolled]="isScrolled">
      <button
        class="header-back"
        *ngIf="showBackButton"
        (click)="onBackClick()"
        [attr.aria-label]="'Go back'"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
          />
        </svg>
      </button>

      <div class="header-title-container">
        <h1 class="header-title">{{ pageTitle }}</h1>
        <p class="header-subtitle" *ngIf="pageSubtitle">
          {{ pageSubtitle }}
        </p>
      </div>

      <div class="header-actions">
        <button
          class="header-action"
          *ngFor="let action of headerActions"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label"
          [disabled]="action.disabled"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path [attr.d]="action.icon" />
          </svg>
          <span class="action-badge" *ngIf="action.badge">{{
            action.badge
          }}</span>
        </button>

        <!-- Menu button -->
        <button
          class="header-menu"
          (click)="onMenuToggle()"
          [attr.aria-label]="'Open menu'"
          [attr.aria-expanded]="isMenuOpen"
        >
          <div class="hamburger" [class.active]="isMenuOpen">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .mobile-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: var(--color-bg-primary);
        border-bottom: 1px solid var(--color-border-secondary);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 var(--space-4);
        z-index: var(--z-index-sticky);
        transition: all var(--transition-base);
        padding-top: env(safe-area-inset-top);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--color-primary-300),
            transparent
          );
          opacity: 0;
          transition: opacity var(--transition-base);
        }

        &.scrolled {
          box-shadow: var(--shadow-lg);
          border-bottom-color: var(--color-border-fantasy);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);

          &::before {
            opacity: 0.6;
          }
        }

        .header-back {
          min-width: 48px;
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--color-primary-700);
          cursor: pointer;
          border-radius: var(--radius-full);
          transition: all var(--transition-base);
          position: relative;

          &::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 0;
            height: 0;
            background: var(--color-primary-100);
            border-radius: var(--radius-full);
            transition: all var(--transition-base);
            z-index: -1;
          }

          &:hover {
            color: var(--color-primary-800);

            &::before {
              width: 100%;
              height: 100%;
            }
          }

          &:active {
            background-color: var(--color-primary-200);
            transform: scale(0.95);
          }
        }

        .header-title-container {
          flex: 1;
          text-align: center;
          margin: 0 var(--space-4);

          .header-title {
            font-family: var(--font-family-fantasy-heading);
            font-size: var(--font-size-lg);
            font-weight: var(--font-weight-fantasy-h2);
            color: var(--color-text-fantasy);
            margin: 0;
            line-height: var(--line-height-tight);
            letter-spacing: -0.01em;
            background: linear-gradient(
              135deg,
              var(--color-primary-800),
              var(--color-royal-700)
            );
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .header-subtitle {
            font-family: var(--font-family-body);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-secondary);
            margin: var(--space-0-5) 0 0 0;
            line-height: var(--line-height-tight);
            opacity: 0.9;
          }
        }

        .header-actions {
          display: flex;
          gap: var(--space-2);
          align-items: center;

          .header-action {
            position: relative;
            min-width: 48px;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            color: var(--color-text-tertiary);
            cursor: pointer;
            border-radius: var(--radius-full);
            transition: all var(--transition-base);

            &::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 0;
              height: 0;
              background: var(--color-primary-100);
              border-radius: var(--radius-full);
              transition: all var(--transition-base);
              z-index: -1;
            }

            &:hover {
              color: var(--color-primary-700);

              &::before {
                width: 100%;
                height: 100%;
              }
            }

            &:active {
              background-color: var(--color-primary-200);
              transform: scale(0.95);
            }

            .action-badge {
              position: absolute;
              top: 8px;
              right: 8px;
              background: linear-gradient(
                135deg,
                var(--color-error-600),
                var(--color-error-700)
              );
              color: white;
              font-family: var(--font-family-body);
              font-size: var(--font-size-xs);
              font-weight: var(--font-weight-bold);
              padding: var(--space-0-5) var(--space-2);
              border-radius: var(--radius-full);
              min-width: 18px;
              text-align: center;
              border: 2px solid white;
              box-shadow: var(--shadow-sm);
            }
          }

          .header-menu {
            min-width: 48px;
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: none;
            border: none;
            cursor: pointer;
            border-radius: var(--radius-full);
            transition: all var(--transition-base);
            position: relative;

            &::before {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 0;
              height: 0;
              background: var(--color-primary-100);
              border-radius: var(--radius-full);
              transition: all var(--transition-base);
              z-index: -1;
            }

            &:hover::before {
              width: 100%;
              height: 100%;
            }

            &:active {
              background-color: var(--color-primary-200);
              transform: scale(0.95);
            }

            .hamburger {
              width: 22px;
              height: 18px;
              position: relative;
              transition: transform var(--transition-base);

              span {
                display: block;
                position: absolute;
                height: 3px;
                width: 100%;
                background: var(--color-text-tertiary);
                border-radius: var(--radius-full);
                transition: all var(--transition-base);
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

                &:nth-child(1) {
                  top: 0;
                }

                &:nth-child(2) {
                  top: 7px;
                }

                &:nth-child(3) {
                  top: 14px;
                }
              }

              .header-menu:hover & span {
                background: var(--color-primary-700);
              }

              &.active {
                span:nth-child(1) {
                  transform: rotate(45deg);
                  top: 7px;
                  background: var(--color-primary-700);
                }

                span:nth-child(2) {
                  opacity: 0;
                  transform: scale(0);
                }

                span:nth-child(3) {
                  transform: rotate(-45deg);
                  top: 7px;
                  background: var(--color-primary-700);
                }
              }
            }
          }
        }
      }

      @media (min-width: 768px) {
        :host {
          display: none;
        }
      }
    `,
  ],
})
export class MobileNavigationHeaderComponent {
  @Input() public pageTitle = '';
  @Input() public pageSubtitle = '';
  @Input() public showBackButton = false;
  @Input() public isScrolled = false;
  @Input() public isMenuOpen = false;
  @Input() public headerActions: HeaderAction[] = [];

  @Output() public backClick = new EventEmitter<void>();
  @Output() public actionClick = new EventEmitter<HeaderAction>();
  @Output() public menuToggle = new EventEmitter<void>();

  /**
   * Handles back button click.
   */
  public onBackClick(): void {
    this.backClick.emit();
  }

  /**
   * Handles action button click.
   */
  public onActionClick(action: HeaderAction): void {
    this.actionClick.emit(action);
  }

  /**
   * Handles menu toggle button click.
   */
  public onMenuToggle(): void {
    this.menuToggle.emit();
  }
}
