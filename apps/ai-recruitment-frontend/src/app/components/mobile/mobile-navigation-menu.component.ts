import type { OnInit } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import type { MobileNavItem } from './mobile-navigation.component';
import { MobileNavigationRouteService } from './mobile-navigation-route.service';

/**
 * Mobile side menu component.
 * Extracted from MobileNavigationComponent for better separation of concerns.
 */
@Component({
  selector: 'arc-mobile-navigation-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="mobile-menu-overlay"
      [class.open]="isOpen"
      (click)="close.emit()"
      (keydown.enter)="close.emit()"
      (keydown.space)="close.emit()"
      [attr.aria-hidden]="!isOpen"
      tabindex="0"
      role="button"
    >
      <nav
        class="mobile-menu"
        (click)="$event.stopPropagation()"
        (keydown.enter)="$event.stopPropagation()"
        (keydown.space)="$event.stopPropagation()"
        role="navigation"
      >
        <div class="menu-header">
          <h2>Menu</h2>
          <button
            class="menu-close"
            (click)="close.emit()"
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
              [class.active]="isActive(item.route)"
              [class.disabled]="item.disabled"
              (click)="onItemClick(item)"
              role="menuitem"
              [attr.aria-current]="isActive(item.route) ? 'page' : null"
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
            (click)="onActionClick(action)"
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
  `,
  styles: [
    `
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
    `,
  ],
})
export class MobileNavigationMenuComponent implements OnInit {
  @Input() public isOpen = false;
  @Input() public menuItems: MobileNavItem[] = [];
  @Input()
  public menuActions: Array<{
    id: string;
    label: string;
    icon?: string;
    action: () => void;
    disabled?: boolean;
  }> = [];

  @Output() public close = new EventEmitter<void>();
  @Output() public itemClick = new EventEmitter<MobileNavItem>();
  @Output() public actionClick = new EventEmitter<{
    id: string;
    label: string;
  }>();

  private readonly routeService = inject(MobileNavigationRouteService);

  public ngOnInit(): void {
    // Route tracking is initialized by parent component
  }

  /**
   * Check if a route is currently active.
   */
  public isActive(route: string): boolean {
    return this.routeService.isRouteActive(route);
  }

  /**
   * Handle menu item click.
   */
  public onItemClick(item: MobileNavItem): void {
    if (!item.disabled) {
      this.itemClick.emit(item);
      this.close.emit();
    }
  }

  /**
   * Handle menu action button click.
   */
  public onActionClick(action: {
    id: string;
    label: string;
    icon?: string;
    action: () => void;
  }): void {
    this.actionClick.emit({ id: action.id, label: action.label });
    this.close.emit();
  }
}
