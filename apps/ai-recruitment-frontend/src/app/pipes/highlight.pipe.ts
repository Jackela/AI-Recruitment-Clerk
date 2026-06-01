import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/**
 * Highlight pipe for highlighting search terms in text.
 * Usage: {{ text | highlight:searchTerm }}
 */
@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    searchTerm: string | null | undefined,
    highlightClass = 'highlight',
  ): string {
    if (!value || !searchTerm) {
      return value || '';
    }

    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

    return value.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
  }
}
