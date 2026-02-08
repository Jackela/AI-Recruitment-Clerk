/**
 * DTO Validation Pipe
 *
 * A NestJS PipeTransform implementation for validating DTOs using class-validator and class-transformer.
 * This pipe provides consistent validation behavior across all services in the AI Recruitment Clerk application.
 *
 * Features:
 * - class-validator integration for declarative validation
 * - class-transformer integration for type transformation
 * - Whitelist mode to strip non-whitelisted properties
 * - Configurable error response format
 *
 * @module infrastructure-shared/pipes/dto-validation.pipe
 */

import type {
  PipeTransform,
  ArgumentMetadata,
} from '@nestjs/common';
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Configuration options for the DTO validation pipe.
 */
export interface DtoValidationPipeOptions {
  /** Whether to strip properties that don't have decorators (default: true) */
  whitelist?: boolean;
  /** Whether to throw an error if non-whitelisted properties are present (default: true) */
  forbidNonWhitelisted?: boolean;
  /** Whether to transform plain values to class instances (default: true) */
  transform?: boolean;
  /** Whether to validate custom decorators (default: true) */
  validateCustomDecorators?: boolean;
}

/**
 * Internal options with all required fields.
 */
interface InternalDtoValidationPipeOptions {
  readonly whitelist: boolean;
  readonly forbidNonWhitelisted: boolean;
  readonly transform: boolean;
  readonly validateCustomDecorators: boolean;
}

/**
 * Default validation pipe options.
 */
const DEFAULT_OPTIONS: InternalDtoValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  validateCustomDecorators: true,
};

/**
 * Format for validation error details.
 */
export interface FormattedValidationError {
  property: string;
  value: unknown;
  constraints?: Record<string, string>;
  children?: FormattedValidationError[];
}

/**
 * DTO Validation Pipe for validating request payloads against class-validator decorated DTOs.
 *
 * @example
 * ```typescript
 * // Register globally in app.module.ts
 * app.useGlobalPipes(new DtoValidationPipe());
 *
 * // Or use per-route
 * @Post('users')
 * async createUser(@Body(new DtoValidationPipe()) dto: CreateUserDto) {
 *   // dto is validated and transformed
 * }
 * ```
 */
@Injectable()
export class DtoValidationPipe implements PipeTransform<unknown> {
  private readonly options: InternalDtoValidationPipeOptions;

  constructor(options: DtoValidationPipeOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Transforms and validates the input value against the metatype.
   *
   * @param value - The raw value from the request
   * @param metadata - NestJS argument metadata containing the target metatype
   * @returns The validated and transformed value
   * @throws BadRequestException if validation fails
   */
  public async transform(value: unknown, { metatype }: ArgumentMetadata): Promise<unknown> {
    // Skip validation if no metatype is provided
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Convert plain value to class instance
    const object = plainToClass(metatype, value);

    // Perform validation using class-validator
    const errors = await validate(object, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      transform: this.options.transform,
      validateCustomDecorators: this.options.validateCustomDecorators,
    });

    // Throw if validation errors exist
    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
        statusCode: 400,
      });
    }

    return object;
  }

  /**
   * Checks if the given metatype should be validated.
   *
   * @param metatype - The class constructor to check
   * @returns True if the type should be validated, false for primitive types
   */
  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: Array<new (...args: unknown[]) => unknown> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  /**
   * Formats validation errors into a structured response.
   *
   * @param errors - Array of ValidationError from class-validator
   * @returns Array of formatted error details
   */
  private formatErrors(errors: ValidationError[]): FormattedValidationError[] {
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
 * Factory function for creating a configured DTO validation pipe.
 *
 * @param options - Configuration options for the pipe
 * @returns A configured DtoValidationPipe instance
 *
 * @example
 * ```typescript
 * const strictPipe = createDtoValidationPipe({
 *   whitelist: true,
 *   forbidNonWhitelisted: true,
 * });
 * ```
 */
export function createDtoValidationPipe(
  options?: DtoValidationPipeOptions,
): DtoValidationPipe {
  return new DtoValidationPipe(options);
}
