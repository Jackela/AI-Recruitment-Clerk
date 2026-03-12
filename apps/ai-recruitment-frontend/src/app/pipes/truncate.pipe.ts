import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/**
 * Truncate pipe for truncating text with ellipsis.
 * Usage: {{ text | truncate:100 }}
 */
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  /**
   * Transforms a string by truncating it if it exceeds max length.
   * @param value - The string to truncate
   * @param maxLength - Maximum length before truncation (default: 50)
   * @param suffix - Suffix to append when truncated (default: '...')
   * @returns The truncated string
   */
  public transform(
    value: string | null | undefined,
    maxLength: number = 50,
    suffix: string = '...',
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value.length <= maxLength) {
      return value;
    }

    return value.substring(0, maxLength) + suffix;
  }
}
