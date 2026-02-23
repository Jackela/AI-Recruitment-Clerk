// Input Validator Implementation

/**
 * Defines the shape of the validation input.
 */
export interface ValidationInput {
  [key: string]: unknown;
}

/**
 * Represents the input validator.
 */
export class InputValidator {
  /**
   * Validates the data.
   * @param input - The input.
   * @returns The ValidationInput.
   */
  public static validate(input: ValidationInput): ValidationInput {
    return input;
  }

  /**
   * Validates resume file.
   * @param file - The file.
   * @returns The { isValid: boolean; errors?: string[] }.
   */
  public static validateResumeFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size: number;
  }): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10MB

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`File size exceeds maximum of ${maxFileSize} bytes`);
    }

    // Check mime type
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`Invalid mime type: ${file.mimetype}`);
    }

    // Check file name
    if (!file.originalname || file.originalname.length === 0) {
      errors.push('File name is required');
    }

    // Check buffer
    if (!file.buffer || file.buffer.length === 0) {
      errors.push('File buffer is empty');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
