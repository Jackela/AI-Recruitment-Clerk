import type { OnInit, OnDestroy } from '@angular/core';
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { NavigationGuideService } from '../../../services/navigation/navigation-guide.service';
// import { GuideStep } from '../../../services/navigation/navigation-guide.service'; // Reserved for future use
import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs/operators'; // Reserved for future use

interface Viewport {
  width: number;
  height: number;
}

interface Position {
  top: string;
  left: string;
}

interface HighlightPosition extends Position {
  width: string;
  height: string;
}

/**
 * Represents the guide overlay component.
 */
@Component({
  selector: 'arc-guide-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="guide-overlay-container" *ngIf="isVisible()">
      <!-- Backdrop -->
      <div class="guide-backdrop" (click)="skipGuide()"></div>

      <!-- Guide Tooltip -->
      <div
        class="guide-tooltip"
        [class]="getTooltipClasses()"
        [style]="getTooltipPosition()"
        *ngIf="currentStep()"
      >
        <!-- Header -->
        <div class="guide-header">
          <h3 class="guide-title">{{ currentStep()?.title }}</h3>
          <button
            class="guide-close"
            (click)="skipGuide()"
            aria-label="关闭引导"
          >
            ✕
          </button>
        </div>

        <!-- Content -->
        <div class="guide-content">
          <p [innerHTML]="currentStep()?.content"></p>
        </div>

        <!-- Progress -->
        <div class="guide-progress" *ngIf="showProgress()">
          <div class="progress-bar">
            <div
              class="progress-fill"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
          <span class="progress-text">
            {{ stepIndex() + 1 }} / {{ totalSteps() }}
          </span>
        </div>

        <!-- Actions -->
        <div class="guide-actions">
          <button
            class="guide-btn guide-btn-secondary"
            (click)="skipGuide()"
            type="button"
          >
            跳过引导
          </button>

          <div class="guide-nav-buttons">
            <button
              class="guide-btn guide-btn-ghost"
              (click)="previousStep()"
              [disabled]="!canGoPrevious()"
              type="button"
            >
              上一步
            </button>

            <button
              class="guide-btn guide-btn-primary"
              (click)="nextStep()"
              type="button"
            >
              {{ isLastStep() ? '完成' : '下一步' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Target Highlight Ring -->
      <div
        class="guide-highlight-ring"
        [style]="getHighlightPosition()"
        *ngIf="currentStep()"
      ></div>
    </div>
  `,
  styleUrls: ['./guide-overlay.component.css'],
})
export class GuideOverlayComponent implements OnInit, OnDestroy {
  // Service state
  isVisible = computed(() => this.guideService.isGuideActive());
  currentStep = computed(() => this.guideService.currentStep());
  stepIndex = computed(() => this.guideService.stepIndex());
  currentFlow = computed(() => this.guideService.currentFlow());

  // Computed properties
  totalSteps = computed(() => this.currentFlow()?.steps.length || 0);
  progressPercentage = computed(() => {
    const total = this.totalSteps();
    return total > 0 ? ((this.stepIndex() + 1) / total) * 100 : 0;
  });

  // Local state
  targetElement = signal<Element | null>(null);
  tooltipPosition = signal({ top: '0px', left: '0px' });
  highlightPosition = signal({
    top: '0px',
    left: '0px',
    width: '0px',
    height: '0px',
  });

  private destroy$ = new Subject<void>();
  private resizeObserver?: ResizeObserver;

  /**
   * Initializes a new instance of the Guide Overlay Component.
   * @param guideService - The guide service.
   */
  constructor(private guideService: NavigationGuideService) {}

  /**
   * Performs the ng on init operation.
   */
  ngOnInit(): void {
    // Watch for step changes to update positions
    // Note: currentStep is a signal, we'll use effect for watching changes
    setTimeout(() => this.updatePositions(), 100);

    // Setup resize observer for responsive positioning
    this.setupResizeObserver();
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.resizeObserver?.disconnect();
  }

  private setupResizeObserver(): void {
    // Check if ResizeObserver is available (for test environment compatibility)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.isVisible()) {
          this.updatePositions();
        }
      });
      this.resizeObserver.observe(document.body);
    }
  }

  private updatePositions(): void {
    const step = this.currentStep();
    if (!step) return;

    const element = document.querySelector(step.target);
    if (!element) return;

    this.targetElement.set(element);

    const rect = element.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Update highlight position
    this.updateHighlightPosition(rect);

    // Update tooltip position
    this.updateTooltipPosition(rect, viewport, step.position);
  }

  private updateHighlightPosition(rect: DOMRect): void {
    const padding = 8;
    this.highlightPosition.set({
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
    });
  }

  private updateTooltipPosition(
    rect: DOMRect,
    viewport: Viewport,
    position: string,
  ): void {
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const gap = 16;

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
    }

    // Ensure tooltip stays within viewport
    if (left < 10) left = 10;
    if (left + tooltipWidth > viewport.width - 10) {
      left = viewport.width - tooltipWidth - 10;
    }
    if (top < 10) top = 10;
    if (top + tooltipHeight > viewport.height - 10) {
      top = viewport.height - tooltipHeight - 10;
    }

    this.tooltipPosition.set({
      top: `${top}px`,
      left: `${left}px`,
    });
  }

  // Component methods
  /**
   * Performs the next step operation.
   */
  nextStep(): void {
    this.guideService.nextStep();
  }

  /**
   * Performs the previous step operation.
   */
  previousStep(): void {
    this.guideService.previousStep();
  }

  /**
   * Performs the skip guide operation.
   */
  skipGuide(): void {
    this.guideService.skipFlow();
  }

  // Helper methods
  /**
   * Performs the can go previous operation.
   * @returns The boolean value.
   */
  canGoPrevious(): boolean {
    return this.stepIndex() > 0;
  }

  /**
   * Performs the is last step operation.
   * @returns The boolean value.
   */
  isLastStep(): boolean {
    return this.stepIndex() === this.totalSteps() - 1;
  }

  /**
   * Performs the show progress operation.
   * @returns The boolean value.
   */
  showProgress(): boolean {
    return this.totalSteps() > 1;
  }

  /**
   * Retrieves tooltip classes.
   * @returns The string value.
   */
  getTooltipClasses(): string {
    const step = this.currentStep();
    const classes = ['guide-tooltip'];
    if (step?.position) {
      classes.push(`guide-tooltip-${step.position}`);
    }
    return classes.join(' ');
  }

  /**
   * Retrieves tooltip position.
   * @returns The Position.
   */
  getTooltipPosition(): Position {
    return this.tooltipPosition();
  }

  /**
   * Retrieves highlight position.
   * @returns The HighlightPosition.
   */
  getHighlightPosition(): HighlightPosition {
    return this.highlightPosition();
  }
}
