import type { TableColumn } from './data-table.component';

/**
 * Column configuration interface for display utilities.
 */
export interface ColumnDisplayConfig {
  priority?: 'high' | 'medium' | 'low';
  mobileLabel?: string;
  truncateLength?: number;
  label: string;
}

/**
 * Utility class for table column display operations.
 */
export class DataTableDisplayUtil {
  /**
   * Retrieves column CSS classes based on priority.
   * @param column - The column configuration.
   * @returns Space-separated CSS class string.
   */
  public static getColumnClasses(column: ColumnDisplayConfig): string {
    const classes: string[] = [];

    if (column.priority) {
      classes.push(`priority-${column.priority}`);
    }

    // Add responsive column classes
    if (column.priority === 'high') {
      classes.push('column-primary');
    } else {
      classes.push('column-secondary');
    }

    return classes.join(' ');
  }

  /**
   * Retrieves column label, using mobile label on small screens if available.
   * @param column - The column configuration.
   * @returns The appropriate label string.
   */
  public static getColumnLabel(column: ColumnDisplayConfig): string {
    // Use mobile label on small screens if available
    if (typeof window !== 'undefined' && window.innerWidth <= 768 && column.mobileLabel) {
      return column.mobileLabel;
    }
    return column.label;
  }

  /**
   * Retrieves truncated value based on column truncation settings.
   * @param value - The cell value to truncate.
   * @param truncateLength - Maximum length before truncation.
   * @returns Truncated string with ellipsis if needed.
   */
  public static getTruncatedValue(value: unknown, truncateLength?: number): string {
    const text = String(value || '');

    if (truncateLength && text.length > truncateLength) {
      return text.substring(0, truncateLength) + '...';
    }

    return text;
  }

  /**
   * Determines if tooltip should be shown based on truncation.
   * @param value - The cell value.
   * @param truncateLength - Maximum length before truncation.
   * @returns Whether to show tooltip.
   */
  public static shouldShowTooltip(value: unknown, truncateLength?: number): boolean {
    if (!truncateLength) return false;

    const text = String(value || '');
    return text.length > truncateLength;
  }
}

/**
 * Utility class for exporting table data to CSV format.
 */
export class DataTableExportUtil {
  /**
   * Converts table data to CSV string.
   * @param data - The data rows to convert.
   * @param columns - The column definitions.
   * @param getCellValue - Function to extract cell value from row.
   * @returns CSV string representation of the data.
   */
  public static convertToCSV<T>(
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
   * Downloads CSV data as a file.
   * @param csv - The CSV content string.
   * @param filename - The name of the file to download.
   */
  public static downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports table data to CSV and triggers download.
   * @param data - The data rows to export.
   * @param columns - The column definitions.
   * @param getCellValue - Function to extract cell value from row.
   * @param filename - The name of the file to download (default: 'data-export.csv').
   */
  public static exportTableData<T>(
    data: T[],
    columns: TableColumn[],
    getCellValue: (row: T, key: string) => unknown,
    filename = 'data-export.csv',
  ): void {
    const csv = this.convertToCSV(data, columns, getCellValue);
    this.downloadCSV(csv, filename);
  }
}
