import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';

/**
 * Defines the shape of the mobile nav item.
 */
export interface MobileNavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  disabled?: boolean;
}

/**
 * Represents the mobile navigation component.
 */
@Component({
  selector: 'arc-mobile-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <!-- Mobile Header -->
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
        <p class="header-subtitle" *ngIf="pageSubtitle">{{ pageSubtitle }}</p>
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
          (click)="toggleMenu()"
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

    <!-- Mobile Menu Overlay -->
    <div
      class="mobile-menu-overlay"
      [class.open]="isMenuOpen"
      (click)="closeMenu()"
      [attr.aria-hidden]="!isMenuOpen"
    >
      <nav class="mobile-menu" (click)="$event.stopPropagation()">
        <div class="menu-header">
          <h2>Menu</h2>
          <button
            class="menu-close"
            (click)="closeMenu()"
            [attr.aria-label]="'Close menu'"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        <ul class="menu-items" role="menu">
          <li role="none" *ngFor="let item of menuItems">
            <a
              [routerLink]="item.route"
              class="menu-item"
              [class.active]="currentRoute === item.route"
              [class.disabled]="item.disabled"
              (click)="onMenuItemClick(item)"
              role="menuitem"
              [attr.aria-current]="currentRoute === item.route ? 'page' : null"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="menu-icon"
              >
                <path [attr.d]="item.icon" />
              </svg>
              <span class="menu-label">{{ item.label }}</span>
              <span class="menu-badge" *ngIf="item.badge">{{
                item.badge
              }}</span>
            </a>
          </li>
        </ul>

        <div class="menu-footer">
          <button
            class="menu-action"
            *ngFor="let action of menuActions"
            (click)="onMenuActionClick(action)"
            [disabled]="action.disabled"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path [attr.d]="action.icon" />
            </svg>
            {{ action.label }}
          </button>
        </div>
      </nav>
    </div>

    <!-- Bottom Navigation -->
    <nav class="mobile-bottom-nav" [attr.aria-label]="'Main navigation'">
      <a
        *ngFor="let item of navItems"
        [routerLink]="item.route"
        class="nav-item"
        [class.active]="currentRoute === item.route"
        [class.disabled]="item.disabled"
        [attr.aria-current]="currentRoute === item.route ? 'page' : null"
        [attr.aria-label]="item.label"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="nav-icon"
        >
          <path [attr.d]="item.icon" />
        </svg>
        <span class="nav-label">{{ item.label }}</span>
        <span class="nav-badge" *ngIf="item.badge">{{ item.badge }}</span>
      </a>
    </nav>
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

      .mobile-menu-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(26, 35, 126, 0.4);
        backdrop-filter: blur(8px);
        z-index: var(--z-index-modal);
        opacity: 0;
        visibility: hidden;
        transition: all var(--transition-slow);

        &.open {
          opacity: 1;
          visibility: visible;
        }

        .mobile-menu {
          position: absolute;
          top: 0;
          right: 0;
          width: min(320px, 80vw);
          height: 100%;
          background: var(--color-bg-primary);
          transform: translateX(100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);

          .menu-header {
            padding: var(--space-5) var(--space-4);
            border-bottom: 1px solid var(--color-border-fantasy);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(
              135deg,
              var(--color-bg-secondary),
              rgba(255, 255, 255, 0.03)
            );
            position: relative;

            &::after {
              content: '';
              position: absolute;
              bottom: -1px;
              left: var(--space-4);
              width: 60px;
              height: 2px;
              background: linear-gradient(
                90deg,
                var(--color-primary-500),
                var(--color-royal-500)
              );
              border-radius: var(--radius-full);
            }

            h2 {
              font-family: var(--font-family-fantasy-heading);
              font-size: var(--font-size-lg);
              font-weight: var(--font-weight-fantasy-h2);
              color: var(--color-text-fantasy);
              margin: 0;
              background: linear-gradient(
                135deg,
                var(--color-primary-800),
                var(--color-royal-700)
              );
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }

            .menu-close {
              min-width: 44px;
              min-height: 44px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: none;
              border: none;
              color: var(--color-text-tertiary);
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
            }
          }

          .menu-items {
            flex: 1;
            list-style: none;
            margin: 0;
            padding: var(--space-2) 0;
            overflow-y: auto;

            .menu-item {
              display: flex;
              align-items: center;
              padding: var(--space-3) var(--space-4);
              color: var(--color-text-primary);
              text-decoration: none;
              transition: all var(--transition-base);
              position: relative;
              border-radius: var(--radius-lg);
              margin: var(--space-1) var(--space-2);

              &::before {
                content: '';
                position: absolute;
                left: 0;
                top: 50%;
                transform: translateY(-50%);
                width: 3px;
                height: 0;
                background: linear-gradient(
                  180deg,
                  var(--color-primary-600),
                  var(--color-royal-600)
                );
                border-radius: var(--radius-full);
                transition: height var(--transition-base);
              }

              &:hover {
                background: linear-gradient(
                  135deg,
                  var(--color-primary-25),
                  var(--color-royal-25)
                );
                transform: translateX(4px);

                &::before {
                  height: 40%;
                }
              }

              &:active {
                background: linear-gradient(
                  135deg,
                  var(--color-primary-50),
                  var(--color-royal-50)
                );
                transform: translateX(2px);
              }

              &.active {
                background: linear-gradient(
                  135deg,
                  var(--color-primary-100),
                  var(--color-royal-100)
                );
                color: var(--color-primary-800);
                border: 1px solid var(--color-primary-200);
                box-shadow: var(--shadow-sm);

                &::before {
                  height: 60%;
                }

                .menu-icon {
                  color: var(--color-primary-700);
                }
              }

              &.disabled {
                opacity: 0.5;
                pointer-events: none;
              }

              .menu-icon {
                width: 24px;
                height: 24px;
                margin-right: var(--space-4);
                color: var(--color-text-tertiary);
                transition: color var(--transition-base);
              }

              .menu-label {
                flex: 1;
                font-family: var(--font-family-body);
                font-size: var(--font-size-base);
                font-weight: var(--font-weight-medium);
                color: inherit;
              }

              .menu-badge {
                background: linear-gradient(
                  135deg,
                  var(--color-error-600),
                  var(--color-error-700)
                );
                color: white;
                font-family: var(--font-family-body);
                font-size: var(--font-size-xs);
                font-weight: var(--font-weight-semibold);
                padding: var(--space-1) var(--space-2);
                border-radius: var(--radius-full);
                margin-left: var(--space-2);
                min-width: 20px;
                text-align: center;
                box-shadow: var(--shadow-xs);
                border: 1px solid rgba(255, 255, 255, 0.2);
              }
            }
          }

          .menu-footer {
            padding: var(--space-4);
            border-top: 1px solid var(--color-border-fantasy);
            background: linear-gradient(
              135deg,
              var(--color-bg-secondary),
              rgba(255, 255, 255, 0.02)
            );
            position: relative;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: var(--space-4);
              width: 40px;
              height: 2px;
              background: linear-gradient(
                90deg,
                var(--color-primary-400),
                var(--color-royal-400)
              );
              border-radius: var(--radius-full);
            }

            .menu-action {
              width: 100%;
              display: flex;
              align-items: center;
              padding: var(--space-3);
              background: var(--color-bg-primary);
              border: 1px solid var(--color-border-primary);
              border-radius: var(--radius-lg);
              color: var(--color-text-primary);
              font-family: var(--font-family-body);
              font-size: var(--font-size-sm);
              font-weight: var(--font-weight-medium);
              cursor: pointer;
              transition: all var(--transition-base);
              margin-bottom: var(--space-2);
              box-shadow: var(--shadow-xs);
              position: relative;
              overflow: hidden;

              &:last-child {
                margin-bottom: 0;
              }

              &:hover {
                background: var(--color-bg-secondary);
                border-color: var(--color-primary-300);
                transform: translateY(-1px);
                box-shadow: var(--shadow-md);
                color: var(--color-primary-700);
              }

              &:active {
                background: var(--color-bg-tertiary);
                transform: translateY(0);
                box-shadow: var(--shadow-xs);
              }

              svg {
                margin-right: var(--space-2);
                transition: color var(--transition-base);
              }
            }
          }
        }

        &.open .mobile-menu {
          transform: translateX(0);
        }
      }

      .mobile-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 64px;
        background: var(--color-bg-primary);
        border-top: 1px solid var(--color-border-fantasy);
        display: flex;
        z-index: var(--z-index-sticky);
        backdrop-filter: blur(12px);
        box-shadow: var(--shadow-xl);

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
          opacity: 0.6;
        }
        padding-bottom: env(safe-area-inset-bottom);

        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--color-text-tertiary);
          text-decoration: none;
          transition: color 0.2s ease;
          position: relative;
          min-height: 64px;

          &.active {
            color: var(--color-primary-700);
            position: relative;

            &::after {
              content: '';
              position: absolute;
              top: 8px;
              left: 50%;
              transform: translateX(-50%);
              width: 4px;
              height: 4px;
              background: var(--color-primary-600);
              border-radius: var(--radius-full);
              box-shadow: 0 0 8px var(--color-primary-400);
            }
          }

          &.disabled {
            opacity: 0.5;
            pointer-events: none;
          }

          .nav-icon {
            width: 24px;
            height: 24px;
            margin-bottom: 4px;
          }

          .nav-label {
            font-family: var(--font-family-body);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-medium);
            line-height: var(--line-height-tight);
          }

          .nav-badge {
            position: absolute;
            top: 8px;
            right: 50%;
            transform: translateX(12px);
            background: linear-gradient(
              135deg,
              var(--color-error-600),
              var(--color-error-700)
            );
            color: white;
            font-family: var(--font-family-body);
            font-size: var(--font-size-xs);
            font-weight: var(--font-weight-semibold);
            padding: var(--space-0-5) var(--space-1-5);
            border-radius: var(--radius-full);
            min-width: 16px;
            text-align: center;
            box-shadow: var(--shadow-sm);
            border: 1px solid rgba(255, 255, 255, 0.3);
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
export class MobileNavigationComponent implements OnInit, OnDestroy {
  @Input() pageTitle = '';
  @Input() pageSubtitle = '';
  @Input() showBackButton = false;
  @Input() navItems: MobileNavItem[] = [];
  @Input() menuItems: MobileNavItem[] = [];
  @Input() headerActions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
  }> = [];
  @Input() menuActions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
  }> = [];

  @Output() backClick = new EventEmitter<void>();
  @Output() actionClick = new EventEmitter<{ id: string; label: string }>();
  @Output() menuActionClick = new EventEmitter<{ id: string; label: string }>();

  currentRoute = '';
  isMenuOpen = false;
  isScrolled = false;
  private destroy$ = new Subject<void>();

  private router = inject(Router);

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  ngOnInit() {
    // Track current route
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.urlAfterRedirects;
      });

    // Set initial route
    this.currentRoute = this.router.url;

    // Track scroll for header shadow
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll() {
    this.isScrolled = window.scrollY > 10;
  }

  /**
   * Performs the on back click operation.
   * @returns The result of the operation.
   */
  onBackClick() {
    this.backClick.emit();
  }

  /**
   * Performs the on action click operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  onActionClick(action: any) {
    this.actionClick.emit(action);
  }

  /**
   * Performs the on menu action click operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  onMenuActionClick(action: any) {
    this.menuActionClick.emit(action);
    this.closeMenu();
  }

  /**
   * Performs the toggle menu operation.
   * @returns The result of the operation.
   */
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;

    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Performs the close menu operation.
   * @returns The result of the operation.
   */
  closeMenu() {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * Performs the on menu item click operation.
   * @param item - The item.
   * @returns The result of the operation.
   */
  onMenuItemClick(item: MobileNavItem) {
    if (!item.disabled) {
      this.closeMenu();
    }
  }
}
