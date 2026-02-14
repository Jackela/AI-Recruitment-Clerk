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
import { Subject } from 'rxjs';

import { MobileNavigationMenuComponent } from './mobile-navigation-menu.component';
import { MobileNavigationRouteService } from './mobile-navigation-route.service';
import {
  MobileNavigationHeaderComponent,
  type HeaderAction,
} from './mobile-navigation-header.component';

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
  imports: [
    CommonModule,
    RouterModule,
    MobileNavigationMenuComponent,
    MobileNavigationHeaderComponent,
  ],
  template: `
    <!-- Mobile Header (delegated to child component) -->
    <arc-mobile-navigation-header
      [pageTitle]="pageTitle"
      [pageSubtitle]="pageSubtitle"
      [showBackButton]="showBackButton"
      [isScrolled]="routeService.isScrolled"
      [isMenuOpen]="isMenuOpen"
      [headerActions]="headerActions"
      (backClick)="onBackClick()"
      (actionClick)="onHeaderActionClick($event)"
      (menuToggle)="toggleMenu()"
    />

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
  public headerActions: HeaderAction[] = [];
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
   * Performs on header action click operation.
   */
  public onHeaderActionClick(action: HeaderAction): void {
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
  public onMenuItemClick(_item: MobileNavItem): void {
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
