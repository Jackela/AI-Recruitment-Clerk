import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Defines the shape of the swipe action.
 */
export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: 'primary' | 'success' | 'danger' | 'warning';
  width?: number;
}

/**
 * Defines the shape of the swipe event.
 */
export interface SwipeEvent {
  action: SwipeAction;
  item: Record<string, unknown>;
}

/**
 * Represents the mobile swipe component.
 */
@Component({
  selector: 'arc-mobile-swipe',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="mobile-swipe-container"
      #container
      [class.swiping]="isSwiping"
      [class.actions-visible]="actionsVisible"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseLeave($event)"
    >
      <!-- Swipe Actions Background -->
      <div class="swipe-actions" #actionsContainer>
        <button
          *ngFor="let action of actions"
          class="swipe-action"
          [class]="'swipe-action--' + action.color"
          [style.width.px]="action.width || 80"
          (click)="onActionClick(action)"
          [attr.aria-label]="action.label"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path [attr.d]="action.icon" />
          </svg>
          <span class="action-label">{{ action.label }}</span>
        </button>
      </div>

      <!-- Swipe Content -->
      <div
        class="swipe-content"
        #content
        [style.transform]="'translateX(' + translateX + 'px)'"
      >
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .mobile-swipe-container {
        position: relative;
        overflow: hidden;
        background: white;
        user-select: none;
        -webkit-user-select: none;
        touch-action: pan-y;

        &.swiping {
          .swipe-content {
            transition: none !important;
          }
        }

        &.actions-visible {
          .swipe-actions {
            opacity: 1;
          }
        }

        .swipe-actions {
          position: absolute;
          top: 0;
          right: 0;
          height: 100%;
          display: flex;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1;

          .swipe-action {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: none;
            color: white;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 60px;
            padding: 8px;

            &:active {
              transform: scale(0.95);
            }

            &--primary {
              background: #3498db;

              &:hover {
                background: #2980b9;
              }
            }

            &--success {
              background: #27ae60;

              &:hover {
                background: #229954;
              }
            }

            &--danger {
              background: #e74c3c;

              &:hover {
                background: #c0392b;
              }
            }

            &--warning {
              background: #f39c12;

              &:hover {
                background: #e67e22;
              }
            }

            .action-label {
              line-height: 1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 100%;
            }

            svg {
              flex-shrink: 0;
            }
          }
        }

        .swipe-content {
          position: relative;
          background: white;
          z-index: 2;
          transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
      }

      @media (min-width: 768px) {
        .mobile-swipe-container {
          touch-action: auto;

          .swipe-actions {
            opacity: 0 !important;
          }

          .swipe-content {
            transform: none !important;
          }
        }
      }
    `,
  ],
})
export class MobileSwipeComponent implements OnInit, OnDestroy {
  @Input() actions: SwipeAction[] = [];
  @Input() swipeThreshold = 80;
  @Input() disabled = false;
  @Input() item: Record<string, unknown> = {};

  @Output() swipeAction = new EventEmitter<SwipeEvent>();
  @Output() swipeStart = new EventEmitter<void>();
  @Output() swipeEnd = new EventEmitter<void>();

  @ViewChild('container') container!: ElementRef<HTMLElement>;
  @ViewChild('content') content!: ElementRef<HTMLElement>;
  @ViewChild('actionsContainer') actionsContainer!: ElementRef<HTMLElement>;

  translateX = 0;
  isSwiping = false;
  actionsVisible = false;

  private startX = 0;
  private currentX = 0;
  private isDragging = false;
  private maxSwipeDistance = 0;
  private isMouseEvent = false;

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  ngOnInit() {
    this.calculateMaxSwipeDistance();
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  ngOnDestroy() {
    // Clean up any ongoing interactions
    this.resetSwipe();
  }

  private calculateMaxSwipeDistance() {
    this.maxSwipeDistance = this.actions.reduce((total, action) => {
      return total + (action.width || 80);
    }, 0);
  }

  /**
   * Performs the on touch start operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onTouchStart(event: TouchEvent) {
    if (this.disabled) return;

    this.isMouseEvent = false;
    const touch = event.touches[0];
    this.startSwipe(touch.clientX);
  }

  /**
   * Performs the on touch move operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onTouchMove(event: TouchEvent) {
    if (this.disabled || !this.isDragging) return;

    event.preventDefault();
    const touch = event.touches[0];
    this.updateSwipe(touch.clientX);
  }

  /**
   * Performs the on touch end operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  onTouchEnd(_event: TouchEvent) {
    if (this.disabled) return;

    this.endSwipe();
  }

  /**
   * Performs the on mouse down operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onMouseDown(event: MouseEvent) {
    if (this.disabled || window.innerWidth >= 768) return; // Disable on desktop

    this.isMouseEvent = true;
    this.startSwipe(event.clientX);
    event.preventDefault();
  }

  /**
   * Performs the on mouse move operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onMouseMove(event: MouseEvent) {
    if (this.disabled || !this.isDragging || !this.isMouseEvent) return;

    this.updateSwipe(event.clientX);
    event.preventDefault();
  }

  /**
   * Performs the on mouse up operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  onMouseUp(_event: MouseEvent) {
    if (this.disabled || !this.isMouseEvent) return;

    this.endSwipe();
  }

  /**
   * Performs the on mouse leave operation.
   * @param _event - The event.
   * @returns The result of the operation.
   */
  onMouseLeave(_event: MouseEvent) {
    if (this.disabled || !this.isMouseEvent) return;

    this.endSwipe();
  }

  private startSwipe(clientX: number) {
    this.startX = clientX;
    this.currentX = clientX;
    this.isDragging = true;
    this.isSwiping = true;
    this.swipeStart.emit();
  }

  private updateSwipe(clientX: number) {
    this.currentX = clientX;
    const deltaX = this.startX - this.currentX;

    // Only allow left swipe (positive deltaX)
    if (deltaX > 0) {
      this.translateX = -Math.min(deltaX, this.maxSwipeDistance);
      this.actionsVisible = Math.abs(this.translateX) > this.swipeThreshold / 2;
    } else {
      this.translateX = 0;
      this.actionsVisible = false;
    }
  }

  private endSwipe() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.isSwiping = false;

    const deltaX = this.startX - this.currentX;

    if (deltaX > this.swipeThreshold) {
      // Swipe threshold reached - show actions
      this.translateX = -this.maxSwipeDistance;
      this.actionsVisible = true;
    } else {
      // Snap back to original position
      this.resetSwipe();
    }

    this.swipeEnd.emit();
  }

  /**
   * Performs the on action click operation.
   * @param action - The action.
   * @returns The result of the operation.
   */
  onActionClick(action: SwipeAction) {
    this.swipeAction.emit({ action, item: this.item });
    this.resetSwipe();
  }

  /**
   * Performs the reset swipe operation.
   * @returns The result of the operation.
   */
  resetSwipe() {
    this.translateX = 0;
    this.actionsVisible = false;
    this.isDragging = false;
    this.isSwiping = false;
    this.isMouseEvent = false;
  }

  // Public method to reset swipe programmatically
  /**
   * Performs the reset operation.
   * @returns The result of the operation.
   */
  public reset() {
    this.resetSwipe();
  }

  // Public method to show actions programmatically
  /**
   * Performs the show actions operation.
   * @returns The result of the operation.
   */
  public showActions() {
    this.translateX = -this.maxSwipeDistance;
    this.actionsVisible = true;
  }
}
