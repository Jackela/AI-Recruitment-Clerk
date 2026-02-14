import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import type { MobileNavItem } from './mobile-navigation.component';

/**
 * Mobile bottom navigation bar component.
 * Displays navigation items as a fixed bottom bar with active state indication.
 */
@Component({
  selector: 'arc-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="mobile-bottom-nav" [attr.aria-label]="'Main navigation'">
      <a
        *ngFor="let item of navItems"
        [routerLink]="item.route"
        class="nav-item"
        [class.active]="isActive(item.route)"
        [class.disabled]="item.disabled"
        [attr.aria-current]="isActive(item.route) ? 'page' : null"
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
export class MobileBottomNavComponent {
  /**
   * Navigation items to display in the bottom bar.
   */
  @Input() public navItems: MobileNavItem[] = [];

  /**
   * Function to check if a route is active.
   * Passed from parent component that has access to route service.
   */
  @Input() public isActive: (route: string) => boolean = () => false;
}
