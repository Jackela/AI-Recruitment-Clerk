import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/**
 * Date format pipe for formatting dates.
 * Usage: {{ date | dateFormat:'yyyy-MM-dd' }}
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  /**
   * Transforms a date value to a formatted string.
   * @param value - The date to format (Date, string, or number)
   * @param format - The format string (default: 'yyyy-MM-dd')
   * @returns The formatted date string
   */
  public transform(
    value: Date | string | number | null | undefined,
    format: string = 'yyyy-MM-dd',
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('yyyy', String(year))
      .replace('MM', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }
}
