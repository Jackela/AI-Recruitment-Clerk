/**
 * 通用验证模式 - 统一验证逻辑
 * Common Validation Patterns - Unified Validation Logic
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Defines the shape of the validation result.
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Defines the shape of the file validation config.
 */
export interface FileValidationConfig {
  maxSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

/**
 * Defines the shape of the email validation config.
 */
export interface EmailValidationConfig {
  allowedDomains?: string[];
  blockedDomains?: string[];
  requireVerification?: boolean;
}

/**
 * 通用验证器基类
 */
export abstract class BaseValidator {
  /**
   * 验证必填字段
   */
  public static validateRequired(value: unknown, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new BadRequestException(`${fieldName} is required`);
    }
  }

  /**
   * 验证字符串长度
   */
  static validateStringLength(
    value: string,
    fieldName: string,
    min?: number,
    max?: number,
  ): void {
    if (min !== undefined && value.length < min) {
      throw new BadRequestException(
        `${fieldName} must be at least ${min} characters`,
      );
    }
    if (max !== undefined && value.length > max) {
      throw new BadRequestException(
        `${fieldName} must not exceed ${max} characters`,
      );
    }
  }

  /**
   * 验证邮箱格式
   */
  static validateEmail(
    email: string,
    config?: EmailValidationConfig,
  ): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    // 基本格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      result.isValid = false;
      result.errors.push('Invalid email format');
      return result;
    }

    if (config) {
      const domain = email.split('@')[1];

      // 检查允许的域名
      if (config.allowedDomains && !config.allowedDomains.includes(domain)) {
        result.isValid = false;
        result.errors.push(`Email domain ${domain} is not allowed`);
      }

      // 检查被阻止的域名
      if (config.blockedDomains && config.blockedDomains.includes(domain)) {
        result.isValid = false;
        result.errors.push(`Email domain ${domain} is blocked`);
      }
    }

    return result;
  }

  /**
   * 验证文件
   */
  public static validateFile(
    file: { size: number; mimetype: string; originalname: string } | null,
    config: FileValidationConfig,
  ): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    if (!file) {
      result.isValid = false;
      result.errors.push('File is required');
      return result;
    }

    // 文件大小验证
    if (file.size > config.maxSize) {
      result.isValid = false;
      result.errors.push(`File size exceeds ${config.maxSize} bytes`);
    }

    // MIME类型验证
    if (!config.allowedTypes.includes(file.mimetype)) {
      result.isValid = false;
      result.errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // 文件扩展名验证
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    if (fileExtension && !config.allowedExtensions.includes(fileExtension)) {
      result.isValid = false;
      result.errors.push(`File extension .${fileExtension} is not allowed`);
    }

    return result;
  }

  /**
   * 验证URL格式
   */
  static validateUrl(url: string): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    try {
      new URL(url);
    } catch {
      result.isValid = false;
      result.errors.push('Invalid URL format');
    }

    return result;
  }

  /**
   * 验证日期范围
   */
  static validateDateRange(startDate: Date, endDate: Date): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    if (startDate >= endDate) {
      result.isValid = false;
      result.errors.push('Start date must be before end date');
    }

    return result;
  }

  /**
   * 验证数值范围
   */
  static validateNumberRange(
    value: number,
    fieldName: string,
    min?: number,
    max?: number,
  ): void {
    if (min !== undefined && value < min) {
      throw new BadRequestException(`${fieldName} must be at least ${min}`);
    }
    if (max !== undefined && value > max) {
      throw new BadRequestException(`${fieldName} must not exceed ${max}`);
    }
  }

  /**
   * 验证数组长度
   */
  static validateArrayLength(
    array: any[],
    fieldName: string,
    min?: number,
    max?: number,
  ): void {
    if (min !== undefined && array.length < min) {
      throw new BadRequestException(
        `${fieldName} must contain at least ${min} items`,
      );
    }
    if (max !== undefined && array.length > max) {
      throw new BadRequestException(
        `${fieldName} must not contain more than ${max} items`,
      );
    }
  }

  /**
   * 验证枚举值
   */
  public static validateEnum(value: unknown, enumObject: Record<string, unknown>, fieldName: string): void {
    const validValues = Object.values(enumObject);
    if (!validValues.includes(value)) {
      throw new BadRequestException(
        `${fieldName} must be one of: ${validValues.join(', ')}`,
      );
    }
  }
}

/**
 * 简历特定验证器
 */
export class ResumeValidator extends BaseValidator {
  /**
   * Validates resume file.
   * @param file - The file.
   * @returns The ValidationResult.
   */
  public static validateResumeFile(file: { size: number; mimetype: string; originalname: string } | null): ValidationResult {
    return this.validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      allowedExtensions: ['pdf', 'doc', 'docx'],
    });
  }

  /**
   * Validates experience.
   * @param years - The years.
   */
  static validateExperience(years: number): void {
    this.validateNumberRange(years, 'Experience', 0, 50);
  }

  /**
   * Validates skills.
   * @param skills - The skills.
   */
  static validateSkills(skills: string[]): void {
    this.validateArrayLength(skills, 'Skills', 1, 20);

    skills.forEach((skill, index) => {
      this.validateStringLength(skill, `Skill ${index + 1}`, 2, 50);
    });
  }
}

/**
 * 工作描述验证器
 */
export class JobDescriptionValidator extends BaseValidator {
  /**
   * Validates job title.
   * @param title - The title.
   */
  static validateJobTitle(title: string): void {
    this.validateRequired(title, 'Job title');
    this.validateStringLength(title, 'Job title', 5, 100);
  }

  /**
   * Validates salary range.
   * @param min - The min.
   * @param max - The max.
   * @returns The ValidationResult.
   */
  static validateSalaryRange(min: number, max: number): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    if (min >= max) {
      result.isValid = false;
      result.errors.push('Minimum salary must be less than maximum salary');
    }

    if (min < 0 || max < 0) {
      result.isValid = false;
      result.errors.push('Salary values must be positive');
    }

    return result;
  }

  /**
   * Validates requirements.
   * @param requirements - The requirements.
   */
  static validateRequirements(requirements: string[]): void {
    this.validateArrayLength(requirements, 'Requirements', 1, 10);

    requirements.forEach((req, index) => {
      this.validateStringLength(req, `Requirement ${index + 1}`, 10, 200);
    });
  }
}

/**
 * 验证管道装饰器
 */
export function ValidateAndTransform(
  validationFn: (data: unknown) => ValidationResult,
) {
  return function (
    _target: unknown,
    _propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const method = descriptor.value;

    descriptor.value = function (...args: unknown[]) {
      const data = args[0];
      const validation = validationFn(data);

      if (!validation.isValid) {
        throw new BadRequestException(validation.errors.join(', '));
      }

      return method.apply(this, args);
    };
  };
}

/**
 * 业务规则验证器
 */
export class BusinessRuleValidator extends BaseValidator {
  /**
   * 验证用户权限
   */
  static validateUserPermissions(
    userRole: string,
    requiredPermissions: string[],
  ): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    // 这里可以实现具体的权限验证逻辑
    // 简化版本：管理员拥有所有权限
    if (userRole === 'admin') {
      return result;
    }

    // 其他角色需要具体检查
    const hasPermissions = requiredPermissions.every((permission) =>
      this.checkPermission(userRole, permission),
    );

    if (!hasPermissions) {
      result.isValid = false;
      result.errors.push('Insufficient permissions');
    }

    return result;
  }

  private static checkPermission(role: string, permission: string): boolean {
    // 实现角色-权限映射逻辑
    const rolePermissions: Record<string, string[]> = {
      hr: ['read_resumes', 'create_jobs', 'view_analytics'],
      recruiter: ['read_resumes', 'score_candidates'],
      viewer: ['read_resumes'],
    };

    return rolePermissions[role]?.includes(permission) || false;
  }

  /**
   * 验证业务限制
   */
  static validateBusinessLimits(data: {
    dailyUploads: number;
    monthlyJobs: number;
    userTier: string;
  }): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };

    const limits = {
      free: { dailyUploads: 5, monthlyJobs: 2 },
      pro: { dailyUploads: 50, monthlyJobs: 20 },
      enterprise: { dailyUploads: 500, monthlyJobs: 100 },
    };

    const userLimits = limits[data.userTier as keyof typeof limits];
    if (!userLimits) {
      result.isValid = false;
      result.errors.push('Invalid user tier');
      return result;
    }

    if (data.dailyUploads > userLimits.dailyUploads) {
      result.isValid = false;
      result.errors.push(
        `Daily upload limit exceeded (${userLimits.dailyUploads})`,
      );
    }

    if (data.monthlyJobs > userLimits.monthlyJobs) {
      result.isValid = false;
      result.errors.push(
        `Monthly job limit exceeded (${userLimits.monthlyJobs})`,
      );
    }

    return result;
  }
}
