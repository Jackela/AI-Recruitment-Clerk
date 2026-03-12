import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

/**
 * Currency pipe for formatting currency values.
 * Usage: {{ amount | currency:'USD' }}
 */
@Pipe({
  name: 'currency',
  standalone: true,
})
export class CurrencyPipe implements PipeTransform {
  private readonly currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
  };

  /**
   * Transforms a number to a formatted currency string.
   * @param value - The amount to format
   * @param currencyCode - The currency code (default: 'USD')
   * @param decimalPlaces - Number of decimal places (default: 2)
   * @returns The formatted currency string
   */
  public transform(
    value: number | string | null | undefined,
    currencyCode: string = 'USD',
    decimalPlaces: number = 2,
  ): string {
    if (value === null || value === undefined) {
      return '';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return '';
    }

    const symbol =
      this.currencySymbols[currencyCode.toUpperCase()] || currencyCode;
    const formatted = numValue.toFixed(decimalPlaces);
    const [integerPart, decimalPart] = formatted.split('.');
    const integerWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return decimalPlaces > 0
      ? `${symbol}${integerWithCommas}.${decimalPart}`
      : `${symbol}${integerWithCommas}`;
  }
}
