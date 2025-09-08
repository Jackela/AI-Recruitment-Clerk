import { Directive, Input, forwardRef } from '@angular/core';
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

@Directive({
  selector: '[arcMinLength]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => MinLengthValidatorDirective),
      multi: true,
    },
  ],
})
export class MinLengthValidatorDirective implements Validator {
  @Input() arcMinLength!: number;
  @Input() minLengthMessage?: string;

  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value || !this.arcMinLength) {
      return null;
    }

    const length = control.value.length;
    const minLength = Number(this.arcMinLength);

    if (length < minLength) {
      return {
        minLength: {
          message: this.minLengthMessage || `最少需要输入 ${minLength} 个字符`,
          actualLength: length,
          requiredLength: minLength,
        },
      };
    }

    return null;
  }
}
