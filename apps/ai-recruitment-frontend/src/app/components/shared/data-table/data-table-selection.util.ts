/**
 * Utility class for table selection operations.
 */
export class DataTableSelectionUtil {
  /**
   * Checks if a row is selected.
   * @param row - The row to check.
   * @param selectedRows - The array of selected rows.
   * @returns Whether the row is selected.
   */
  public static isSelected<T>(row: T, selectedRows: T[]): boolean {
    return selectedRows.includes(row);
  }

  /**
   * Checks if all items in the current page are selected.
   * @param pageData - The data on the current page.
   * @param selectedRows - The array of selected rows.
   * @returns Whether all page items are selected.
   */
  public static isAllSelected<T>(pageData: T[], selectedRows: T[]): boolean {
    return pageData.length > 0 && pageData.every((row) => selectedRows.includes(row));
  }

  /**
   * Checks if some (but not all) items in the current page are selected.
   * @param pageData - The data on the current page.
   * @param selectedRows - The array of selected rows.
   * @returns Whether some page items are selected.
   */
  public static isSomeSelected<T>(pageData: T[], selectedRows: T[]): boolean {
    return pageData.some((row) => selectedRows.includes(row)) && !this.isAllSelected(pageData, selectedRows);
  }

  /**
   * Toggles selection of a single row.
   * @param row - The row to toggle.
   * @param selectedRows - The current array of selected rows.
   * @param multiSelect - Whether multi-select is enabled.
   * @returns The new array of selected rows.
   */
  public static toggleSelect<T>(row: T, selectedRows: T[], multiSelect: boolean): T[] {
    const selected = [...selectedRows];
    const index = selected.indexOf(row);

    if (index > -1) {
      selected.splice(index, 1);
    } else {
      if (multiSelect) {
        selected.push(row);
      } else {
        selected.length = 0;
        selected.push(row);
      }
    }

    return selected;
  }

  /**
   * Toggles selection of all items on the current page.
   * @param pageData - The data on the current page.
   * @param selectedRows - The current array of selected rows.
   * @returns The new array of selected rows.
   */
  public static toggleSelectAll<T>(pageData: T[], selectedRows: T[]): T[] {
    const selected = [...selectedRows];
    const allSelected = this.isAllSelected(pageData, selectedRows);

    if (allSelected) {
      // Deselect all on current page
      pageData.forEach((row) => {
        const index = selected.indexOf(row);
        if (index > -1) {
          selected.splice(index, 1);
        }
      });
    } else {
      // Select all on current page
      pageData.forEach((row) => {
        if (!selected.includes(row)) {
          selected.push(row);
        }
      });
    }

    return selected;
  }
}
