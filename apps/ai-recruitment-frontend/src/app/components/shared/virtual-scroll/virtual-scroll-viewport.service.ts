import { Injectable, signal, computed } from '@angular/core';
import type { VirtualScrollConfig, ScrollState } from './virtual-scroll.types';

/**
 * Service for managing virtual scroll viewport calculations.
 * Handles all logic related to determining which items should be visible
 * and how much spacer height is needed.
 *
 * @template T - The type of items in the scroll list.
 */
@Injectable({
  providedIn: 'root',
})
export class VirtualScrollViewportService<T = unknown> {
  private config!: VirtualScrollConfig<T>;
  private items: T[] = [];

  /** Cache for dynamically measured item heights. */
  private itemHeightCache = new Map<T, number>();

  /** Current scroll state. */
  public scrollState = signal<ScrollState>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });

  /** Loading state for infinite scroll. */
  public isLoading = signal(false);

  /**
   * Initialize the service with configuration and items.
   */
  public initialize(config: VirtualScrollConfig<T>, items: T[]): void {
    this.config = config;
    this.items = items;
  }

  /**
   * Update the items list.
   */
  public updateItems(items: T[]): void {
    this.items = items;
  }

  /**
   * Update the scroll state.
   */
  public updateScrollState(state: ScrollState): void {
    this.scrollState.set(state);
  }

  /**
   * Calculate the start index of visible items based on scroll position.
   * Includes buffer for smooth scrolling.
   */
  public readonly startIndex = computed(() => {
    const scrollTop = this.scrollState().scrollTop;
    const bufferSize = this.config?.bufferSize || 5;
    const index =
      Math.floor(scrollTop / this.getAverageItemHeight()) - bufferSize;
    return Math.max(0, index);
  });

  /**
   * Calculate the end index of visible items based on scroll position.
   * Includes buffer for smooth scrolling.
   */
  public readonly endIndex = computed(() => {
    const scrollTop = this.scrollState().scrollTop;
    const clientHeight = this.scrollState().clientHeight;
    const bufferSize = this.config?.bufferSize || 5;
    const itemHeight = this.getAverageItemHeight();
    const index =
      Math.ceil((scrollTop + clientHeight) / itemHeight) + bufferSize;
    return Math.min(this.items.length, index);
  });

  /**
   * Get the slice of items that should be visible.
   */
  public readonly visibleItems = computed(() => {
    const start = this.startIndex();
    const end = this.endIndex();
    return this.items.slice(start, end);
  });

  /**
   * Calculate the height of the top spacer based on items before the start index.
   */
  public readonly topSpacerHeight = computed(() => {
    const start = this.startIndex();
    if (this.config?.enableDynamicHeight) {
      let height = 0;
      for (let i = 0; i < start; i++) {
        height += this.getItemHeight(this.items[i], i);
      }
      return height;
    }
    return start * (this.config?.itemHeight || 50);
  });

  /**
   * Calculate the height of the bottom spacer based on items after the end index.
   */
  public readonly bottomSpacerHeight = computed(() => {
    const end = this.endIndex();
    const total = this.items.length;
    if (this.config?.enableDynamicHeight) {
      let height = 0;
      for (let i = end; i < total; i++) {
        height += this.getItemHeight(this.items[i], i);
      }
      return height;
    }
    return (total - end) * (this.config?.itemHeight || 50);
  });

  /**
   * Content offset for smooth rendering transformations.
   */
  public readonly contentOffset = computed(() => 0);

  /**
   * Calculate scroll percentage for infinite scroll triggering.
   */
  public readonly scrollPercentage = computed(() => {
    const { scrollTop, scrollHeight, clientHeight } = this.scrollState();
    if (scrollHeight <= clientHeight) return 0;
    return (scrollTop / (scrollHeight - clientHeight)) * 100;
  });

  /**
   * Check if infinite scroll should trigger.
   */
  public shouldTriggerLoadMore(): boolean {
    const percentage = this.scrollPercentage();
    const threshold = this.config?.infiniteScrollThreshold || 80;
    return percentage >= threshold && !this.isLoading();
  }

  /**
   * Get the height of a specific item.
   * Uses cached value if available, otherwise returns estimated height.
   */
  public getItemHeight(item: T, _index: number): number {
    if (!this.config?.enableDynamicHeight) {
      return this.config.itemHeight;
    }

    const cached = this.itemHeightCache.get(item);
    if (cached) {
      return cached;
    }

    return this.config.estimatedItemHeight || this.config.itemHeight;
  }

  /**
   * Set the measured height for an item.
   */
  public setItemHeight(item: T, height: number): void {
    this.itemHeightCache.set(item, height);
  }

  /**
   * Calculate the average item height based on cached measurements.
   */
  public getAverageItemHeight(): number {
    if (!this.config?.enableDynamicHeight) {
      return this.config.itemHeight;
    }

    if (this.itemHeightCache.size === 0) {
      return this.config.estimatedItemHeight || this.config.itemHeight;
    }

    const total = Array.from(this.itemHeightCache.values()).reduce(
      (sum, h) => sum + h,
      0,
    );
    return total / this.itemHeightCache.size;
  }

  /**
   * Clear the item height cache.
   */
  public clearHeightCache(): void {
    this.itemHeightCache.clear();
  }

  /**
   * Get the start index for external use.
   */
  public getStartIndex(): number {
    return this.startIndex();
  }

  /**
   * Track items by unique key for change detection.
   */
  public trackByFn(index: number, item: T): unknown {
    if (this.config?.trackBy) {
      return this.config.trackBy(this.startIndex() + index, item);
    }
    return (item as Record<string, unknown>)?.['id'] || index;
  }
}
