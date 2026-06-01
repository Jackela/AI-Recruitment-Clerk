import type { OnDestroy } from '@angular/core';
import { Directive, ElementRef, inject, input, output } from '@angular/core';

/**
 * Infinite scroll directive for loading more data on scroll.
 * Usage: <div arcInfiniteScroll (scrolled)="loadMore()"></div>
 */
@Directive({
  selector: '[arcInfiniteScroll]',
  standalone: true,
})
export class InfiniteScrollDirective implements OnDestroy {
  private elementRef = inject(ElementRef);

  /**
   * Scroll threshold percentage (0-100) before triggering scroll event.
   */
  public readonly scrollThreshold = input<number>(80);

  /**
   * Whether infinite scroll is enabled.
   */
  public readonly infiniteScrollEnabled = input<boolean>(true);

  /**
   * Emitted when scroll reaches threshold.
   */
  public readonly scrolled = output<void>();

  private isThrottled = false;

  constructor() {
    const element = this.elementRef.nativeElement;
    element.addEventListener('scroll', this.onScroll.bind(this));
  }

  /**
   * Performs the ng on destroy operation.
   */
  public ngOnDestroy(): void {
    const element = this.elementRef.nativeElement;
    element.removeEventListener('scroll', this.onScroll.bind(this));
  }

  /**
   * Handles scroll events.
   */
  private onScroll(): void {
    if (!this.infiniteScrollEnabled() || this.isThrottled) {
      return;
    }

    const element = this.elementRef.nativeElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const scrollPercentage = ((scrollTop + clientHeight) / scrollHeight) * 100;

    if (scrollPercentage >= this.scrollThreshold()) {
      this.scrolled.emit();
      this.throttle();
    }
  }

  /**
   * Throttles scroll events to prevent excessive calls.
   */
  private throttle(): void {
    this.isThrottled = true;
    setTimeout(() => {
      this.isThrottled = false;
    }, 200);
  }
}
