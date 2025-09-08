import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform values to expected types
      validateCustomDecorators: true,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      this.logger.warn('Validation failed:', {
        errors: formattedErrors,
        value,
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types: Array<new (...args: any[]) => any> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children:
        error.children && error.children.length > 0
          ? this.formatErrors(error.children)
          : undefined,
    }));
  }
}

/**
 * Custom validation pipe for cross-service validation
 */
@Injectable()
export class CrossServiceValidationPipe implements PipeTransform {
  private readonly logger = new Logger(CrossServiceValidationPipe.name);

  constructor(
    private readonly validationRules?: any[],
    private readonly options?: {
      parallel?: boolean;
      failFast?: boolean;
      timeout?: number;
    },
  ) {}

  async transform(value: any, metadata: ArgumentMetadata) {
    // First, apply standard validation
    const standardPipe = new CustomValidationPipe();
    const validatedValue = await standardPipe.transform(value, metadata);

    // Then, apply cross-service validation if rules are provided
    if (this.validationRules && this.validationRules.length > 0) {
      await this.performCrossServiceValidation(validatedValue);
    }

    return validatedValue;
  }

  private async performCrossServiceValidation(value: any): Promise<void> {
    try {
      // Mock cross-service validation
      // In real implementation, this would validate against other services
      const validationPromises = this.validationRules!.map(async (rule) => {
        // Simulate service validation
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(Math.random() > 0.1); // 90% success rate
          }, Math.random() * 100);
        });
      });

      const results = await Promise.all(validationPromises);
      const failedValidations = results.filter((result) => !result);

      if (failedValidations.length > 0) {
        throw new BadRequestException({
          message: 'Cross-service validation failed',
          errors: ['One or more cross-service validations failed'],
          statusCode: 400,
        });
      }
    } catch (error) {
      this.logger.error('Cross-service validation error:', error);
      throw error;
    }
  }
}
