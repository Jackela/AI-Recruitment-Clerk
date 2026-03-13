import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

interface Sortable {
  [key: string]: unknown;
}

/**
 * Sort pipe for sorting arrays.
 * Usage: {{ items | sort:'name':'asc' }}
 */
@Pipe({
  name: 'sort',
  standalone: true,
})
export class SortPipe implements PipeTransform {
  /**
   * Transforms an array by sorting it based on a property.
   * @param value - The array to sort
   * @param property - Property name to sort by
   * @param order - Sort order: 'asc' or 'desc' (default: 'asc')
   * @returns The sorted array
   */
  public transform<T extends Sortable>(
    value: T[] | null | undefined,
    property: string,
    order: 'asc' | 'desc' = 'asc',
  ): T[] {
    if (!value || value.length === 0) {
      return [];
    }

    const sorted = [...value].sort((a, b) => {
      const aValue = a[property];
      const bValue = b[property];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue);
      }

      if (aValue < bValue) return -1;
      if (aValue > bValue) return 1;
      return 0;
    });

    return order === 'desc' ? sorted.reverse() : sorted;
  }
}
