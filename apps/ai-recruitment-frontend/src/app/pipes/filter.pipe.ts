import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

interface Filterable {
  [key: string]: unknown;
}

/**
 * Filter pipe for filtering arrays.
 * Usage: {{ items | filter:'name':'searchTerm' }}
 */
@Pipe({
  name: 'filter',
  standalone: true,
})
export class FilterPipe implements PipeTransform {
  /**
   * Transforms an array by filtering it based on a property and search term.
   * @param value - The array to filter
   * @param property - Property name to filter by
   * @param searchTerm - Term to search for
   * @returns The filtered array
   */
  public transform<T extends Filterable>(
    value: T[] | null | undefined,
    property: string,
    searchTerm: string | null | undefined,
  ): T[] {
    if (!value || value.length === 0) {
      return [];
    }

    if (!searchTerm) {
      return value;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();

    return value.filter((item) => {
      const itemValue = item[property];

      if (itemValue === null || itemValue === undefined) {
        return false;
      }

      return String(itemValue).toLowerCase().includes(lowerSearchTerm);
    });
  }
}
