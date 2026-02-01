import { Directive, Input, forwardRef } from '@angular/core';
import type {
  Validator,
  AbstractControl,
  ValidationErrors} from '@angular/forms';
import {
  NG_VALIDATORS
} from '@angular/forms';

/**
 * Represents the required validator directive.
 */
@Directive({
  selector: '[arcRequired]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => RequiredValidatorDirective),
      multi: true,
    },
  ],
})
export class RequiredValidatorDirective implements Validator {
  @Input() arcRequired: boolean | string = true;
  @Input() customMessage?: string;

  /**
   * Validates the data.
   * @param control - The control.
   * @returns The ValidationErrors | null.
   */
  validate(control: AbstractControl): ValidationErrors | null {
    // Check if validation is enabled
    const isRequired =
      this.arcRequired === '' ||
      this.arcRequired === true ||
      this.arcRequired === 'true';

    if (!isRequired) {
      return null;
    }

    const value = control.value;

    // Check for empty values
    if (value === null || value === undefined || value === '') {
      return {
        required: {
          message: this.customMessage || '此字段为必填项',
          required: true,
        },
      };
    }

    // Check for empty strings with only whitespace
    if (typeof value === 'string' && value.trim() === '') {
      return {
        required: {
          message: this.customMessage || '此字段不能为空',
          required: true,
        },
      };
    }

    // Check for empty arrays
    if (Array.isArray(value) && value.length === 0) {
      return {
        required: {
          message: this.customMessage || '请至少选择一项',
          required: true,
        },
      };
    }

    return null;
  }
}
