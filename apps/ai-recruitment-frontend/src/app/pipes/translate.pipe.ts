import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n/i18n.service';

/**
 * Translate pipe for template usage.
 * Usage: {{ 'key.path' | translate }} or {{ 'key.path' | translate: {param: value} }}
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Set to false to react to language changes
})
export class TranslatePipe implements PipeTransform {
  private i18nService = inject(I18nService);

  /**
   * Transforms a translation key to its localized string.
   * @param key - The translation key
   * @param params - Optional parameters for interpolation
   * @returns The translated string
   */
  transform(key: string, params?: Record<string, any>): string {
    return this.i18nService.translate(key, params);
  }
}