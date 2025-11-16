import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';

/**
 * Defines the shape of the validation rule.
 */
type TransformFn = (value: unknown) => unknown;
type ValidationFn = (value: unknown) => boolean | Promise<boolean>;

export interface ValidationRule {
  field: string;
  service: string;
  endpoint: string;
  required?: boolean;
  transform?: TransformFn;
  validate?: ValidationFn;
  message?: string;
}

/**
 * Defines the shape of the cross service validation options.
 */
export interface CrossServiceValidationOptions {
  rules: ValidationRule[];
  parallel?: boolean;
  failFast?: boolean;
  timeout?: number;
}

/**
 * Represents the cross service validator.
 */
@Injectable()
export class CrossServiceValidator {
  private readonly logger = new Logger(CrossServiceValidator.name);

  /**
   * Validates the data.
   * @param data - The data.
   * @param options - The options.
   * @returns The Promise<{ valid: boolean; errors: string[]; transformedData: Record<string, unknown>; }>.
   */
  async validate(
    data: Record<string, unknown>,
    options: CrossServiceValidationOptions,
  ): Promise<{
    valid: boolean;
    errors: string[];
    transformedData: Record<string, unknown>;
  }> {
    const errors: string[] = [];
    const transformedData = { ...data };

    try {
      if (options.parallel && !options.failFast) {
        // Run all validations in parallel
        const validationPromises = options.rules.map((rule) =>
          this.validateRule(rule, data[rule.field], transformedData),
        );

        const results = await Promise.allSettled(validationPromises);

        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const rule = options.rules[index];
            errors.push(
              rule.message ||
                `Validation failed for field '${rule.field}': ${result.reason}`,
            );
          }
        });
      } else {
        // Run validations sequentially
        for (const rule of options.rules) {
          try {
            await this.validateRule(rule, data[rule.field], transformedData);
          } catch (error) {
            const errorMessage =
              rule.message ||
              `Validation failed for field '${rule.field}': ${this.formatError(error)}`;
            errors.push(errorMessage);

            if (options.failFast) {
              break;
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Cross-service validation error: ${this.formatError(error)}`,
      );
      errors.push('Validation process failed due to service error');
    }

    return {
      valid: errors.length === 0,
      errors,
      transformedData,
    };
  }

  private async validateRule(
    rule: ValidationRule,
    value: unknown,
    transformedData: Record<string, unknown>,
  ): Promise<void> {
    // Check required fields
    if (
      rule.required &&
      (value === undefined || value === null || value === '')
    ) {
      throw new BadRequestException(`Field '${rule.field}' is required`);
    }

    // Skip validation if value is not provided and not required
    if (!rule.required && (value === undefined || value === null)) {
      return;
    }

    // Apply transformation if provided
    if (rule.transform) {
      try {
        transformedData[rule.field] = rule.transform(value);
      } catch (error) {
        throw new BadRequestException(
          `Transformation failed for field '${rule.field}': ${this.formatError(error)}`,
        );
      }
    }

    // Apply custom validation if provided
    if (rule.validate) {
      try {
        const isValid = await rule.validate(
          transformedData[rule.field] || value,
        );
        if (!isValid) {
          throw new BadRequestException(
            `Custom validation failed for field '${rule.field}'`,
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Validation error for field '${rule.field}': ${this.formatError(error)}`,
        );
      }
    }

    // Perform cross-service validation
    if (rule.service && rule.endpoint) {
      await this.performCrossServiceValidation(
        rule.service,
        rule.endpoint,
        transformedData[rule.field] || value,
        rule.field,
      );
    }
  }

  private async performCrossServiceValidation(
    service: string,
    endpoint: string,
    value: unknown,
    fieldName: string,
  ): Promise<void> {
    try {
      // This is a placeholder for actual service communication
      // In a real implementation, you would use HTTP client or message queue
      // to communicate with other services

      const validationRequest = {
        service,
        endpoint,
        value,
        timestamp: new Date().toISOString(),
      };

      this.logger.debug(
        `Performing cross-service validation: ${JSON.stringify(validationRequest)}`,
      );

      // Mock validation - replace with actual service call
      const isValid = await this.mockServiceValidation(
        service,
        endpoint,
        value,
      );

      if (!isValid) {
        throw new NotFoundException(
          `Value '${value}' for field '${fieldName}' not found in ${service}`,
        );
      }
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Cross-service validation failed for ${service}/${endpoint}: ${this.formatError(error)}`,
      );

      throw new BadRequestException(
        `Unable to validate field '${fieldName}' with ${service} service`,
      );
    }
  }

  // Mock service validation - replace with actual implementation
  private async mockServiceValidation(
    service: string,
    endpoint: string,
    value: unknown,
  ): Promise<boolean> {
    // Simulate validation logic based on service and endpoint
    switch (service) {
      case 'user-service':
        if (endpoint === 'validate-user') {
          return typeof value === 'string' && value.length > 0;
        }
        break;
      case 'job-service':
        if (endpoint === 'validate-job') {
          return typeof value === 'string' && value.startsWith('job_');
        }
        break;
      case 'resume-service':
        if (endpoint === 'validate-resume') {
          return typeof value === 'string' && value.includes('resume');
        }
        break;
    }

    return true; // Default to valid for unknown services
  }

  /**
   * Convenience method for validating single field against a service
   */
  async validateField(
    fieldName: string,
    value: unknown,
    service: string,
    endpoint: string,
    required = false,
  ): Promise<boolean> {
    const result = await this.validate(
      { [fieldName]: value },
      {
        rules: [
          {
            field: fieldName,
            service,
            endpoint,
            required,
          },
        ],
        failFast: true,
      },
    );

    return result.valid;
  }

  /**
   * Create validation rules for common scenarios
   */
  static createUserValidationRule(
    fieldName: string,
    required = true,
  ): ValidationRule {
    return {
      field: fieldName,
      service: 'user-service',
      endpoint: 'validate-user',
      required,
      message: `User ID in field '${fieldName}' does not exist`,
    };
  }

  /**
   * Creates job validation rule.
   * @param fieldName - The field name.
   * @param required - The required.
   * @returns The ValidationRule.
   */
  static createJobValidationRule(
    fieldName: string,
    required = true,
  ): ValidationRule {
    return {
      field: fieldName,
      service: 'job-service',
      endpoint: 'validate-job',
      required,
      message: `Job ID in field '${fieldName}' does not exist`,
    };
  }

  /**
   * Creates resume validation rule.
   * @param fieldName - The field name.
   * @param required - The required.
   * @returns The ValidationRule.
   */
  static createResumeValidationRule(
    fieldName: string,
    required = true,
  ): ValidationRule {
    return {
      field: fieldName,
      service: 'resume-service',
      endpoint: 'validate-resume',
      required,
      message: `Resume ID in field '${fieldName}' does not exist`,
    };
  }

  /**
   * Creates email validation rule.
   * @param fieldName - The field name.
   * @param required - The required.
   * @returns The ValidationRule.
   */
  static createEmailValidationRule(
    fieldName: string,
    required = true,
  ): ValidationRule {
    return {
      field: fieldName,
      service: 'notification-service',
      endpoint: 'validate-email',
      required,
      validate: (value: unknown) => {
        if (typeof value !== 'string') {
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      message: `Invalid email format in field '${fieldName}'`,
    };
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
