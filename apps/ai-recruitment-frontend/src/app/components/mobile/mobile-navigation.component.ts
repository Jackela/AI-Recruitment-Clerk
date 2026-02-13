import type { OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { MobileNavigationMenuComponent } from './mobile-navigation-menu.component';
import { MobileNavigationRouteService } from './mobile-navigation-route.service';

/**
 * Defines the shape of a mobile navigation item.
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
 * Serves as an orchestrator that delegates route tracking to MobileNavigationRouteService
 * and menu rendering to MobileNavigationMenuComponent.
 */
@Component({
  selector: 'arc-mobile-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule, MobileNavigationMenuComponent],
  template: `
    <!-- Mobile Header -->
    <header class="mobile-header" [class.scrolled]="routeService.isScrolled">
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

    <!-- Mobile Menu (delegated to child component) -->
    <arc-mobile-navigation-menu
      [isOpen]="isMenuOpen"
      [menuItems]="menuItems"
      [menuActions]="menuActions"
      (close)="closeMenu()"
      (itemClick)="onMenuItemClick($event)"
      (actionClick)="onMenuActionClick($event)"
    />

    <!-- Bottom Navigation -->
    <nav class="mobile-bottom-nav" [attr.aria-label]="'Main navigation'">
      <a
        *ngFor="let item of navItems"
        [routerLink]="item.route"
        class="nav-item"
        [class.active]="routeService.isRouteActive(item.route)"
        [class.disabled]="item.disabled"
        [attr.aria-current]="
          routeService.isRouteActive(item.route) ? 'page' : null
        "
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
  @Input() public pageTitle = '';
  @Input() public pageSubtitle = '';
  @Input() public showBackButton = false;
  @Input() public navItems: MobileNavItem[] = [];
  @Input() public menuItems: MobileNavItem[] = [];
  @Input()
  public headerActions: Array<{
    id: string;
    label: string;
    icon?: string;
    badge?: number;
    disabled?: boolean;
  }> = [];
  @Input()
  public menuActions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
  }> = [];

  @Output() public backClick = new EventEmitter<void>();
  @Output() public actionClick = new EventEmitter<{
    id: string;
    label: string;
  }>();
  @Output() public menuActionClick = new EventEmitter<{
    id: string;
    label: string;
  }>();

  public isMenuOpen = false;
  private readonly destroy$ = new Subject<void>();

  public routeService = inject(MobileNavigationRouteService);

  /**
   * Performs ng on init operation.
   */
  public ngOnInit(): void {
    this.routeService.initialize();
  }

  /**
   * Performs ng on destroy operation.
   */
  public ngOnDestroy(): void {
    this.routeService.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Performs on back click operation.
   */
  public onBackClick(): void {
    this.backClick.emit();
  }

  /**
   * Performs on action click operation.
   */
  public onActionClick(action: {
    id: string;
    label: string;
    icon?: string;
    badge?: number;
    disabled?: boolean;
  }): void {
    this.actionClick.emit({ id: action.id, label: action.label });
  }

  /**
   * Performs on menu action click operation.
   */
  public onMenuActionClick(action: { id: string; label: string }): void {
    this.menuActionClick.emit(action);
  }

  /**
   * Performs on menu item click operation.
   */
  public onMenuItemClick(item: MobileNavItem): void {
    // Menu closing is handled by the child component
  }

  /**
   * Performs toggle menu operation.
   */
  public toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;

    // Prevent body scroll when menu is open
    if (this.isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Performs close menu operation.
   */
  public closeMenu(): void {
    this.isMenuOpen = false;
    document.body.style.overflow = '';
  }
}
