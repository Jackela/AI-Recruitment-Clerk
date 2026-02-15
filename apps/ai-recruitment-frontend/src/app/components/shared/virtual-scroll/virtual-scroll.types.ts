/**
 * Virtual scroll type definitions.
 */

/**
 * Defines the shape of the virtual scroll configuration.
 * @template T - The type of items in the scroll list.
 */
export interface VirtualScrollConfig<T = unknown> {
  /** Fixed height of each item in pixels. */
  itemHeight: number;
  /** Number of extra items to render above/below viewport. Default: 5 */
  bufferSize?: number;
  /** Function to track items by unique key for better change detection. */
  trackBy?: (index: number, item: T) => unknown;
  /** Enable smooth scrolling behavior. Default: false */
  enableSmoothScroll?: boolean;
  /** Enable infinite scroll with load more trigger. Default: false */
  enableInfiniteScroll?: boolean;
  /** Percentage threshold to trigger load more (0-100). Default: 80 */
  infiniteScrollThreshold?: number;
  /** Enable dynamic item height measurement. Default: false */
  enableDynamicHeight?: boolean;
  /** Estimated height for items before measurement. Default: itemHeight */
  estimatedItemHeight?: number;
}

/**
 * Represents the current scroll state of the container.
 */
export interface ScrollState {
  /** Current scroll position from top in pixels. */
  scrollTop: number;
  /** Total scrollable height in pixels. */
  scrollHeight: number;
  /** Visible viewport height in pixels. */
  clientHeight: number;
}

/**
 * Default virtual scroll configuration values.
 */
export const DEFAULT_VIRTUAL_SCROLL_CONFIG: VirtualScrollConfig = {
  itemHeight: 50,
  bufferSize: 5,
  enableSmoothScroll: false,
  enableInfiniteScroll: false,
  infiniteScrollThreshold: 80,
  enableDynamicHeight: false,
  estimatedItemHeight: 50,
} as const;
