import { fromEvent, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

/**
 * Generic element reference interface to avoid Angular decorator requirements.
 */
export interface GenericElementRef<T extends HTMLElement> {
  nativeElement: T;
}

/**
 * Configuration for scroll detection.
 */
export interface ScrollDetectionConfig {
  tableWrapper: GenericElementRef<HTMLDivElement>;
  destroy$: Subject<void>;
  onScrollChange: (hasScroll: boolean) => void;
}

/**
 * Utility class for table scroll detection.
 * Note: This is a plain utility class, not an Angular component.
 */
export class DataTableScrollUtil {
  private resizeObserver?: ResizeObserver;
  private destroy$: Subject<void>;

  constructor() {
    this.destroy$ = new Subject<void>();
  }

  /**
   * Sets up scroll detection on a table wrapper element.
   * @param config - The scroll detection configuration.
   * @returns Cleanup function to remove listeners.
   */
  public static setupScrollDetection(config: ScrollDetectionConfig): () => void {
    const { tableWrapper, destroy$, onScrollChange } = config;

    if (!tableWrapper?.nativeElement) {
      return () => {};
    }

    const scrollElement = tableWrapper.nativeElement;

    const scrollSubscription = fromEvent(scrollElement, 'scroll')
      .pipe(debounceTime(50), takeUntil(destroy$))
      .subscribe(() => {
        const hasScroll = this.checkHorizontalScroll(tableWrapper);
        onScrollChange(hasScroll);
      });

    return () => {
      scrollSubscription.unsubscribe();
    };
  }

  /**
   * Sets up resize observer for scroll detection.
   * @param config - The scroll detection configuration.
   * @returns The ResizeObserver instance for cleanup.
   */
  public static setupResizeObserver(config: ScrollDetectionConfig): ResizeObserver | undefined {
    const { tableWrapper, onScrollChange } = config;

    if (!tableWrapper?.nativeElement || !('ResizeObserver' in window)) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      const hasScroll = this.checkHorizontalScroll(tableWrapper);
      onScrollChange(hasScroll);
    });

    resizeObserver.observe(tableWrapper.nativeElement);
    return resizeObserver;
  }

  /**
   * Checks if the table has horizontal scroll.
   * @param tableWrapper - The table wrapper element reference.
   * @returns Whether horizontal scroll is present.
   */
  public static checkHorizontalScroll(tableWrapper: GenericElementRef<HTMLDivElement>): boolean {
    if (!tableWrapper?.nativeElement) {
      return false;
    }

    const element = tableWrapper.nativeElement;
    const table = element.querySelector('.data-table') as HTMLElement;

    if (table) {
      return table.scrollWidth > element.clientWidth;
    }

    return false;
  }

  /**
   * Cleans up resources.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
