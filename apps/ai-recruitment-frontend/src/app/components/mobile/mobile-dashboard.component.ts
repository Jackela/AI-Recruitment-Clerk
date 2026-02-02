import type {
  OnInit,
  OnDestroy} from '@angular/core';
import {
  Component,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import type {
  MobileNavItem} from './mobile-navigation.component';
import {
  MobileNavigationComponent
} from './mobile-navigation.component';
import type {
  SwipeAction,
  SwipeEvent} from './mobile-swipe.component';
import {
  MobileSwipeComponent
} from './mobile-swipe.component';
import { TouchGestureService } from '../../services/mobile/touch-gesture.service';

/**
 * Defines the shape of the dashboard card.
 */
export interface DashboardCard {
  id: string;
  title: string;
  subtitle?: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  route?: string;
  actions?: SwipeAction[];
  priority: 'high' | 'medium' | 'low';
  size: 'small' | 'medium' | 'large';
}

/**
 * Defines the shape of the quick action.
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  route: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
  badge?: number;
}

/**
 * Represents the mobile dashboard component.
 */
@Component({
  selector: 'arc-mobile-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MobileNavigationComponent,
    MobileSwipeComponent,
  ],
  template: `
    <!-- Mobile Navigation -->
    <arc-mobile-navigation
      [pageTitle]="pageTitle"
      [pageSubtitle]="pageSubtitle"
      [navItems]="navItems"
      [menuItems]="menuItems"
      [headerActions]="headerActions"
      (actionClick)="onHeaderAction($event)"
    >
    </arc-mobile-navigation>

    <!-- Dashboard Content -->
    <div class="mobile-dashboard-content">
      <!-- Pull to Refresh Indicator -->
      <div
        class="pull-refresh-indicator"
        [class.visible]="isPullRefreshVisible"
        [class.loading]="isRefreshing"
      >
        <div class="refresh-spinner"></div>
        <span class="refresh-text">{{
          isRefreshing ? 'Refreshing...' : 'Pull to refresh'
        }}</span>
      </div>

      <!-- Quick Actions Bar -->
      <div class="quick-actions-bar" *ngIf="quickActions.length > 0">
        <div class="quick-actions-scroll" #quickActionsContainer>
          <button
            *ngFor="let action of quickActions"
            class="quick-action"
            [class]="'quick-action--' + action.color"
            [routerLink]="action.route"
            [attr.aria-label]="action.label"
          >
            <div class="action-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path [attr.d]="action.icon" />
              </svg>
              <span class="action-badge" *ngIf="action.badge">{{
                action.badge
              }}</span>
            </div>
            <span class="action-label">{{ action.label }}</span>
          </button>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-overview" *ngIf="overviewStats.length > 0">
        <h2 class="section-title">Overview</h2>
        <div class="stats-grid">
          <div
            *ngFor="let stat of overviewStats"
            class="stat-card"
            [class]="'stat-card--' + stat.color"
          >
            <div class="stat-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path [attr.d]="stat.icon" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.title }}</div>
              <div class="stat-change" *ngIf="stat.change">
                <span
                  class="change-indicator"
                  [class]="'change-' + stat.change.type"
                >
                  {{ stat.change.type === 'increase' ? '↗' : '↘' }}
                  {{ Math.abs(stat.change.value) }}%
                </span>
                <span class="change-period">{{ stat.change.period }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Cards -->
      <div class="dashboard-cards" *ngIf="dashboardCards.length > 0">
        <h2 class="section-title">Dashboard</h2>
        <div class="cards-container" #dashboardContainer>
          <app-mobile-swipe
            *ngFor="let card of dashboardCards"
            [actions]="card.actions || []"
            [item]="card"
            (swipeAction)="onCardSwipe($event)"
          >
            <div
              class="dashboard-card"
              [class]="
                'dashboard-card--' +
                card.size +
                ' dashboard-card--' +
                card.color
              "
              [class.interactive]="!!card.route"
              [routerLink]="card.route"
              (click)="onCardClick(card)"
            (keydown.enter)="onCardClick(card)"
            (keydown.space)="onCardClick(card)"
            [attr.tabindex]="card.route ? 0 : null"
            >
              <div class="card-header">
                <div class="card-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path [attr.d]="card.icon" />
                  </svg>
                </div>
                <div
                  class="card-priority"
                  [class]="'priority--' + card.priority"
                ></div>
              </div>

              <div class="card-content">
                <h3 class="card-title">{{ card.title }}</h3>
                <p class="card-subtitle" *ngIf="card.subtitle">
                  {{ card.subtitle }}
                </p>
                <div class="card-value">{{ card.value }}</div>
                <div class="card-change" *ngIf="card.change">
                  <span
                    class="change-indicator"
                    [class]="'change-' + card.change.type"
                  >
                    {{ card.change.type === 'increase' ? '↗' : '↘' }}
                    {{ Math.abs(card.change.value) }}%
                  </span>
                  <span class="change-period">vs {{ card.change.period }}</span>
                </div>
              </div>
            </div>
          </app-mobile-swipe>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="recent-activity" *ngIf="recentActivity.length > 0">
        <h2 class="section-title">Recent Activity</h2>
        <div class="activity-list">
          <div
            *ngFor="let activity of recentActivity"
            class="activity-item"
            (click)="onActivityClick(activity)"
            (keydown.enter)="onActivityClick(activity)"
            (keydown.space)="onActivityClick(activity)"
            tabindex="0"
            role="button"
          >
            <div
              class="activity-icon"
              [class]="'activity-icon--' + activity.type"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path [attr.d]="activity.icon" />
              </svg>
            </div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-subtitle">{{ activity.subtitle }}</div>
              <div class="activity-time">{{ activity.timeAgo }}</div>
            </div>
            <div class="activity-action">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button -->
    <button
      class="mobile-fab"
      [attr.aria-label]="fabAction.label"
      (click)="onFabClick()"
      (keydown.enter)="onFabClick()"
      (keydown.space)="onFabClick()"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path [attr.d]="fabAction.icon" />
      </svg>
    </button>
  `,
  styles: [
    `
      .mobile-dashboard-content {
        padding: calc(var(--spacing-16, 4rem) + var(--spacing-2, 0.5rem))
          var(--spacing-4, 1rem) var(--spacing-20, 5rem);
        min-height: 100vh;
        background: var(--color-background, #f8f9fa);
      }

      .pull-refresh-indicator {
        position: fixed;
        top: calc(var(--spacing-14, 3.5rem) + var(--spacing-2, 0.5rem));
        left: 50%;
        transform: translateX(-50%) translateY(-100%);
        background: var(--color-surface, white);
        border-radius: var(--border-radius-xl, 20px);
        padding: var(--spacing-3, 0.75rem) var(--spacing-5, 1.25rem);
        box-shadow: var(--shadow-lg, 0 4px 12px rgba(0, 0, 0, 0.15));
        display: flex;
        align-items: center;
        gap: var(--spacing-2, 0.5rem);
        z-index: 500;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.8);

        &.visible {
          transform: translateX(-50%) translateY(10px);
        }

        &.loading {
          pointer-events: none;

          .refresh-spinner {
            animation-duration: 0.8s; // Slower, more pleasant animation
          }
        }

        // Enhanced mobile safe area support
        @supports (top: env(safe-area-inset-top)) {
          top: calc(56px + env(safe-area-inset-top));
        }

        .refresh-spinner {
          width: var(--spacing-4, 1rem);
          height: var(--spacing-4, 1rem);
          border: 2px solid var(--color-border, #e9ecef);
          border-top: 2px solid var(--color-primary, #3498db);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          will-change: transform;

          // Respect reduced motion preferences
          @media (prefers-reduced-motion: reduce) {
            animation-duration: 2s;
          }
        }

        .refresh-text {
          font-size: 12px;
          color: #6c757d;
          font-weight: 500;
          user-select: none;
          pointer-events: none;
        }
      }

      .quick-actions-bar {
        margin-bottom: var(--spacing-6, 1.5rem);

        .quick-actions-scroll {
          display: flex;
          gap: var(--spacing-3, 0.75rem);
          overflow-x: auto;
          padding: var(--spacing-1, 0.25rem) 0 var(--spacing-2, 0.5rem);
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;

          &::-webkit-scrollbar {
            display: none;
          }

          .quick-action {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--spacing-2, 0.5rem);
            padding: var(--spacing-3, 0.75rem);
            border: none;
            border-radius: var(--border-radius-lg, 12px);
            background: var(--color-surface, white);
            color: var(--color-text, #495057);
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: calc(var(--spacing-16, 4rem) + var(--spacing-2, 0.5rem));
            flex-shrink: 0;
            box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

            &:active {
              transform: scale(0.96);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .action-icon {
              position: relative;
              width: var(--spacing-10, 2.5rem);
              height: var(--spacing-10, 2.5rem);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;

              .action-badge {
                position: absolute;
                top: calc(-1 * var(--spacing-1, 0.25rem));
                right: calc(-1 * var(--spacing-1, 0.25rem));
                background: var(--color-error, #e74c3c);
                color: white;
                font-size: 0.625rem;
                font-weight: 600;
                padding: var(--spacing-1, 0.25rem) var(--spacing-2, 0.5rem);
                border-radius: var(--border-radius-full, 10px);
                min-width: var(--spacing-4, 1rem);
                text-align: center;
              }
            }

            .action-label {
              font-size: 11px;
              font-weight: 500;
              text-align: center;
              line-height: 1.2;
            }

            &--primary {
              .action-icon {
                background: rgba(52, 152, 219, 0.1);
                color: #3498db;
              }
            }

            &--success {
              .action-icon {
                background: rgba(40, 167, 69, 0.1);
                color: #28a745;
              }
            }

            &--warning {
              .action-icon {
                background: rgba(255, 193, 7, 0.1);
                color: #ffc107;
              }
            }

            &--danger {
              .action-icon {
                background: rgba(231, 76, 60, 0.1);
                color: #e74c3c;
              }
            }
          }
        }
      }

      .section-title {
        font-size: 20px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 16px 0;
      }

      .stats-overview {
        margin-bottom: var(--spacing-6, 1.5rem);

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-3, 0.75rem);

          .stat-card {
            background: var(--color-surface, white);
            border-radius: var(--border-radius-lg, 12px);
            padding: var(--spacing-4, 1rem);
            display: flex;
            align-items: center;
            gap: var(--spacing-3, 0.75rem);
            box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

            .stat-icon {
              width: var(--spacing-9, 2.25rem);
              height: var(--spacing-9, 2.25rem);
              border-radius: var(--border-radius-md, 8px);
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }

            .stat-content {
              flex: 1;
              min-width: 0;

              .stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #2c3e50;
                line-height: 1.2;
              }

              .stat-label {
                font-size: 12px;
                color: #6c757d;
                font-weight: 500;
                margin-top: 2px;
              }

              .stat-change {
                display: flex;
                align-items: center;
                gap: var(--spacing-1, 0.25rem);
                margin-top: var(--spacing-1, 0.25rem);

                .change-indicator {
                  font-size: 0.6875rem;
                  font-weight: 600;
                  padding: var(--spacing-1, 0.25rem) var(--spacing-1, 0.25rem);
                  border-radius: var(--border-radius-sm, 4px);

                  &.change-increase {
                    background: rgba(40, 167, 69, 0.1);
                    color: #28a745;
                  }

                  &.change-decrease {
                    background: rgba(231, 76, 60, 0.1);
                    color: #e74c3c;
                  }
                }

                .change-period {
                  font-size: 10px;
                  color: #95a5a6;
                }
              }
            }

            &--primary .stat-icon {
              background: rgba(52, 152, 219, 0.1);
              color: #3498db;
            }

            &--success .stat-icon {
              background: rgba(40, 167, 69, 0.1);
              color: #28a745;
            }

            &--warning .stat-icon {
              background: rgba(255, 193, 7, 0.1);
              color: #ffc107;
            }

            &--danger .stat-icon {
              background: rgba(231, 76, 60, 0.1);
              color: #e74c3c;
            }
          }
        }
      }

      .dashboard-cards {
        margin-bottom: var(--spacing-6, 1.5rem);

        .cards-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-3, 0.75rem);

          .dashboard-card {
            background: var(--color-surface, white);
            border-radius: var(--border-radius-lg, 12px);
            padding: var(--spacing-4, 1rem);
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));
            text-decoration: none;
            color: inherit;
            position: relative;
            overflow: hidden;

            &.interactive:active {
              transform: scale(0.98);
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }

            .card-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: var(--spacing-3, 0.75rem);

              .card-icon {
                width: var(--spacing-10, 2.5rem);
                height: var(--spacing-10, 2.5rem);
                border-radius: var(--border-radius-md, 8px);
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--color-background, #f8f9fa);
                color: var(--color-text-secondary, #6c757d);
              }

              .card-priority {
                width: var(--spacing-2, 0.5rem);
                height: var(--spacing-2, 0.5rem);
                border-radius: 50%;

                &.priority--high {
                  background: #e74c3c;
                }

                &.priority--medium {
                  background: #f39c12;
                }

                &.priority--low {
                  background: #95a5a6;
                }
              }
            }

            .card-content {
              .card-title {
                font-size: 16px;
                font-weight: 600;
                color: #2c3e50;
                margin: 0 0 4px 0;
                line-height: 1.3;
              }

              .card-subtitle {
                font-size: 12px;
                color: #6c757d;
                margin: 0 0 8px 0;
                line-height: 1.4;
              }

              .card-value {
                font-size: 24px;
                font-weight: 700;
                color: #2c3e50;
                margin-bottom: 8px;
                line-height: 1.2;
              }

              .card-change {
                display: flex;
                align-items: center;
                gap: var(--spacing-2, 0.5rem);

                .change-indicator {
                  font-size: 0.75rem;
                  font-weight: 600;
                  padding: var(--spacing-1, 0.25rem) var(--spacing-2, 0.5rem);
                  border-radius: var(--border-radius-sm, 4px);

                  &.change-increase {
                    background: rgba(40, 167, 69, 0.1);
                    color: #28a745;
                  }

                  &.change-decrease {
                    background: rgba(231, 76, 60, 0.1);
                    color: #e74c3c;
                  }
                }

                .change-period {
                  font-size: 11px;
                  color: #95a5a6;
                }
              }
            }

            &--large {
              grid-column: span 2;
            }

            &--primary {
              .card-header .card-icon {
                background: rgba(52, 152, 219, 0.1);
                color: #3498db;
              }
            }

            &--success {
              .card-header .card-icon {
                background: rgba(40, 167, 69, 0.1);
                color: #28a745;
              }
            }

            &--warning {
              .card-header .card-icon {
                background: rgba(255, 193, 7, 0.1);
                color: #ffc107;
              }
            }

            &--danger {
              .card-header .card-icon {
                background: rgba(231, 76, 60, 0.1);
                color: #e74c3c;
              }
            }
          }
        }
      }

      .recent-activity {
        .activity-list {
          background: var(--color-surface, white);
          border-radius: var(--border-radius-lg, 12px);
          overflow: hidden;
          box-shadow: var(--shadow-sm, 0 2px 4px rgba(0, 0, 0, 0.06));

          .activity-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            border-bottom: 1px solid #f1f3f4;
            cursor: pointer;
            transition: background-color 0.2s ease;

            &:last-child {
              border-bottom: none;
            }

            &:active {
              background-color: #f8f9fa;
            }

            .activity-icon {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;

              &--success {
                background: rgba(40, 167, 69, 0.1);
                color: #28a745;
              }

              &--info {
                background: rgba(52, 152, 219, 0.1);
                color: #3498db;
              }

              &--warning {
                background: rgba(255, 193, 7, 0.1);
                color: #ffc107;
              }
            }

            .activity-content {
              flex: 1;
              min-width: 0;

              .activity-title {
                font-size: 14px;
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 2px;
              }

              .activity-subtitle {
                font-size: 12px;
                color: #6c757d;
                margin-bottom: 2px;
              }

              .activity-time {
                font-size: 11px;
                color: #95a5a6;
              }
            }

            .activity-action {
              color: #95a5a6;
              flex-shrink: 0;
            }
          }
        }
      }

      .mobile-fab {
        position: fixed;
        bottom: 80px;
        right: 16px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #3498db;
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 999;

        &:active {
          transform: scale(0.9);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.6);
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      @media (min-width: 768px) {
        .mobile-dashboard-content {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-cards .cards-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .stats-overview .stats-grid {
          grid-template-columns: repeat(4, 1fr);
        }

        .mobile-fab {
          display: none;
        }
      }
    `,
  ],
})
export class MobileDashboardComponent implements OnInit, OnDestroy {
  // 多代理修复: 模板中需要访问Math对象
  protected readonly Math = Math;
  public pageTitle = 'Dashboard';
  public pageSubtitle = 'Recruitment insights at a glance';

  private destroy$ = new Subject<void>();

  // Navigation
  public navItems: MobileNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'M3,13H11V3H3M3,21H11V15H3M13,21H21V11H13M13,3V9H21V3',
      route: '/dashboard',
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z',
      route: '/resume/upload',
    },
    {
      id: 'jobs',
      label: 'Jobs',
      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
      route: '/jobs',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: 'M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z',
      route: '/reports',
    },
  ];

  public menuItems: MobileNavItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11.03L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11.03C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z',
      route: '/settings',
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'M11,18H13V16H11V18M12,6A4,4 0 0,0 8,10H10A2,2 0 0,1 12,8A2,2 0 0,1 14,10C14,12 11,11.75 11,15H13C13,12.75 16,12.5 16,10A4,4 0 0,0 12,6Z',
      route: '/help',
    },
  ];

  public headerActions = [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,21A1.5,1.5 0 0,0 9,19.5H15A1.5,1.5 0 0,0 16.5,21A1.5,1.5 0 0,0 15,22.5H9A1.5,1.5 0 0,0 7.5,21Z',
      badge: 3,
    },
  ];

  // Quick Actions
  public quickActions: QuickAction[] = [
    {
      id: 'upload',
      label: 'Upload Resume',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
      route: '/resume/upload',
      color: 'primary',
    },
    {
      id: 'create-job',
      label: 'Create Job',
      icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
      route: '/jobs/create',
      color: 'success',
    },
    {
      id: 'candidates',
      label: 'Candidates',
      icon: 'M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4M16,13.4C18.39,13.4 22.2,14.6 22.2,17V19.2H9.8V17C9.8,14.6 13.61,13.4 16,13.4Z',
      route: '/candidates',
      color: 'warning',
      badge: 12,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'M22,21H2V3H4V19H6V17H10V19H12V16H16V19H18V17H22V21Z',
      route: '/analytics',
      color: 'danger',
    },
  ];

  // Overview Stats
  public overviewStats: DashboardCard[] = [
    {
      id: 'total-resumes',
      title: 'Total Resumes',
      value: 147,
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
      color: 'primary',
      change: { value: 12, type: 'increase', period: 'this week' },
      priority: 'high',
      size: 'small',
    },
    {
      id: 'active-jobs',
      title: 'Active Jobs',
      value: 8,
      icon: 'M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22S19,14.25 19,9A7,7 0 0,0 12,2Z',
      color: 'success',
      priority: 'high',
      size: 'small',
    },
    {
      id: 'pending-reviews',
      title: 'Pending Reviews',
      value: 23,
      icon: 'M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
      color: 'warning',
      priority: 'medium',
      size: 'small',
    },
    {
      id: 'hired-candidates',
      title: 'Hired This Month',
      value: 5,
      icon: 'M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A7,7 0 0,1 20,14V16A1,1 0 0,0 21,17H22V19H2V17H3A1,1 0 0,0 4,16V14A7,7 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2Z',
      color: 'success',
      change: { value: 25, type: 'increase', period: 'vs last month' },
      priority: 'high',
      size: 'small',
    },
  ];

  // Dashboard Cards
  public dashboardCards: DashboardCard[] = [
    {
      id: 'recent-uploads',
      title: 'Recent Uploads',
      subtitle: 'Latest resume submissions',
      value: '12 new',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
      color: 'primary',
      route: '/uploads/recent',
      priority: 'high',
      size: 'medium',
      actions: [
        {
          id: 'view',
          label: 'View',
          icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17Z',
          color: 'primary',
          width: 80,
        },
        {
          id: 'process',
          label: 'Process',
          icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
          color: 'success',
          width: 80,
        },
      ],
    },
    {
      id: 'top-matches',
      title: 'Top Matches',
      subtitle: 'Candidates with highest scores',
      value: '8 candidates',
      icon: 'M16,4C18.11,4 19.8,5.69 19.8,7.8C19.8,9.91 18.11,11.6 16,11.6C13.89,11.6 12.2,9.91 12.2,7.8C12.2,5.69 13.89,4 16,4Z',
      color: 'success',
      route: '/matches/top',
      priority: 'high',
      size: 'medium',
      actions: [
        {
          id: 'review',
          label: 'Review',
          icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z',
          color: 'primary',
          width: 80,
        },
        {
          id: 'shortlist',
          label: 'Shortlist',
          icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
          color: 'success',
          width: 80,
        },
      ],
    },
  ];

  // Recent Activity
  public recentActivity = [
    {
      id: '1',
      title: 'New resume uploaded',
      subtitle: 'Senior Developer position',
      timeAgo: '2 minutes ago',
      type: 'success',
      icon: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2Z',
    },
    {
      id: '2',
      title: 'Analysis completed',
      subtitle: 'Marketing Manager - 3 candidates',
      timeAgo: '15 minutes ago',
      type: 'info',
      icon: 'M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z',
    },
    {
      id: '3',
      title: 'Job posting expires soon',
      subtitle: 'Frontend Developer - 2 days left',
      timeAgo: '1 hour ago',
      type: 'warning',
      icon: 'M13,14H11V10H13M13,18H11V16H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z',
    },
  ];

  // FAB Action
  public fabAction = {
    label: 'Upload Resume',
    icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
  };

  // Enhanced state management for pull-to-refresh
  public isPullRefreshVisible = false;
  public isRefreshing = false;

  @ViewChild('dashboardContainer', { read: ElementRef })
  public dashboardContainer!: ElementRef;
  @ViewChild('quickActionsContainer', { read: ElementRef })
  public quickActionsContainer!: ElementRef;

  private readonly _touchGesture = inject(TouchGestureService);

  /**
   * Initializes a new instance of the Mobile Dashboard Component.
   */
  constructor() {
    // TouchGesture service will be used for future gesture implementations
    // Prevent unused warning
    void this._touchGesture;
  }

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  public ngOnInit(): void {
    this.setupPullToRefresh();
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupPullToRefresh(): void {
    let startY = 0;
    let startX = 0;
    let currentY = 0;
    let currentX = 0;
    let isScrollAtTop = true;
    let isPulling = false;
    let touchIdentifier: number | null = null;

    const handleTouchStart = (e: TouchEvent): void => {
      // Only handle single touch
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      touchIdentifier = touch.identifier;
      startY = touch.clientY;
      startX = touch.clientX;
      currentY = startY;
      currentX = startX;
      isScrollAtTop = window.scrollY === 0;
      isPulling = false;
    };

    const handleTouchMove = (e: TouchEvent): void => {
      if (!isScrollAtTop || touchIdentifier === null) return;

      // Find the correct touch by identifier
      let targetTouch: Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          targetTouch = e.touches[i];
          break;
        }
      }

      if (!targetTouch) return;

      currentY = targetTouch.clientY;
      currentX = targetTouch.clientX;
      const deltaY = currentY - startY;
      const deltaX = Math.abs(currentX - startX);

      // Enhanced gesture detection
      const isVerticalPull = deltaY > 0;
      const isHorizontalScroll = deltaX > 30;
      const isPrimaryVertical = Math.abs(deltaY) > deltaX * 1.5;

      // Only handle clear downward vertical gestures
      if (isVerticalPull && !isHorizontalScroll && isPrimaryVertical) {
        isPulling = true;

        if (deltaY > 20 && deltaY < 100) {
          this.isPullRefreshVisible = true;
        } else if (deltaY >= 100) {
          this.isPullRefreshVisible = true;

          // Haptic feedback for strong pull
          if ('vibrate' in navigator) {
            navigator.vibrate(50);
          }

          // Only prevent default for confirmed pull-to-refresh gestures
          if (deltaY > deltaX * 2) {
            e.preventDefault();
          }
        }
      } else if (isHorizontalScroll || !isPrimaryVertical) {
        // Reset pull state for horizontal or diagonal gestures
        this.isPullRefreshVisible = false;
        isPulling = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (!isScrollAtTop || touchIdentifier === null) {
        this.resetPullState();
        return;
      }

      // Check if our tracked touch ended
      let touchEnded = true;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdentifier) {
          touchEnded = false;
          break;
        }
      }

      if (touchEnded) {
        const deltaY = currentY - startY;
        const deltaX = Math.abs(currentX - startX);

        // Only trigger refresh for clear vertical pulls
        if (isPulling && deltaY >= 100 && deltaX < 50) {
          this.triggerRefresh();
        } else {
          this.resetPullState();
        }

        touchIdentifier = null;
      }
    };

    const handleTouchCancel = (_e: TouchEvent): void => {
      this.resetPullState();
      touchIdentifier = null;
    };

    // Use passive listeners where possible, non-passive only for touchmove when needed
    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, {
      passive: true,
    });

    // Cleanup function for proper event listener removal
    this.destroy$.subscribe(() => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    });
  }

  private resetPullState(): void {
    this.isPullRefreshVisible = false;
  }

  private triggerRefresh(): void {
    if (this.isRefreshing) return; // Prevent multiple simultaneous refreshes

    this.isRefreshing = true;

    // Enhanced haptic feedback sequence
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]); // Shorter, more subtle feedback
    }

    // Simulate refresh with realistic timing
    setTimeout(() => {
      this.isRefreshing = false;
      this.resetPullState();

      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([20, 20, 20, 20]); // Success pattern
      }

      // TODO: Refresh dashboard data
      // TODO: Show success notification
    }, 1500); // Reduced from 2000ms for better UX
  }

  /**
   * Performs the on header action operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  public onHeaderAction(action: {
    id: string;
    label: string;
    icon: string;
    badge?: number;
  }): void {
    // Handle header actions (notifications, etc.)
    switch (action.id) {
      case 'notifications':
        // Handle notifications
        break;
      default:
        // Handle other actions
        break;
    }
  }

  /**
   * Performs the on card click operation.
   * @param card - The card.
   * @returns The result of the operation.
   */
  public onCardClick(card: DashboardCard): void {
    if (card.route) {
      // Router navigation handled by routerLink
      // Optional: Analytics tracking here
    }
  }

  /**
   * Performs the on card swipe operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  public onCardSwipe(event: SwipeEvent): void {
    // Handle swipe actions based on event.action
    switch (event.action.id) {
      case 'view':
        // Handle view action
        break;
      case 'process':
        // Handle process action
        break;
      case 'review':
        // Handle review action
        break;
      case 'shortlist':
        // Handle shortlist action
        break;
      default:
        // Handle other actions
        break;
    }
  }

  /**
   * Performs the on activity click operation.
   * @param activity - The activity.
   * @returns The result of the operation.
   */
  public onActivityClick(activity: {
    id: string;
    title: string;
    subtitle: string;
    timeAgo: string;
    type: string;
    icon: string;
  }): void {
    // Navigate to activity details based on activity type
    switch (activity.type) {
      case 'success':
      case 'info':
      case 'warning':
        // Navigate to specific activity detail page
        break;
      default:
        // Handle unknown activity types
        break;
    }
  }

  /**
   * Performs the on fab click operation.
   * @returns The result of the operation.
   */
  public onFabClick(): void {
    // Navigate to upload page
    // This could use Router.navigate() for programmatic navigation
  }
}
