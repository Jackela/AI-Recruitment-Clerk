import type {
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PerformanceMetrics } from '../../types/performance-metrics.type';
import { MobilePerformanceService } from '../../services/mobile-performance.service';
import { MobilePerformanceDetailsComponent } from './mobile-performance-details.component';

/**
 * Represents mobile performance component.
 * Displays performance badge and toggle-able detailed metrics.
 */
@Component({
  selector: 'arc-mobile-performance',
  standalone: true,
  imports: [CommonModule, MobilePerformanceDetailsComponent],
  template: `
    <div class="performance-monitor" *ngIf="showMetrics()">
      <!-- Performance Badge -->
      <div class="performance-badge" [class]="'badge-' + performanceService.metrics().overall">
        <div class="badge-score">{{ performanceService.getOverallScore() }}</div>
        <div class="badge-label">Performance</div>
      </div>

      <!-- Detailed Metrics (expandable) -->
      <arc-mobile-performance-details
        *ngIf="expanded()"
        [metrics]="performanceService.metrics()"
      />

      <!-- Toggle Button -->
      <button
        class="toggle-details"
        (click)="toggleExpanded()"
        [attr.aria-label]="
          expanded() ? 'Hide performance details' : 'Show performance details'
        "
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path
            [attr.d]="
              expanded()
                ? 'M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z'
                : 'M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z'
            "
          />
        </svg>
        {{ expanded() ? 'Hide Details' : 'Show Details' }}
      </button>
    </div>
  `,
  styles: [
    `
      .performance-monitor {
        position: fixed;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        max-width: 320px;
        z-index: 1000;
        font-size: 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);

        @media (max-width: 768px) {
          top: 72px; // Account for mobile header
          right: 8px;
          max-width: 280px;
        }
      }

      .performance-badge {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;

        &.badge-excellent {
          background: rgba(39, 174, 96, 0.1);
          color: #27ae60;
        }

        &.badge-good {
          background: rgba(52, 152, 219, 0.1);
          color: #3498db;
        }

        &.badge-needs-improvement {
          background: rgba(243, 156, 18, 0.1);
          color: #f39c12;
        }

        &.badge-poor {
          background: rgba(231, 76, 60, 0.1);
          color: #e74c3c;
        }

        .badge-score {
          font-size: 18px;
          font-weight: 700;
          min-width: 32px;
          text-align: center;
        }

        .badge-label {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.8;
        }
      }

      .toggle-details {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 16px;
        background: #f8f9fa;
        border: none;
        color: #495057;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover {
          background: #e9ecef;
        }

        svg {
          transition: transform 0.2s ease;
        }
      }

      /* Hide on very small screens */
      @media (max-width: 480px) {
        .performance-monitor {
          display: none;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobilePerformanceComponent implements OnInit, OnDestroy {
  protected readonly performanceService = inject(MobilePerformanceService);

  public expanded = signal(false);
  public showMetrics = signal(false);

  /**
   * Performs ng on init operation.
   * @returns The result of the operation.
   */
  public ngOnInit(): void {
    // Only show in development or when explicitly enabled
    this.showMetrics.set(
      !environment.production ||
        localStorage.getItem('showPerformanceMetrics') === 'true',
    );

    if (this.showMetrics()) {
      this.performanceService.initialize();
    }
  }

  /**
   * Performs ng on destroy operation.
   * @returns The result of the operation.
   */
  public ngOnDestroy(): void {
    this.performanceService.destroy();
  }

  /**
   * Performs toggle expanded operation.
   * @returns The result of operation.
   */
  public toggleExpanded(): void {
    this.expanded.update((current) => !current);
  }
}

// Environment stub - replace with actual environment import
const environment = { production: false };
