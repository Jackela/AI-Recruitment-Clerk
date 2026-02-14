import type { SortEvent } from './data-table.component';

/**
 * Represents the current sort state.
 */
export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc' | null;
}

/**
 * Utility class for table sorting operations.
 */
export class DataTableSortingUtil {
  /**
   * Sorts an array of data based on the current sort state.
   * @param data - The data array to sort.
   * @param sortColumn - The column to sort by.
   * @param sortDirection - The sort direction ('asc' or 'desc').
   * @param getCellValue - Function to extract cell value from row.
   * @returns A new sorted array.
   */
  public static sortData<T>(
    data: T[],
    sortColumn: string | null,
    sortDirection: 'asc' | 'desc' | null,
    getCellValue: (row: T, key: string) => unknown,
  ): T[] {
    if (!sortColumn || !sortDirection) {
      return [...data];
    }

    return [...data].sort((a, b) => {
      const aVal = getCellValue(a, sortColumn);
      const bVal = getCellValue(b, sortColumn);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Calculates the next sort direction for a column.
   * Cycles through: asc -> desc -> null (no sort) -> asc
   * @param currentColumn - The currently sorted column.
   * @param currentDirection - The current sort direction.
   * @param targetColumn - The column being clicked.
   * @returns The next sort direction.
   */
  public static getNextSortDirection(
    currentColumn: string | null,
    currentDirection: 'asc' | 'desc' | null,
    targetColumn: string,
  ): 'asc' | 'desc' | null {
    if (currentColumn !== targetColumn) {
      return 'asc';
    }

    if (currentDirection === 'asc') {
      return 'desc';
    } else if (currentDirection === 'desc') {
      return null;
    } else {
      return 'asc';
    }
  }

  /**
   * Handles sort column click, returning the new sort state.
   * @param currentState - The current sort state.
   * @param column - The column that was clicked.
   * @returns The new sort state.
   */
  public static handleSortClick(
    currentState: SortState,
    column: string,
  ): SortState {
    const nextDirection = this.getNextSortDirection(
      currentState.column,
      currentState.direction,
      column,
    );

    if (nextDirection === null) {
      return { column: null, direction: null };
    }

    return { column, direction: nextDirection };
  }

  /**
   * Creates a sort event from the current sort state.
   * @param state - The current sort state.
   * @returns A SortEvent object or null if not sorting.
   */
  public static createSortEvent(state: SortState): SortEvent | null {
    if (!state.column) {
      return null;
    }
    return {
      column: state.column,
      direction: state.direction,
    };
  }
}
