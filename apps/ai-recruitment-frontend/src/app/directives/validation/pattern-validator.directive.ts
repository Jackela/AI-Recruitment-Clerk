import { Directive, Input, forwardRef } from '@angular/core';
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

@Directive({
  selector: '[arcPattern]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PatternValidatorDirective),
      multi: true,
    },
  ],
})
export class PatternValidatorDirective implements Validator {
  @Input() arcPattern!: string | RegExp;
  @Input() patternMessage?: string;

  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value || !this.arcPattern) {
      return null;
    }

    const pattern =
      typeof this.arcPattern === 'string'
        ? new RegExp(this.arcPattern)
        : this.arcPattern;

    const valid = pattern.test(control.value);

    return valid
      ? null
      : {
          pattern: {
            message: this.patternMessage || '输入格式不正确',
            actualValue: control.value,
            requiredPattern: this.arcPattern.toString(),
          },
        };
  }
}
