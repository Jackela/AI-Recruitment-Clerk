import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Represents the custom validation pipe.
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<unknown> {
  private readonly logger = new Logger(CustomValidationPipe.name);

  private readonly passthroughTypes: ClassConstructor[] = [
    String,
    Boolean,
    Number,
    Array,
    Object,
  ];

  /**
   * Performs the transform operation.
   * @param value - The value.
   * @param { metatype } - The { metatype }.
   * @returns The result of the operation.
   */
  async transform(value: unknown, { metatype }: ArgumentMetadata) {
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

  private toValidate(metatype: ClassConstructor): boolean {
    return !this.passthroughTypes.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): ValidationErrorDetail[] {
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
export class CrossServiceValidationPipe implements PipeTransform<unknown> {
  private readonly logger = new Logger(CrossServiceValidationPipe.name);

  /**
   * Initializes a new instance of the Cross Service Validation Pipe.
   * @param validationRules - The validation rules.
   * @param options - The options.
   */
  constructor(
    private readonly validationRules?: CrossServiceValidationRule[],
    private readonly _options?: CrossServiceValidationOptions,
  ) {}

  /**
   * Performs the transform operation.
   * @param value - The value.
   * @param metadata - The metadata.
   * @returns The result of the operation.
   */
  async transform(value: unknown, metadata: ArgumentMetadata) {
    // First, apply standard validation
    const standardPipe = new CustomValidationPipe();
    const validatedValue = await standardPipe.transform(value, metadata);

    // Then, apply cross-service validation if rules are provided
    if (this.validationRules && this.validationRules.length > 0) {
      await this.performCrossServiceValidation(
        validatedValue,
        this.validationRules,
      );
    }

    return validatedValue;
  }

  private async performCrossServiceValidation(
    value: unknown,
    rules: CrossServiceValidationRule[],
  ): Promise<void> {
    try {
      const validationPromises = rules.map(async (rule) => {
        try {
          return await rule(value);
        } catch {
          return false;
        }
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
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cross-service validation error: ${message}`);
      throw error;
    }
  }
}

type ClassConstructor<T = object> = new (...args: unknown[]) => T;

type ValidationErrorDetail = {
  property: string;
  value: unknown;
  constraints?: Record<string, string>;
  children?: ValidationErrorDetail[];
};

type CrossServiceValidationRule = (value: unknown) => Promise<boolean> | boolean;

type CrossServiceValidationOptions = {
  parallel?: boolean;
  failFast?: boolean;
  timeout?: number;
};
