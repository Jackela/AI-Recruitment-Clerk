import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { TimesheetColumn } from '../../../../lib/config/table-config';
import type { TimesheetEntry } from './timesheet-table.component';

/**
 * TimesheetCellComponent - Handles individual cell rendering with formatting
 */
@Component({
  selector: 'td[arc-timesheet-cell]',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Dynamic cell content based on column type and timesheet-specific formatting -->
    <span [ngSwitch]="column.type">
      <!-- Boolean display for billable status -->
      <span *ngSwitchCase="'boolean'">
        <span
          class="badge"
          [class.badge-success]="cellValue"
          [class.badge-danger]="!cellValue"
        >
          {{ cellValue ? '可计费' : '不计费' }}
        </span>
      </span>

      <!-- Date formatting -->
      <span *ngSwitchCase="'date'">
        {{ cellValue | date: 'yyyy-MM-dd' }}
      </span>

      <!-- Number formatting for duration -->
      <span *ngSwitchCase="'number'">
        <span *ngIf="column.key === 'duration'" class="duration-display">
          {{ formatDuration(cellValue) }}
        </span>
        <span *ngIf="column.key !== 'duration'">
          {{ cellValue | number: '1.0-2' }}
        </span>
      </span>

      <!-- Status display with badges -->
      <span *ngSwitchCase="'text'" [ngSwitch]="column.key">
        <span *ngSwitchCase="'status'">
          <span
            class="status-badge"
            [class.status-draft]="cellValue === 'draft'"
            [class.status-submitted]="cellValue === 'submitted'"
            [class.status-approved]="cellValue === 'approved'"
            [class.status-rejected]="cellValue === 'rejected'"
          >
            {{ getStatusLabel(cellValue) }}
          </span>
        </span>

        <!-- Time formatting for start/end times -->
        <span *ngSwitchCase="'startTime'">
          {{ formatTime(cellValue, column.timeFormat) }}
        </span>
        <span *ngSwitchCase="'endTime'">
          {{ formatTime(cellValue, column.timeFormat) }}
        </span>

        <!-- Default text with truncation -->
        <span *ngSwitchDefault>
          {{ truncatedValue }}
        </span>
      </span>
    </span>
  `,
})
export class TimesheetCellComponent {
  @Input({ required: true }) public entry!: TimesheetEntry;
  @Input({ required: true }) public column!: TimesheetColumn;

  @HostBinding('attr.title') public get titleAttr(): string | null {
    return this.shouldShowTooltip() ? String(this.cellValue || '') : null;
  }

  @HostBinding('style.text-align') public get textAlign(): string {
    return this.column.align || 'left';
  }

  @HostBinding('class') public get columnClasses(): string {
    return this.getColumnClasses();
  }

  public get cellValue(): unknown {
    return this.getCellValue(this.entry, this.column.key);
  }

  public get truncatedValue(): string {
    const value = this.cellValue;
    const text = String(value || '');

    if (this.column.truncateLength && text.length > this.column.truncateLength) {
      return text.substring(0, this.column.truncateLength) + '...';
    }

    return text;
  }

  public getCellValue(entry: TimesheetEntry, key: string): unknown {
    const keys = key.split('.');
    let value: unknown = entry;

    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }

    return value;
  }

  public getColumnClasses(): string {
    const classes: string[] = [];

    if (this.column.priority) {
      classes.push(`priority-${this.column.priority}`);
    }

    if (this.column.priority === 'high') {
      classes.push('column-primary');
    } else {
      classes.push('column-secondary');
    }

    if (this.column.bulkEditable) {
      classes.push('bulk-editable');
    }

    return classes.join(' ');
  }

  public shouldShowTooltip(): boolean {
    if (!this.column.truncateLength) return false;

    const value = this.cellValue;
    const text = String(value || '');

    return text.length > this.column.truncateLength;
  }

  public formatDuration(duration: unknown): string {
    const hours = Number(duration || 0);
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours}小时`;
    }
    return `${wholeHours}小时${minutes}分钟`;
  }

  public formatTime(time: unknown, format?: '12h' | '24h' | 'decimal'): string {
    const timeStr = String(time || '');
    if (!timeStr || timeStr === '') return '';

    if (format === '12h') {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    }

    return timeStr;
  }

  public getStatusLabel(status: unknown): string {
    const statusLabels: Record<string, string> = {
      draft: '草稿',
      submitted: '已提交',
      approved: '已批准',
      rejected: '已拒绝',
    };
    return statusLabels[String(status)] || String(status);
  }
}
