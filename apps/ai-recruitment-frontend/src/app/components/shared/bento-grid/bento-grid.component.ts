import type {
  OnInit,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  TrackByFunction,
  TemplateRef} from '@angular/core';
import {
  Component,
  Input,
  ViewChild,
  inject,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessibleCardDirective } from '../../../directives/accessibility/accessible-card.directive';
import { AccessibilityService } from '../../../services/accessibility/accessibility.service';
import { Subject } from 'rxjs';

/**
 * Defines the shape of the bento grid item.
 */
export interface BentoGridItem {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  value?: string | number;
  icon?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'error';
  size?: 'small' | 'medium' | 'large' | 'wide' | 'tall' | 'feature';
  clickable?: boolean;
  badge?: string;
  trend?: {
    type: 'up' | 'down' | 'neutral';
    value: string;
    period?: string;
  };
  action?: {
    text: string;
    onClick: () => void;
  };
  customTemplate?: TemplateRef<unknown>;
}

/**
 * Represents the bento grid component.
 */
@Component({
  selector: 'arc-bento-grid',
  standalone: true,
  imports: [CommonModule, AccessibleCardDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bento-grid"
      [class]="'bento-grid-' + gridSize"
      [style.grid-template-columns]="dynamicColumns"
      [attr.role]="'grid'"
      [attr.aria-label]="ariaLabel"
      #gridContainer
    >
      <div
        *ngFor="let item of items; trackBy: trackByItemId"
        class="bento-item"
        [class]="getItemClasses(item)"
        arcAccessibleCard
        [cardTitle]="item.title"
        [cardDescription]="item.subtitle"
        [cardValue]="item.value"
        [cardType]="'dashboard-card'"
        [cardState]="getCardState(item)"
        [cardClickable]="item.clickable || false"
        [cardShortcuts]="getCardShortcuts(item)"
        [cardInstructions]="getCardInstructions(item)"
        [attr.role]="'gridcell'"
        [attr.aria-label]="getItemAriaLabel(item)"
        [attr.tabindex]="item.clickable ? '0' : null"
        [attr.aria-describedby]="item.subtitle ? 'desc-' + item.id : null"
        [attr.aria-live]="item.value !== undefined ? 'polite' : null"
        (click)="onItemClick(item)"
        (keydown.enter)="onItemClick(item)"
        (keydown.space)="onItemClick(item)"
        (focus)="onItemFocus(item)"
        (blur)="onItemBlur(item)"
      >
        <!-- Default Card Layout -->
        <ng-container *ngIf="!item.customTemplate">
          <!-- Header with Icon and Badge -->
          <div class="bento-header" *ngIf="item.icon || item.badge">
            <div
              class="bento-icon"
              *ngIf="item.icon"
              [attr.aria-hidden]="'true'"
            >
              <ng-container [ngSwitch]="item.icon">
                <!-- Dashboard Icons -->
                <svg
                  *ngSwitchCase="'dashboard'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>

                <!-- Jobs Icon -->
                <svg
                  *ngSwitchCase="'jobs'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>

                <!-- Resumes Icon -->
                <svg
                  *ngSwitchCase="'resumes'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  ></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>

                <!-- Reports Icon -->
                <svg
                  *ngSwitchCase="'reports'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>

                <!-- Matches Icon -->
                <svg
                  *ngSwitchCase="'matches'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>

                <!-- Analytics Icon -->
                <svg
                  *ngSwitchCase="'analytics'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M21 21v-7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v7h18z"
                  ></path>
                  <path d="M3 10V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"></path>
                </svg>

                <!-- Activity Icon -->
                <svg
                  *ngSwitchCase="'activity'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>

                <!-- Settings Icon -->
                <svg
                  *ngSwitchCase="'settings'"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                  ></path>
                </svg>
              </ng-container>
            </div>

            <div
              class="bento-badge"
              *ngIf="item.badge"
              [attr.aria-label]="'Status: ' + item.badge"
            >
              {{ item.badge }}
            </div>
          </div>

          <!-- Content Area -->
          <div class="bento-content">
            <!-- Value Display for Stats Cards -->
            <div
              class="bento-value"
              *ngIf="item.value"
              [attr.aria-live]="'polite'"
            >
              {{ item.value }}
            </div>

            <!-- Title -->
            <h3 class="bento-title" *ngIf="item.title">{{ item.title }}</h3>

            <!-- Subtitle -->
            <p
              class="bento-subtitle"
              *ngIf="item.subtitle"
              [id]="'desc-' + item.id"
            >
              {{ item.subtitle }}
            </p>

            <!-- Additional Content -->
            <div
              class="bento-text"
              *ngIf="item.content"
              [innerHTML]="item.content"
            ></div>
          </div>

          <!-- Footer with Trend and Action -->
          <div class="bento-footer" *ngIf="item.trend || item.action">
            <!-- Trend Indicator -->
            <div
              class="bento-trend"
              *ngIf="item.trend"
              [attr.aria-label]="getTrendAriaLabel(item.trend)"
            >
              <span
                class="trend-indicator"
                [class]="'trend-' + item.trend.type"
              >
                <svg
                  *ngIf="item.trend.type === 'up'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                <svg
                  *ngIf="item.trend.type === 'down'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
                <svg
                  *ngIf="item.trend.type === 'neutral'"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {{ item.trend.value }}
              </span>
              <span class="trend-period" *ngIf="item.trend.period">{{
                item.trend.period
              }}</span>
            </div>

            <!-- Action Button -->
            <button
              class="bento-action"
              *ngIf="item.action"
              (click)="onActionClick(item, $event)"
              [attr.aria-label]="item.action.text"
            >
              {{ item.action.text }}
            </button>
          </div>
        </ng-container>

        <!-- Custom Template -->
        <ng-container *ngIf="item.customTemplate">
          <ng-container
            *ngTemplateOutlet="
              item.customTemplate;
              context: { $implicit: item }
            "
          ></ng-container>
        </ng-container>
      </div>
    </div>
  `,
  styles: [
    `
      .bento-grid {
        display: grid;
        gap: 1rem;
        width: 100%;
        padding: 0;
        transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        will-change: grid-template-columns;

        /* Default Grid with dynamic columns */
        &.bento-grid-default {
          /* Dynamic columns set via [style.grid-template-columns] */
          /* Fallback responsive behavior */

          @media (max-width: 1200px) {
            grid-template-columns: repeat(3, 1fr);
          }

          @media (max-width: 768px) {
            grid-template-columns: repeat(2, 1fr);
          }

          @media (max-width: 480px) {
            grid-template-columns: 1fr;
          }
        }

        /* Compact Grid with dynamic columns */
        &.bento-grid-compact {
          gap: 0.75rem;

          @media (max-width: 1200px) {
            grid-template-columns: repeat(4, 1fr);
          }

          @media (max-width: 768px) {
            grid-template-columns: repeat(3, 1fr);
          }

          @media (max-width: 480px) {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Wide Grid with dynamic columns */
        &.bento-grid-wide {
          gap: 1.5rem;

          @media (max-width: 768px) {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }

          @media (max-width: 480px) {
            grid-template-columns: 1fr;
          }
        }

        /* Enhanced overflow protection */
        .bento-item {
          min-width: 0;
          overflow: hidden;
          contain: layout style;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

          .bento-content {
            min-width: 0;
          }

          .bento-title,
          .bento-subtitle,
          .bento-text {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
        }
      }

      .bento-item {
        background: var(--color-bg-primary);
        border-radius: var(--radius-2xl);
        padding: var(--space-6);
        border: 1px solid var(--color-border-secondary);
        transition: all var(--duration-300) var(--ease-out);
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: var(--shadow-sm);
        backdrop-filter: blur(8px);

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
            var(--color-primary-200),
            transparent
          );
          opacity: 0;
          transition: opacity var(--duration-300) var(--ease-out);
        }

        /* Size Variants */
        &.size-small {
          grid-column: span 1;
          grid-row: span 1;
          min-height: 120px;
        }

        &.size-medium {
          grid-column: span 1;
          grid-row: span 1;
          min-height: 160px;
        }

        &.size-large {
          grid-column: span 2;
          grid-row: span 1;
          min-height: 160px;
        }

        &.size-wide {
          grid-column: span 2;
          grid-row: span 1;
          min-height: 200px;
        }

        &.size-tall {
          grid-column: span 1;
          grid-row: span 2;
          min-height: 300px;
        }

        &.size-feature {
          grid-column: span 2;
          grid-row: span 2;
          min-height: 300px;
        }

        /* Responsive Size Adjustments */
        @media (max-width: 768px) {
          &.size-large,
          &.size-wide,
          &.size-feature {
            grid-column: span 1;
          }

          &.size-tall,
          &.size-feature {
            grid-row: span 1;
            min-height: 160px;
          }
        }

        /* Mobile single column override for dynamic grid */
        &.mobile-single-column {
          grid-column: span 1 !important;
          grid-row: span 1 !important;
          min-height: 160px;

          .bento-value {
            font-size: 1.75rem !important;
          }

          .bento-title {
            font-size: 1rem !important;
          }
        }

        /* Fantasy Variant Colors */
        &.variant-default {
          background: var(--color-bg-primary);
          box-shadow: var(--shadow-md);
          border-color: var(--color-border-primary);

          &:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-3px);
            border-color: var(--color-primary-300);

            &::before {
              opacity: 1;
            }
          }
        }

        &.variant-primary {
          background: linear-gradient(
            135deg,
            var(--color-primary-900),
            var(--color-royal-800)
          );
          color: white;
          box-shadow: 0 8px 32px rgba(26, 35, 126, 0.3);
          border-color: var(--color-primary-700);

          .bento-icon {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          }

          .bento-title {
            color: white;
          }

          &:hover {
            box-shadow: 0 16px 48px rgba(26, 35, 126, 0.4);
            transform: translateY(-4px);
          }

          &::before {
            background: linear-gradient(
              90deg,
              transparent,
              rgba(255, 255, 255, 0.3),
              transparent
            );
          }
        }

        &.variant-success {
          background: linear-gradient(
            135deg,
            var(--color-emerald-800),
            var(--color-success-700)
          );
          color: white;
          box-shadow: 0 8px 32px rgba(27, 94, 32, 0.3);
          border-color: var(--color-success-600);

          .bento-icon {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          }

          .bento-title {
            color: white;
          }

          &:hover {
            box-shadow: 0 16px 48px rgba(27, 94, 32, 0.4);
            transform: translateY(-4px);
          }
        }

        &.variant-warning {
          background: linear-gradient(
            135deg,
            var(--color-warning-600),
            var(--color-ember-700)
          );
          color: white;
          box-shadow: 0 8px 32px rgba(255, 179, 0, 0.3);
          border-color: var(--color-warning-500);

          .bento-icon {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          }

          .bento-title {
            color: white;
          }

          &:hover {
            box-shadow: 0 16px 48px rgba(255, 179, 0, 0.4);
            transform: translateY(-4px);
          }
        }

        &.variant-info {
          background: linear-gradient(
            135deg,
            var(--color-info-600),
            var(--color-primary-600)
          );
          color: white;
          box-shadow: 0 8px 32px rgba(2, 119, 189, 0.3);
          border-color: var(--color-info-500);

          .bento-icon {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          }

          .bento-title {
            color: white;
          }

          &:hover {
            box-shadow: 0 16px 48px rgba(2, 119, 189, 0.4);
            transform: translateY(-4px);
          }
        }

        &.variant-error {
          background: linear-gradient(
            135deg,
            var(--color-error-700),
            var(--color-danger-600)
          );
          color: white;
          box-shadow: 0 8px 32px rgba(211, 47, 47, 0.3);
          border-color: var(--color-error-600);

          .bento-icon {
            background: rgba(255, 255, 255, 0.15);
            color: white;
            border-color: rgba(255, 255, 255, 0.3);
          }

          .bento-title {
            color: white;
          }

          &:hover {
            box-shadow: 0 16px 48px rgba(211, 47, 47, 0.4);
            transform: translateY(-4px);
          }
        }

        /* Clickable State */
        &.clickable {
          cursor: pointer;

          &:focus {
            outline: 2px solid var(--color-primary-500);
            outline-offset: 3px;
            border-color: var(--color-primary-400);
          }

          &:focus-visible {
            box-shadow:
              var(--shadow-lg),
              0 0 0 4px rgba(26, 35, 126, 0.15);
          }

          &:active {
            transform: translateY(1px);
            box-shadow: var(--shadow-sm);
          }
        }
      }

      .bento-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: var(--spacing-4, 1rem);
      }

      .bento-icon {
        width: var(--space-12);
        height: var(--space-12);
        border-radius: var(--radius-xl);
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(
          135deg,
          var(--color-primary-100),
          var(--color-primary-50)
        );
        border: 1px solid var(--color-primary-200);
        color: var(--color-primary-800);
        flex-shrink: 0;
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-base);

        &:hover {
          background: linear-gradient(
            135deg,
            var(--color-primary-200),
            var(--color-primary-100)
          );
          transform: scale(1.05);
        }
      }

      .bento-badge {
        background: var(--color-primary-100);
        border: 1px solid var(--color-primary-200);
        color: var(--color-primary-800);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-xl);
        font-family: var(--font-family-body);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        box-shadow: var(--shadow-xs);
      }

      .bento-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-2, 0.5rem);
      }

      .bento-value {
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-tight);
        margin-bottom: var(--space-1);
        color: var(--color-primary-800);
        background: linear-gradient(
          135deg,
          var(--color-primary-800),
          var(--color-royal-700)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;

        .size-small & {
          font-size: var(--font-size-xl);
        }

        .size-feature & {
          font-size: var(--font-size-3xl);
        }
      }

      .bento-title {
        font-family: var(--font-family-fantasy-heading);
        font-size: var(--font-size-lg);
        font-weight: var(--font-weight-fantasy-large);
        margin: 0;
        line-height: var(--line-height-tight);
        color: var(--color-text-fantasy);
        letter-spacing: -0.01em;

        .size-small & {
          font-size: var(--font-size-base);
        }

        .size-feature & {
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-fantasy-h3);
        }
      }

      .bento-subtitle {
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-fantasy-small);
        color: var(--color-text-secondary);
        margin: 0;
        line-height: var(--line-height-normal);

        .size-feature & {
          font-size: var(--font-size-base);
        }
      }

      .bento-text {
        font-family: var(--font-family-body);
        font-size: var(--font-size-sm);
        line-height: var(--line-height-relaxed);
        color: var(--color-text-tertiary);
      }

      .bento-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: var(--spacing-4, 1rem);
        gap: var(--spacing-4, 1rem);
      }

      .bento-trend {
        display: flex;
        align-items: center;
        gap: var(--spacing-2, 0.5rem);
        font-size: 0.875rem;
      }

      .trend-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-1, 0.25rem);
        font-weight: 600;

        &.trend-up {
          color: #10b981;
        }

        &.trend-down {
          color: #ef4444;
        }

        &.trend-neutral {
          color: #6b7280;
        }
      }

      .trend-period {
        opacity: 0.7;
        font-size: 0.75rem;
      }

      .bento-action {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: inherit;
        padding: var(--spacing-2, 0.5rem) var(--spacing-4, 1rem);
        border-radius: var(--border-radius-md, 8px);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
        }

        .variant-default & {
          background: var(--color-background, #f8f9fa);
          border-color: var(--color-border, #e9ecef);
          color: var(--color-text, #495057);

          &:hover {
            background: var(--color-border, #e9ecef);
          }
        }
      }

      /* Animation for data updates */
      .bento-value,
      .bento-title,
      .bento-subtitle {
        animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Performance optimizations for dynamic grids */
      @media (prefers-reduced-motion: reduce) {
        .bento-grid,
        .bento-item {
          transition: none;
        }

        .bento-value,
        .bento-title,
        .bento-subtitle {
          animation: none;
        }
      }
    `,
  ],
})
export class BentoGridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridContainer', { static: false }) gridContainer!: ElementRef;

  private accessibilityService = inject(AccessibilityService);
  private destroy$ = new Subject<void>();
  private intersectionObserver?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;

  @Input() items: BentoGridItem[] = [];
  @Input() gridSize: 'compact' | 'default' | 'wide' = 'default';
  @Input() ariaLabel = 'Dashboard grid';
  @Input() onItemClickHandler?: (item: BentoGridItem) => void;
  @Input() autoResize = true; // Enable/disable automatic grid resizing
  @Input() minColumnWidth = 250; // Minimum width for grid items
  @Input() maxColumns?: number; // Override maximum columns

  // Dynamic grid state
  private _currentColumns = 4;
  dynamicColumns = 'repeat(4, 1fr)';

  // Optimized trackBy function
  /**
   * Performs the track by item id operation.
   * @param _index - The index.
   * @param item - The item.
   * @returns The TrackByFunction<BentoGridItem>.
   */
  readonly trackByItemId: TrackByFunction<BentoGridItem> = (
    _index: number,
    item: BentoGridItem,
  ): string => {
    return item.id;
  };

  // Enhanced grid item classes with overflow protection
  /**
   * Retrieves item classes.
   * @param item - The item.
   * @returns The string value.
   */
  getItemClasses(item: BentoGridItem): string {
    const classes = [
      `size-${item.size || 'medium'}`,
      `variant-${item.variant || 'default'}`,
    ];

    if (item.clickable) {
      classes.push('clickable');
    }

    // Add responsive classes based on current grid columns
    if (
      this._currentColumns <= 2 &&
      (item.size === 'large' || item.size === 'wide' || item.size === 'feature')
    ) {
      classes.push('mobile-single-column');
    }

    return classes.join(' ');
  }

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  ngOnInit() {
    // Initialize grid calculations
    this.calculateOptimalGridColumns();
  }

  /**
   * Performs the ng after view init operation.
   * @returns The result of the operation.
   */
  ngAfterViewInit() {
    // Setup intersection observer for animations with debouncing
    this.setupIntersectionObserver();

    // Setup grid auto-sizing if enabled
    if (this.autoResize) {
      this.setupGridResizing();
    }
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();

    // Cleanup observers
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  // Handle window resize events
  /**
   * Performs the on window resize operation.
   * @param _event - The event.
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(_event: Event): void {
    if (this.autoResize) {
      this.debouncedCalculateColumns();
    }
  }

  // Remove the old getItemClasses method as it's been replaced above

  /**
   * Retrieves item aria label.
   * @param item - The item.
   * @returns The string value.
   */
  getItemAriaLabel(item: BentoGridItem): string {
    let label = item.title;

    if (item.value) {
      label += `, value: ${item.value}`;
    }

    if (item.subtitle) {
      label += `, ${item.subtitle}`;
    }

    if (item.trend) {
      label += `, trend: ${item.trend.type} ${item.trend.value}`;
    }

    if (item.clickable) {
      label += ', clickable';
    }

    return label;
  }

  /**
   * Retrieves trend aria label.
   * @param trend - The trend.
   * @returns The string value.
   */
  getTrendAriaLabel(trend: BentoGridItem['trend']): string {
    if (!trend) return '';

    const direction =
      trend.type === 'up'
        ? 'increased'
        : trend.type === 'down'
          ? 'decreased'
          : 'remained stable';

    return `Trend: ${direction} by ${trend.value}${trend.period ? ' ' + trend.period : ''}`;
  }

  /**
   * Performs the on item click operation.
   * @param item - The item.
   */
  onItemClick(item: BentoGridItem): void {
    if (item.clickable && this.onItemClickHandler) {
      this.onItemClickHandler(item);

      // Announce click action
      this.accessibilityService.announce(
        `Activated ${item.title}${item.subtitle ? ': ' + item.subtitle : ''}`,
        'polite',
      );
    }
  }

  /**
   * Performs the on action click operation.
   * @param item - The item.
   * @param event - The event.
   */
  onActionClick(item: BentoGridItem, event: Event): void {
    event.stopPropagation();
    if (item.action?.onClick) {
      item.action.onClick();

      // Announce action
      this.accessibilityService.announce(
        `${item.action.text} action completed`,
        'polite',
      );
    }
  }

  /**
   * Performs the on item focus operation.
   * @param item - The item.
   */
  onItemFocus(item: BentoGridItem): void {
    // Announce focus for complex items
    if (item.trend || item.badge) {
      let announcement = `Focused on ${item.title}`;

      if (item.value) {
        announcement += `, current value ${item.value}`;
      }

      if (item.trend) {
        announcement += `, trend ${item.trend.type} ${item.trend.value}`;
      }

      if (item.badge) {
        announcement += `, status ${item.badge}`;
      }

      this.accessibilityService.announce(announcement, 'polite');
    }
  }

  /**
   * Performs the on item blur operation.
   * @param _item - The item.
   */
  onItemBlur(_item: BentoGridItem): void {
    // Optional: Handle blur events if needed
  }

  /**
   * Retrieves card state.
   * @param item - The item.
   * @returns The string value.
   */
  getCardState(item: BentoGridItem): string {
    if (item.badge) return item.badge;
    if (item.trend?.type) return item.trend.type;
    return 'normal';
  }

  /**
   * Retrieves card shortcuts.
   * @param item - The item.
   * @returns The an array of string value.
   */
  getCardShortcuts(item: BentoGridItem): string[] {
    const shortcuts: string[] = [];

    if (item.clickable) {
      shortcuts.push('Enter or Space to activate');
    }

    if (item.action) {
      shortcuts.push(`${item.action.text} available`);
    }

    return shortcuts;
  }

  /**
   * Retrieves card instructions.
   * @param item - The item.
   * @returns The string value.
   */
  getCardInstructions(item: BentoGridItem): string {
    if (item.clickable && item.action) {
      return `Card is clickable. Press Enter or Space to activate. ${item.action.text} action is available.`;
    } else if (item.clickable) {
      return 'Card is clickable. Press Enter or Space to activate.';
    } else if (item.action) {
      return `${item.action.text} action is available.`;
    }

    return '';
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    // Use requestIdleCallback for better performance
    const scheduleAnimation = (callback: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(callback, { timeout: 100 });
      } else {
        setTimeout(callback, 0);
      }
    };

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        scheduleAnimation(() => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
              // Unobserve after animation starts for performance
              this.intersectionObserver?.unobserve(entry.target);
            }
          });
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px',
      },
    );

    // Use RAF to avoid blocking main thread
    requestAnimationFrame(() => {
      const items =
        this.gridContainer?.nativeElement?.querySelectorAll('.bento-item');
      items?.forEach((item: Element) =>
        this.intersectionObserver?.observe(item),
      );
    });
  }

  // Grid sizing logic
  private setupGridResizing(): void {
    if (!this.gridContainer || !('ResizeObserver' in window)) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(() => {
        this.debouncedCalculateColumns();
      });
    });

    this.resizeObserver.observe(this.gridContainer.nativeElement);
  }

  private debouncedCalculateColumns = this.debounce(() => {
    this.calculateOptimalGridColumns();
  }, 150);

  private calculateOptimalGridColumns(): void {
    if (!this.gridContainer) {
      // Set initial values based on grid size
      this.setInitialColumns();
      return;
    }

    const containerWidth = this.gridContainer.nativeElement.offsetWidth;
    if (containerWidth === 0) return; // Container not visible yet

    // Calculate based on minimum column width
    const baseColumns = Math.floor(containerWidth / this.minColumnWidth);

    // Apply size-specific constraints
    const maxColumns = this.getMaxColumnsForSize();
    const minColumns = this.getMinColumnsForSize();

    // Ensure we stay within bounds
    let calculatedColumns = Math.min(baseColumns, maxColumns);
    calculatedColumns = Math.max(calculatedColumns, minColumns);

    // Check for content overflow
    if (this.wouldCauseContentOverflow(calculatedColumns)) {
      calculatedColumns = Math.max(calculatedColumns - 1, minColumns);
    }

    // Only update if changed
    if (calculatedColumns !== this._currentColumns) {
      this._currentColumns = calculatedColumns;
      this.updateDynamicColumns();
    }
  }

  private setInitialColumns(): void {
    const maxColumns = this.getMaxColumnsForSize();
    this._currentColumns = Math.min(4, maxColumns);
    this.updateDynamicColumns();
  }

  private getMaxColumnsForSize(): number {
    if (this.maxColumns) return this.maxColumns;

    // Default maximum columns based on grid size
    switch (this.gridSize) {
      case 'compact':
        return 6;
      case 'default':
        return 4;
      case 'wide':
        return 3;
      default:
        return 4;
    }
  }

  private getMinColumnsForSize(): number {
    // Always ensure at least 1 column
    return 1;
  }

  private wouldCauseContentOverflow(columns: number): boolean {
    if (!this.gridContainer || columns <= 1) return false;

    const containerWidth = this.gridContainer.nativeElement.offsetWidth;
    const availableWidth = containerWidth / columns;

    // Check if available width is too small for content
    const minimumViableWidth = this.gridSize === 'compact' ? 200 : 280;

    return availableWidth < minimumViableWidth;
  }

  private updateDynamicColumns(): void {
    // Update CSS grid template
    this.dynamicColumns = `repeat(${this._currentColumns}, 1fr)`;

    // Force change detection if needed
    if (this.gridContainer) {
      this.gridContainer.nativeElement.style.gridTemplateColumns =
        this.dynamicColumns;
    }
  }

  // Utility function for debouncing
  private debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number,
  ): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return ((...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        func.apply(this, args);
      }, wait);
    }) as T;
  }

  // Public API for manual grid recalculation
  /**
   * Performs the recalculate grid operation.
   */
  public recalculateGrid(): void {
    this.calculateOptimalGridColumns();
  }

  // Getter for current column count (for debugging/testing)
  /**
   * Performs the current columns operation.
   * @returns The number value.
   */
  public get currentColumns(): number {
    return this._currentColumns;
  }
}
