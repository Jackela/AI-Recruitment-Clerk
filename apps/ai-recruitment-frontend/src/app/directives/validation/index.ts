// Export all validation directives and components
export * from './email-validator.directive';
export * from './phone-validator.directive';
export * from './required-validator.directive';
export * from './pattern-validator.directive';
export * from './min-length-validator.directive';
export * from './validation-feedback.component';

import { EmailValidatorDirective } from './email-validator.directive';
import { PhoneValidatorDirective } from './phone-validator.directive';
import { RequiredValidatorDirective } from './required-validator.directive';
import { PatternValidatorDirective } from './pattern-validator.directive';
import { MinLengthValidatorDirective } from './min-length-validator.directive';
import { ValidationFeedbackComponent } from './validation-feedback.component';

// Export as array for easy import
export const VALIDATION_DIRECTIVES = [
  EmailValidatorDirective,
  PhoneValidatorDirective,
  RequiredValidatorDirective,
  PatternValidatorDirective,
  MinLengthValidatorDirective,
  ValidationFeedbackComponent,
] as const;
