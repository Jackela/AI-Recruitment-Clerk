import type { TemplateRef } from '@angular/core';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BentoIconComponent } from './bento-icon.component';

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
 * Represents the bento grid item component.
 * Renders individual grid cells with proper styling and accessibility.
 */
@Component({
  selector: 'arc-bento-grid-item',
  standalone: true,
  imports: [CommonModule, BentoIconComponent],
  styleUrl: './bento-grid-item.component.scss',
  template: `
    <div
      class="bento-item"
      [class]="getItemClasses()"
      [attr.role]="'gridcell'"
      [attr.aria-label]="getAriaLabel()"
      [attr.tabindex]="item.clickable ? '0' : null"
      [attr.aria-describedby]="item.subtitle ? 'desc-' + item.id : null"
      [attr.aria-live]="item.value !== undefined ? 'polite' : null"
      (click)="onItemClick()"
      (keydown.enter)="onItemClick()"
      (keydown.space)="onItemClick()"
    >
      <!-- Default Card Layout -->
      <ng-container *ngIf="!item.customTemplate">
        <!-- Header with Icon and Badge -->
        <div class="bento-header" *ngIf="item.icon || item.badge">
          <arc-bento-icon *ngIf="item.icon" [icon]="item.icon"></arc-bento-icon>

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
            [attr.aria-label]="getTrendAriaLabel()"
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
            (click)="onActionClick($event)"
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
  `,
})
export class BentoGridItemComponent {
  @Input({ required: true }) public item!: BentoGridItem;
  @Input() public isMobileSingleColumn = false;
  @Output() public itemClick = new EventEmitter<BentoGridItem>();

  /**
   * Retrieves item classes.
   * @returns The string value.
   */
  public getItemClasses(): string {
    const classes = [
      `size-${this.item.size || 'medium'}`,
      `variant-${this.item.variant || 'default'}`,
    ];

    if (this.item.clickable) {
      classes.push('clickable');
    }

    if (this.isMobileSingleColumn) {
      classes.push('mobile-single-column');
    }

    return classes.join(' ');
  }

  /**
   * Retrieves aria label.
   * @returns The string value.
   */
  public getAriaLabel(): string {
    let label = this.item.title;

    if (this.item.value) {
      label += `, value: ${this.item.value}`;
    }

    if (this.item.subtitle) {
      label += `, ${this.item.subtitle}`;
    }

    if (this.item.trend) {
      label += `, trend: ${this.item.trend.type} ${this.item.trend.value}`;
    }

    if (this.item.clickable) {
      label += ', clickable';
    }

    return label;
  }

  /**
   * Retrieves trend aria label.
   * @returns The string value.
   */
  public getTrendAriaLabel(): string {
    if (!this.item.trend) return '';

    const direction =
      this.item.trend.type === 'up'
        ? 'increased'
        : this.item.trend.type === 'down'
          ? 'decreased'
          : 'remained stable';

    return `Trend: ${direction} by ${this.item.trend.value}${this.item.trend.period ? ' ' + this.item.trend.period : ''}`;
  }

  /**
   * Performs the on item click operation.
   */
  public onItemClick(): void {
    if (this.item.clickable) {
      this.itemClick.emit(this.item);
    }
  }

  /**
   * Performs the on action click operation.
   * @param event - The event.
   */
  public onActionClick(event: Event): void {
    event.stopPropagation();
    if (this.item.action?.onClick) {
      this.item.action.onClick();
    }
  }
}
