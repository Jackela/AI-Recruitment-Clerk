import { Directive, forwardRef } from '@angular/core';
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';

@Directive({
  selector: '[arcPhoneValidator]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => PhoneValidatorDirective),
      multi: true,
    },
  ],
})
export class PhoneValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null; // Don't validate empty values
    }

    // Chinese mobile phone number regex
    const phoneRegex = /^1[3-9]\d{9}$/;
    // Also allow international format
    const internationalRegex = /^\+?[1-9]\d{7,14}$/;

    const valid =
      phoneRegex.test(control.value) || internationalRegex.test(control.value);

    return valid
      ? null
      : {
          phone: {
            message: '请输入有效的手机号码',
            actualValue: control.value,
            hint: '支持中国手机号或国际格式',
          },
        };
  }
}
