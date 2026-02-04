import type {
  DestroyRef,
  OnInit} from '@angular/core';
import {
  Directive,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Pull-to-refresh directive.
 * Adds pull-to-refresh gesture handling to any element.
 *
 * @example
 * ```html
 * <div arcPullToRefresh (refresh)="onRefresh()">
 *   <p>Pull down to refresh</p>
 * </div>
 * ```
 */
@Directive({
  selector: '[arcPullToRefresh]',
  standalone: true,
})
export class PullToRefreshDirective implements OnInit {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Distance threshold to trigger refresh (in pixels).
   */
  public readonly threshold = input<number>(100);

  /**
   * Distance to show the indicator (in pixels).
   */
  public readonly visibleThreshold = input<number>(20);

  /**
   * Emitted when the user triggers a refresh by pulling past the threshold.
   */
  public readonly refresh = output<void>();

  /**
   * Emits the visibility state of the pull indicator.
   */
  public readonly indicatorVisible = output<boolean>();

  private startY = 0;
  private startX = 0;
  private currentY = 0;
  private currentX = 0;
  private isPulling = false;
  private touchIdentifier: number | null = null;
  private isIndicatorVisible = false;

  /**
   * Performs the ng on init operation.
   */
  public ngOnInit(): void {
    this.setupGestureHandlers();
  }

  /**
   * Sets up pull-to-refresh gesture handling.
   */
  private setupGestureHandlers(): void {
    const handleTouchStart = this.handleTouchStart.bind(this);
    const handleTouchMove = this.handleTouchMove.bind(this);
    const handleTouchEnd = this.handleTouchEnd.bind(this);
    const handleTouchCancel = this.handleTouchCancel.bind(this);

    document.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, {
      passive: true,
    });

    // Clean up event listeners on destroy
    takeUntilDestroyed()(this.destroyRef).subscribe(() => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    });
  }

  /**
   * Handles touch start event.
   */
  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    this.touchIdentifier = touch.identifier;
    this.startY = touch.clientY;
    this.startX = touch.clientX;
    this.currentY = this.startY;
    this.currentX = this.startX;
    this.isPulling = false;
  }

  /**
   * Handles touch move event.
   */
  private handleTouchMove(e: TouchEvent): void {
    if (this.touchIdentifier === null) return;

    const targetTouch = this.findTouchByIdentifier(e);
    if (!targetTouch) return;

    this.currentY = targetTouch.clientY;
    this.currentX = targetTouch.clientX;
    const deltaY = this.currentY - this.startY;
    const deltaX = Math.abs(this.currentX - this.startX);
    const isVerticalPull = deltaY > 0;
    const isHorizontalScroll = deltaX > 30;
    const isPrimaryVertical = Math.abs(deltaY) > deltaX * 1.5;

    if (isVerticalPull && !isHorizontalScroll && isPrimaryVertical) {
      this.isPulling = true;

      if (deltaY > this.visibleThreshold() && deltaY < this.threshold()) {
        this.setIndicatorVisibility(true);
      } else if (deltaY >= this.threshold()) {
        this.setIndicatorVisibility(true);

        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        if (deltaY > deltaX * 2) {
          e.preventDefault();
        }
      }
    } else if (isHorizontalScroll || !isPrimaryVertical) {
      this.setIndicatorVisibility(false);
      this.isPulling = false;
    }
  }

  /**
   * Handles touch end event.
   */
  private handleTouchEnd(e: TouchEvent): void {
    if (this.touchIdentifier === null) {
      this.resetPullState();
      return;
    }

    const touchEnded = !this.touchExistsInList(e);
    if (touchEnded) {
      const deltaY = this.currentY - this.startY;
      const deltaX = Math.abs(this.currentX - this.startX);

      if (this.isPulling && deltaY >= this.threshold() && deltaX < 50) {
        this.triggerRefresh();
      } else {
        this.resetPullState();
      }

      this.touchIdentifier = null;
    }
  }

  /**
   * Handles touch cancel event.
   */
  private handleTouchCancel(): void {
    this.resetPullState();
    this.touchIdentifier = null;
  }

  /**
   * Finds a touch in the touch list by identifier.
   */
  private findTouchByIdentifier(e: TouchEvent): Touch | null {
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchIdentifier) {
        return e.touches[i];
      }
    }
    return null;
  }

  /**
   * Checks if the current touch identifier still exists in the touch list.
   */
  private touchExistsInList(e: TouchEvent): boolean {
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchIdentifier) {
        return true;
      }
    }
    return false;
  }

  /**
   * Sets the indicator visibility state.
   */
  private setIndicatorVisibility(visible: boolean): void {
    if (this.isIndicatorVisible !== visible) {
      this.isIndicatorVisible = visible;
      this.indicatorVisible.emit(visible);
    }
  }

  /**
   * Resets the pull-to-refresh state.
   */
  private resetPullState(): void {
    this.isPulling = false;
    this.setIndicatorVisibility(false);
  }

  /**
   * Triggers the refresh action.
   */
  private triggerRefresh(): void {
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]);
    }

    this.refresh.emit();
    this.resetPullState();
  }
}
