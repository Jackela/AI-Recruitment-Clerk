/**
 * 统一错误处理模式 - 标准化错误管理
 * Unified Error Handling Patterns - Standardized Error Management
 */

import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { getConfig } from '@ai-recruitment-clerk/configuration';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  SYSTEM = 'SYSTEM_ERROR',
}

/**
 * 错误严重程度
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 错误详情接口
 */
export interface ErrorDetails {
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  severity: ErrorSeverity;
  context?: Record<string, any>;
}

/**
 * 标准化应用异常
 */
export class AppException extends HttpException {
  public readonly errorDetails: ErrorDetails;

  /**
   * Initializes a new instance of the App Exception.
   * @param type - The type.
   * @param code - The code.
   * @param message - The message.
   * @param httpStatus - The http status.
   * @param details - The details.
   * @param context - The context.
   */
  constructor(
    type: ErrorType,
    code: string,
    message: string,
    httpStatus: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: any,
    context?: Record<string, any>,
  ) {
    super(message, httpStatus);

    this.errorDetails = {
      type,
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      severity: ErrorSeverity.MEDIUM,
      context,
    };
  }

  /**
   * Performs the with trace id operation.
   * @param traceId - The trace id.
   * @returns The this.
   */
  withTraceId(traceId: string): this {
    this.errorDetails.traceId = traceId;
    return this;
  }

  /**
   * Performs the with user id operation.
   * @param userId - The user id.
   * @returns The this.
   */
  withUserId(userId: string): this {
    this.errorDetails.userId = userId;
    return this;
  }

  /**
   * Performs the with session id operation.
   * @param sessionId - The session id.
   * @returns The this.
   */
  withSessionId(sessionId: string): this {
    this.errorDetails.sessionId = sessionId;
    return this;
  }

  /**
   * Performs the with severity operation.
   * @param severity - The severity.
   * @returns The this.
   */
  withSeverity(severity: ErrorSeverity): this {
    this.errorDetails.severity = severity;
    return this;
  }

  /**
   * Performs the with context operation.
   * @param context - The context.
   * @returns The this.
   */
  withContext(context: Record<string, any>): this {
    this.errorDetails.context = { ...this.errorDetails.context, ...context };
    return this;
  }
}

/**
 * 业务逻辑异常
 */
export class BusinessLogicException extends AppException {
  /**
   * Initializes a new instance of the Business Logic Exception.
   * @param code - The code.
   * @param message - The message.
   * @param details - The details.
   */
  constructor(code: string, message: string, details?: any) {
    super(
      ErrorType.BUSINESS_LOGIC,
      code,
      message,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/**
 * 验证异常
 */
export class ValidationException extends AppException {
  /**
   * Initializes a new instance of the Validation Exception.
   * @param message - The message.
   * @param validationErrors - The validation errors.
   */
  constructor(message: string, validationErrors?: any) {
    super(
      ErrorType.VALIDATION,
      'VALIDATION_FAILED',
      message,
      HttpStatus.BAD_REQUEST,
      validationErrors,
    );
  }
}

/**
 * 资源未找到异常
 */
export class ResourceNotFoundException extends AppException {
  /**
   * Initializes a new instance of the Resource Not Found Exception.
   * @param resource - The resource.
   * @param identifier - The identifier.
   */
  constructor(resource: string, identifier: string) {
    super(
      ErrorType.NOT_FOUND,
      'RESOURCE_NOT_FOUND',
      `${resource} with identifier '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
      { resource, identifier },
    );
  }
}

/**
 * 权限异常
 */
export class UnauthorizedException extends AppException {
  /**
   * Initializes a new instance of the Unauthorized Exception.
   * @param message - The message.
   */
  constructor(message = 'Unauthorized access') {
    super(
      ErrorType.AUTHORIZATION,
      'UNAUTHORIZED',
      message,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * 禁止访问异常
 */
export class ForbiddenException extends AppException {
  /**
   * Initializes a new instance of the Forbidden Exception.
   * @param message - The message.
   */
  constructor(message = 'Access forbidden') {
    super(ErrorType.AUTHORIZATION, 'FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

/**
 * 冲突异常
 */
export class ConflictException extends AppException {
  /**
   * Initializes a new instance of the Conflict Exception.
   * @param message - The message.
   * @param conflictDetails - The conflict details.
   */
  constructor(message: string, conflictDetails?: any) {
    super(
      ErrorType.CONFLICT,
      'RESOURCE_CONFLICT',
      message,
      HttpStatus.CONFLICT,
      conflictDetails,
    );
  }
}

/**
 * 外部服务异常
 */
export class ExternalServiceException extends AppException {
  /**
   * Initializes a new instance of the External Service Exception.
   * @param serviceName - The service name.
   * @param message - The message.
   * @param statusCode - The status code.
   */
  constructor(serviceName: string, message: string, statusCode?: number) {
    super(
      ErrorType.EXTERNAL_SERVICE,
      'EXTERNAL_SERVICE_ERROR',
      `External service '${serviceName}' error: ${message}`,
      HttpStatus.BAD_GATEWAY,
      { serviceName, originalStatusCode: statusCode },
    );
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  private static readonly logger = new Logger('ErrorHandler');

  /**
   * 处理和记录错误
   */
  static handleError(error: Error, context?: string): AppException {
    const traceId = this.generateTraceId();

    // 如果已经是AppException，直接返回
    if (error instanceof AppException) {
      error.withTraceId(traceId);
      this.logError(error, context);
      return error;
    }

    // 转换为标准异常
    const appException = this.convertToAppException(error, traceId);
    this.logError(appException, context);

    return appException;
  }

  /**
   * 转换为应用异常
   */
  private static convertToAppException(
    error: Error,
    traceId: string,
  ): AppException {
    // 数据库错误
    if (this.isDatabaseError(error)) {
      return new AppException(
        ErrorType.DATABASE,
        'DATABASE_ERROR',
        'Database operation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { originalError: error.message },
      )
        .withTraceId(traceId)
        .withSeverity(ErrorSeverity.HIGH);
    }

    // 网络错误
    if (this.isNetworkError(error)) {
      return new ExternalServiceException('unknown', error.message).withTraceId(
        traceId,
      );
    }

    // 默认系统错误
    return new AppException(
      ErrorType.SYSTEM,
      'SYSTEM_ERROR',
      'An unexpected error occurred',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { originalError: error.message },
    )
      .withTraceId(traceId)
      .withSeverity(ErrorSeverity.CRITICAL);
  }

  /**
   * 记录错误
   */
  private static logError(error: AppException, context?: string): void {
    const logContext = context || 'Unknown';
    const { errorDetails } = error;

    const logMessage = `[${logContext}] ${errorDetails.type}: ${errorDetails.message}`;
    const logData = {
      traceId: errorDetails.traceId,
      code: errorDetails.code,
      severity: errorDetails.severity,
      details: errorDetails.details,
      context: errorDetails.context,
    };

    switch (errorDetails.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.fatal(logMessage, logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(logMessage, logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(logMessage, logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.log(logMessage, logData);
        break;
    }
  }

  /**
   * 生成追踪ID
   */
  private static generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 检查是否为数据库错误
   */
  private static isDatabaseError(error: Error): boolean {
    const dbErrorKeywords = [
      'mongodb',
      'mysql',
      'postgres',
      'connection',
      'timeout',
    ];
    return dbErrorKeywords.some((keyword) =>
      error.message.toLowerCase().includes(keyword),
    );
  }

  /**
   * 检查是否为网络错误
   */
  private static isNetworkError(error: Error): boolean {
    const networkErrorKeywords = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'network',
    ];
    return networkErrorKeywords.some((keyword) =>
      error.message.includes(keyword),
    );
  }
}

/**
 * 错误恢复策略
 */
export class ErrorRecoveryStrategy {
  /**
   * 重试策略
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000,
    exponentialBackoff = true,
  ): Promise<T> {
    let lastError: Error;
    let delay = baseDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // 检查是否应该重试
        if (!this.shouldRetry(error as Error)) {
          break;
        }

        await this.sleep(delay);

        if (exponentialBackoff) {
          delay *= 2;
        }
      }
    }

    throw ErrorHandler.handleError(lastError!);
  }

  /**
   * 断路器模式
   */
  static circuitBreaker<T>(
    operation: () => Promise<T>,
    failureThreshold = 5,
    timeout = 60000,
  ): () => Promise<T> {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    return async (): Promise<T> => {
      const now = Date.now();

      // 检查断路器状态
      if (state === 'OPEN') {
        if (now - lastFailureTime < timeout) {
          throw new AppException(
            ErrorType.EXTERNAL_SERVICE,
            'CIRCUIT_BREAKER_OPEN',
            'Circuit breaker is open, service temporarily unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        state = 'HALF_OPEN';
      }

      try {
        const result = await operation();

        // 成功时重置状态
        failureCount = 0;
        state = 'CLOSED';

        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        if (failureCount >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  /**
   * 判断是否应该重试
   */
  private static shouldRetry(error: Error): boolean {
    if (error instanceof AppException) {
      const nonRetryableTypes = [
        ErrorType.AUTHENTICATION,
        ErrorType.AUTHORIZATION,
        ErrorType.VALIDATION,
        ErrorType.NOT_FOUND,
      ];

      return !nonRetryableTypes.includes(error.errorDetails.type);
    }

    // 对于未知错误，默认可以重试
    return true;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 错误响应格式化器
 */
export class ErrorResponseFormatter {
  /**
   * 格式化错误响应
   */
  static format(error: AppException): any {
    const isProduction = getConfig().env.isProduction;
    const { errorDetails } = error;

    return {
      success: false,
      error: {
        type: errorDetails.type,
        code: errorDetails.code,
        message: errorDetails.message,
        timestamp: errorDetails.timestamp,
        traceId: errorDetails.traceId,
      },
      // 在生产环境中可能需要隐藏详细信息
      ...(!isProduction && {
        details: errorDetails.details,
        context: errorDetails.context,
      }),
    };
  }

  /**
   * 格式化用户友好的错误消息
   */
  static formatUserMessage(error: AppException): string {
    const messageMap: Record<ErrorType, string> = {
      [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
      [ErrorType.AUTHENTICATION]: '身份验证失败，请重新登录',
      [ErrorType.AUTHORIZATION]: '您没有权限执行此操作',
      [ErrorType.NOT_FOUND]: '请求的资源不存在',
      [ErrorType.CONFLICT]: '操作冲突，请稍后重试',
      [ErrorType.RATE_LIMIT]: '请求过于频繁，请稍后重试',
      [ErrorType.EXTERNAL_SERVICE]: '外部服务暂时不可用，请稍后重试',
      [ErrorType.DATABASE]: '数据服务暂时不可用，请稍后重试',
      [ErrorType.FILE_UPLOAD]: '文件上传失败，请检查文件格式和大小',
      [ErrorType.BUSINESS_LOGIC]: error.errorDetails.message,
      [ErrorType.SYSTEM]: '系统出现错误，请联系管理员',
    };

    return messageMap[error.errorDetails.type] || '未知错误';
  }
}
