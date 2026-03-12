import type { PipeTransform } from '@angular/core';
import { Pipe, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Highlight pipe for highlighting search terms in text.
 * Usage: {{ text | highlight:searchTerm }}
 */
@Pipe({
  name: 'highlight',
  standalone: true,
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  /**
   * Transforms text by wrapping matching search terms in highlight markup.
   * @param value - The text to search within
   * @param searchTerm - The term to highlight
   * @param highlightClass - CSS class for highlighted text (default: 'highlight')
   * @returns The text with highlighted search terms
   */
  public transform(
    value: string | null | undefined,
    searchTerm: string | null | undefined,
    highlightClass: string = 'highlight',
  ): string {
    if (!value || !searchTerm) {
      return value || '';
    }

    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');

    return value.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
  }
}
