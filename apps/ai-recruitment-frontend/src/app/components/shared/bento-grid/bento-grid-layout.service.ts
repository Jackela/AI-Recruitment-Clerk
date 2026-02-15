import { Injectable } from '@angular/core';

/**
 * Configuration for bento grid layout.
 */
export interface BentoGridLayoutConfig {
  gridSize: 'compact' | 'default' | 'wide';
  minColumnWidth: number;
  maxColumns?: number;
}

/**
 * Result of grid calculation.
 */
export interface BentoGridLayoutResult {
  columns: number;
  gridTemplate: string;
}

/**
 * Service for calculating bento grid layout.
 * Handles dynamic column calculation based on container size and grid configuration.
 */
@Injectable({ providedIn: 'root' })
export class BentoGridLayoutService {
  /**
   * Calculates optimal grid columns based on container width and configuration.
   * @param containerWidth - The container width in pixels.
   * @param config - The grid configuration.
   * @returns The layout result with column count and grid template.
   */
  public calculateColumns(
    containerWidth: number,
    config: BentoGridLayoutConfig,
  ): BentoGridLayoutResult {
    if (containerWidth === 0) {
      return this.getDefaultLayout(config);
    }

    const maxColumns = this.getMaxColumns(config);
    const minColumns = 1;

    // Calculate based on minimum column width
    let columns = Math.floor(containerWidth / config.minColumnWidth);
    columns = Math.min(columns, maxColumns);
    columns = Math.max(columns, minColumns);

    // Check for content overflow
    if (this.wouldCauseOverflow(containerWidth, columns, config.gridSize)) {
      columns = Math.max(columns - 1, minColumns);
    }

    return {
      columns,
      gridTemplate: `repeat(${columns}, 1fr)`,
    };
  }

  /**
   * Gets the default layout for a given grid size.
   * @param config - The grid configuration.
   * @returns The default layout result.
   */
  public getDefaultLayout(config: BentoGridLayoutConfig): BentoGridLayoutResult {
    const maxColumns = this.getMaxColumns(config);
    const columns = Math.min(4, maxColumns);

    return {
      columns,
      gridTemplate: `repeat(${columns}, 1fr)`,
    };
  }

  /**
   * Gets the maximum columns allowed for a grid size.
   * @param config - The grid configuration.
   * @returns The maximum column count.
   */
  public getMaxColumns(config: BentoGridLayoutConfig): number {
    if (config.maxColumns) {
      return config.maxColumns;
    }

    switch (config.gridSize) {
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

  /**
   * Checks if calculated columns would cause content overflow.
   * @param containerWidth - The container width in pixels.
   * @param columns - The number of columns.
   * @param gridSize - The grid size variant.
   * @returns Whether overflow would occur.
   */
  public wouldCauseOverflow(
    containerWidth: number,
    columns: number,
    gridSize: BentoGridLayoutConfig['gridSize'],
  ): boolean {
    if (columns <= 1) {
      return false;
    }

    const availableWidth = containerWidth / columns;
    const minimumViableWidth = gridSize === 'compact' ? 200 : 280;

    return availableWidth < minimumViableWidth;
  }

  /**
   * Checks if an item should be displayed in single column mode on mobile.
   * @param currentColumns - The current number of columns.
   * @param itemSize - The item size variant.
   * @returns Whether single column mode should be applied.
   */
  public shouldUseSingleColumn(
    currentColumns: number,
    itemSize: 'large' | 'wide' | 'feature' | string,
  ): boolean {
    return (
      currentColumns <= 2 &&
      (itemSize === 'large' || itemSize === 'wide' || itemSize === 'feature')
    );
  }

  /**
   * Creates a debounced version of a function.
   * @param func - The function to debounce.
   * @param wait - The debounce delay in milliseconds.
   * @returns The debounced function.
   */
  public debounce<T extends (...args: unknown[]) => unknown>(
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
}
