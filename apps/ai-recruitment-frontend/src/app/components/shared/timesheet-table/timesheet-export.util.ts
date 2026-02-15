import type { TimesheetColumn } from '../../../../lib/config/table-config';
import type { TimesheetEntry } from './timesheet-table.component';

/**
 * Timesheet export utilities
 */
export class TimesheetExportUtil {
  /**
   * Convert timesheet data to CSV format
   */
  public static convertToCSV(
    data: TimesheetEntry[],
    columns: TimesheetColumn[]
  ): string {
    if (data.length === 0) return '';

    // Use displayed columns for export
    const headers = columns.map((col) => col.label);
    const csvHeaders = headers.join(',');

    // Convert data rows
    const csvRows = data.map((entry) => {
      return columns
        .map((col) => {
          let value = TimesheetExportUtil.getCellValue(entry, col.key);

          // Format values based on column type
          if (col.type === 'boolean') {
            value = value ? '是' : '否';
          } else if (col.type === 'date') {
            value = new Date(String(value)).toLocaleDateString('zh-CN');
          } else if (col.key === 'duration') {
            value = TimesheetExportUtil.formatDuration(value);
          } else if (col.key === 'status') {
            value = TimesheetExportUtil.getStatusLabel(value);
          }

          // Escape commas and quotes
          const escaped = String(value || '').replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Trigger CSV download
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
   * Export timesheet data with default filename
   */
  public static exportData(
    data: TimesheetEntry[],
    columns: TimesheetColumn[]
  ): void {
    const csv = TimesheetExportUtil.convertToCSV(data, columns);
    const filename = `timesheet-export-${new Date().toISOString().split('T')[0]}.csv`;
    TimesheetExportUtil.downloadCSV(csv, filename);
  }

  /**
   * Get nested property value from entry
   */
  private static getCellValue(entry: TimesheetEntry, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = entry;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  /**
   * Format duration to Chinese text
   */
  private static formatDuration(duration: unknown): string {
    const hours = Number(duration || 0);
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours}小时`;
    }
    return `${wholeHours}小时${minutes}分钟`;
  }

  /**
   * Get Chinese status label
   */
  private static getStatusLabel(status: unknown): string {
    const statusLabels: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return statusLabels[String(status)] || String(status);
  }
}
