import { Injectable } from '@angular/core';
import type { TableColumn } from './data-table.component';

/**
 * Sort event interface.
 */
export interface SortEvent {
  column: string;
  direction: 'asc' | 'desc' | null;
}

/**
 * Utility service for data table operations.
 * Provides filtering, sorting, and export functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class DataTableUtilService {
  /**
   * Get cell value from row by key path.
   * Supports nested properties using dot notation.
   */
  public getCellValue<T extends Record<string, unknown>>(
    row: T,
    key: string,
  ): unknown {
    const keys = key.split('.');
    let value: unknown = row;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  /**
   * Filter data by search term across all filterable columns.
   */
  public filterData<T extends Record<string, unknown>>(
    data: T[],
    searchTerm: string,
    columns: TableColumn[],
  ): T[] {
    if (!searchTerm) {
      return data;
    }

    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      return columns.some((col) => {
        if (col.filterable !== false) {
          const value = this.getCellValue(row, col.key);
          return value?.toString().toLowerCase().includes(term);
        }
        return false;
      });
    });
  }

  /**
   * Sort data by column and direction.
   */
  public sortData<T extends Record<string, unknown>>(
    data: T[],
    sortColumn: string | null,
    sortDirection: 'asc' | 'desc' | null,
    getCellValue: (row: T, key: string) => unknown,
  ): T[] {
    if (!sortColumn || !sortDirection) {
      return data;
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
   * Get next sort direction for column clicks.
   */
  public getNextSortDirection(
    currentColumn: string | null,
    currentDirection: 'asc' | 'desc' | null,
    clickedColumn: string,
  ): 'asc' | 'desc' | null {
    if (currentColumn !== clickedColumn) {
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
   * Convert data to CSV format for export.
   */
  public convertToCSV<T extends Record<string, unknown>>(
    data: T[],
    columns: TableColumn[],
    getCellValue: (row: T, key: string) => unknown,
  ): string {
    if (data.length === 0) return '';

    // Headers
    const headers = columns.map((col) => col.label);
    const csvHeaders = headers.join(',');

    // Rows
    const csvRows = data.map((row) => {
      return columns
        .map((col) => {
          const value = getCellValue(row, col.key);
          // Escape commas and quotes
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Download CSV file.
   */
  public downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Check if text should be truncated.
   */
  public shouldShowTooltip(
    row: Record<string, unknown>,
    column: TableColumn,
    getCellValue: (row: Record<string, unknown>, key: string) => unknown,
  ): boolean {
    if (!column.truncateLength) return false;

    const value = getCellValue(row, column.key);
    const text = String(value || '');

    return text.length > column.truncateLength;
  }

  /**
   * Get truncated text value.
   */
  public getTruncatedValue(
    row: Record<string, unknown>,
    column: TableColumn,
    getCellValue: (row: Record<string, unknown>, key: string) => unknown,
  ): string {
    const value = getCellValue(row, column.key);
    const text = String(value || '');

    if (column.truncateLength && text.length > column.truncateLength) {
      return text.substring(0, column.truncateLength) + '...';
    }

    return text;
  }

  /**
   * Get column label (mobile vs desktop).
   */
  public getColumnLabel(column: TableColumn): string {
    // Use mobile label on small screens if available
    if (typeof window !== 'undefined' && window.innerWidth <= 768 && column.mobileLabel) {
      return column.mobileLabel;
    }
    return column.label;
  }

  /**
   * Get column CSS classes.
   */
  public getColumnClasses(column: TableColumn): string {
    const classes: string[] = [];

    if (column.priority) {
      classes.push(`priority-${column.priority}`);
    }

    // Add responsive column classes
    if (column.priority === 'high') {
      classes.push('column-primary');
    } else if (column.priority === 'medium') {
      classes.push('column-secondary');
    } else {
      classes.push('column-secondary');
    }

    return classes.join(' ');
  }
}

// SortEvent is exported from the main data-table component file
