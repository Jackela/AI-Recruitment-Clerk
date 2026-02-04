/**
 * Standardized Error Response Formatter
 * Provides consistent error response format across all services with correlation support
 */

import { ErrorResponseFormatter } from '../common/error-handling.patterns';
import type {
  ErrorResponseDto,
  ErrorResponse,
  ErrorResponseContext,
  ErrorCorrelation,
  ErrorRecovery,
  ErrorImpact,
  ErrorMonitoring,
} from './error-response.dto';
import type { EnhancedAppException } from './enhanced-error-types';
import { ErrorCorrelationManager } from './error-correlation';

// Re-export the shared DTO types for convenience
export type {
  ErrorResponseDto,
  ErrorResponse,
  ErrorResponseContext,
  ErrorCorrelation,
  ErrorRecovery,
  ErrorImpact,
  ErrorMonitoring,
};

/**
 * Standardized error response interface
 * @deprecated Use ErrorResponseDto from error-response.dto.ts instead
 */
export type StandardizedErrorResponse = ErrorResponseDto;

/**
 * User-friendly error message mapping
 */
export const UserErrorMessages: Record<string, Record<string, string>> = {
  // Resume Parser Service Messages
  'resume-parser': {
    RESUME_PARSE_FAILED: '简历解析失败，请检查文件格式是否正确',
    UNSUPPORTED_FILE_FORMAT: '不支持的文件格式，请上传PDF、DOC或DOCX文件',
    FILE_SIZE_EXCEEDED: '文件大小超过限制，请上传小于10MB的文件',
    PDF_CORRUPTION_DETECTED: 'PDF文件可能已损坏，请重新上传',
    OCR_PROCESSING_FAILED: '文档识别失败，请确保文件图像清晰',
    CONTENT_EXTRACTION_FAILED: '文档内容提取失败，请检查文件是否为有效简历',
  },

  // Report Generator Service Messages
  'report-generator': {
    REPORT_GENERATION_FAILED: '报告生成失败，请稍后重试',
    REPORT_TEMPLATE_NOT_FOUND: '报告模板未找到，请联系管理员',
    DATA_AGGREGATION_FAILED: '数据汇总失败，请检查数据完整性',
    EXPORT_FORMAT_UNSUPPORTED: '不支持的导出格式，请选择PDF或Excel格式',
  },

  // JD Extractor Service Messages
  'jd-extractor': {
    JD_PARSING_FAILED: '职位描述解析失败，请检查内容格式',
    REQUIREMENTS_EXTRACTION_FAILED: '职位要求提取失败，请补充详细信息',
    SKILL_MAPPING_FAILED: '技能匹配失败，请重新编辑职位描述',
  },

  // Scoring Engine Service Messages
  'scoring-engine': {
    SCORING_ALGORITHM_FAILED: '评分计算失败，请稍后重试',
    INSUFFICIENT_MATCHING_DATA: '匹配数据不足，无法进行准确评分',
    ML_MODEL_PREDICTION_FAILED: '智能评分服务暂时不可用',
  },

  // App Gateway Service Messages
  'app-gateway': {
    DOWNSTREAM_SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
    API_RATE_LIMIT_EXCEEDED: '请求过于频繁，请稍后再试',
    API_AUTHENTICATION_FAILED: '身份验证失败，请重新登录',
    REQUEST_VALIDATION_FAILED: '请求参数错误，请检查输入信息',
  },

  // Database Error Messages
  database: {
    DB_CONNECTION_FAILED: '数据库连接失败，请稍后重试',
    DB_QUERY_TIMEOUT: '查询超时，请简化搜索条件',
    DB_CONSTRAINT_VIOLATION: '数据冲突，请检查输入信息',
    DB_DUPLICATE_KEY_ERROR: '数据已存在，请勿重复提交',
  },

  // General Error Messages
  general: {
    VALIDATION_FAILED: '输入信息有误，请检查后重试',
    UNAUTHORIZED: '您的登录已过期，请重新登录',
    FORBIDDEN: '您没有权限执行此操作',
    NOT_FOUND: '请求的资源不存在',
    CONFLICT: '操作冲突，请刷新页面后重试',
    RATE_LIMIT_ERROR: '请求过于频繁，请稍后再试',
    EXTERNAL_SERVICE_ERROR: '外部服务暂时不可用，请稍后重试',
    SYSTEM_ERROR: '系统出现错误，请联系管理员',
    TIMEOUT: '请求超时，请稍后再试',
  },
};

/**
 * Enhanced error response formatter
 */
export class StandardizedErrorResponseFormatter extends ErrorResponseFormatter {
  /**
   * Format enhanced error response with correlation context
   */
  public static formatEnhanced(
    error: EnhancedAppException,
    requestContext?: {
      path?: string;
      method?: string;
      ip?: string;
    },
  ): ErrorResponseDto {
    const { enhancedDetails } = error;
    const correlationContext =
      enhancedDetails.correlationContext ||
      ErrorCorrelationManager.getContext();

    // Determine service name from correlation context or monitoring tags
    const serviceName =
      correlationContext?.serviceName ||
      enhancedDetails.monitoringTags?.service ||
      'unknown';

    // Get user-friendly message
    const userMessage = this.getUserFriendlyMessage(
      serviceName,
      enhancedDetails.code,
      enhancedDetails.type,
    );

    // Build standardized response
    const response: ErrorResponseDto = {
      success: false,
      error: {
        type: enhancedDetails.type,
        code: enhancedDetails.code,
        message: enhancedDetails.message,
        userMessage,
        timestamp: enhancedDetails.timestamp,
        severity: enhancedDetails.severity,
        traceId: correlationContext?.traceId,
        requestId: correlationContext?.requestId,
      },
      context: {
        path: requestContext?.path || correlationContext?.metadata?.path,
        method: requestContext?.method || correlationContext?.metadata?.method,
        serviceName: correlationContext?.serviceName,
        operationName: correlationContext?.operationName,
        ip: requestContext?.ip || correlationContext?.clientIp,
      },
      recovery: {
        strategies: enhancedDetails.recoveryStrategies || [],
        suggestions: this.getRecoverySuggestions(
          enhancedDetails.type,
          enhancedDetails.code,
        ),
        retryable: this.isRetryableError(error),
      },
      impact: {
        business: enhancedDetails.businessImpact || 'medium',
        user: enhancedDetails.userImpact || 'moderate',
      },
    };

    // Add correlation information if available
    if (correlationContext) {
      response.correlation = {
        traceId: correlationContext.traceId,
        requestId: correlationContext.requestId,
        spanId: correlationContext.spanId,
        parentSpanId: correlationContext.parentSpanId,
      };
    }

    // Add monitoring information
    if (
      enhancedDetails.monitoringTags &&
      Object.keys(enhancedDetails.monitoringTags).length > 0
    ) {
      response.monitoring = {
        tags: enhancedDetails.monitoringTags,
        metrics: {
          executionTime: correlationContext?.executionTime || 0,
          timestamp: Date.now(),
        },
      };
    }

    // Add development-only information
    if (process.env.NODE_ENV !== 'production') {
      response.details = enhancedDetails.details;
      response.stack = error.stack;
    }

    return response;
  }

  /**
   * Get user-friendly error message based on service and error code
   */
  private static getUserFriendlyMessage(
    serviceName: string,
    errorCode: string,
    errorType: string,
  ): string {
    // Try service-specific message first
    const serviceMessages = UserErrorMessages[serviceName];
    if (serviceMessages && serviceMessages[errorCode]) {
      return serviceMessages[errorCode];
    }

    // Try general error code message
    const generalMessages = UserErrorMessages['general'];
    if (generalMessages[errorCode]) {
      return generalMessages[errorCode];
    }

    // Fall back to type-based message from parent class
    return super.formatUserMessage({
      errorDetails: { type: errorType },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  /**
   * Get recovery suggestions based on error type and code
   */
  private static getRecoverySuggestions(
    errorType: string,
    _errorCode: string,
  ): string[] {
    const suggestionMap: Record<string, string[]> = {
      VALIDATION_ERROR: [
        '检查所有必填字段是否已填写',
        '验证数据格式是否正确',
        '确认字符长度是否符合要求',
      ],
      AUTHENTICATION_ERROR: [
        '请重新登录',
        '检查用户名和密码是否正确',
        '清除浏览器缓存后重试',
      ],
      AUTHORIZATION_ERROR: [
        '联系管理员获取相应权限',
        '确认您的账户状态是否正常',
        '检查是否有访问此功能的权限',
      ],
      NOT_FOUND_ERROR: [
        '检查请求的资源是否存在',
        '验证URL地址是否正确',
        '刷新页面后重试',
      ],
      RATE_LIMIT_ERROR: [
        '等待一段时间后重试',
        '减少请求频率',
        '联系管理员增加限额',
      ],
      DATABASE_ERROR: ['稍后重试', '联系技术支持', '检查网络连接'],
      EXTERNAL_SERVICE_ERROR: ['稍后重试', '检查网络连接', '联系服务提供商'],
    };

    return (
      suggestionMap[errorType] || [
        '刷新页面后重试',
        '检查网络连接',
        '如问题持续，请联系技术支持',
      ]
    );
  }

  /**
   * Determine if error is retryable
   */
  private static isRetryableError(error: EnhancedAppException): boolean {
    const nonRetryableTypes = [
      'VALIDATION_ERROR',
      'AUTHENTICATION_ERROR',
      'AUTHORIZATION_ERROR',
      'NOT_FOUND_ERROR',
    ];

    const nonRetryableCodes = [
      'UNSUPPORTED_FILE_FORMAT',
      'FILE_SIZE_EXCEEDED',
      'PDF_CORRUPTION_DETECTED',
      'API_AUTHENTICATION_FAILED',
      'API_AUTHORIZATION_FAILED',
      'REQUEST_VALIDATION_FAILED',
    ];

    return (
      !nonRetryableTypes.includes(error.enhancedDetails.type) &&
      !nonRetryableCodes.includes(error.enhancedDetails.code)
    );
  }

  /**
   * Format error for logging purposes
   */
  public static formatForLogging(
    error: EnhancedAppException,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestContext?: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Record<string, any> {
    const correlationContext =
      error.enhancedDetails.correlationContext ||
      ErrorCorrelationManager.getContext();

    return {
      timestamp: new Date().toISOString(),
      level: this.mapSeverityToLogLevel(error.enhancedDetails.severity),
      message: error.enhancedDetails.message,
      error: {
        type: error.enhancedDetails.type,
        code: error.enhancedDetails.code,
        severity: error.enhancedDetails.severity,
        businessImpact: error.enhancedDetails.businessImpact,
        userImpact: error.enhancedDetails.userImpact,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      correlation: correlationContext
        ? {
            traceId: correlationContext.traceId,
            requestId: correlationContext.requestId,
            spanId: correlationContext.spanId,
            serviceName: correlationContext.serviceName,
            operationName: correlationContext.operationName,
            userId: correlationContext.userId,
            executionTime: correlationContext.executionTime,
          }
        : null,
      context: {
        path: requestContext?.path,
        method: requestContext?.method,
        ip: requestContext?.ip,
        userAgent: requestContext?.userAgent,
      },
      details: error.enhancedDetails.details,
      monitoring: error.enhancedDetails.monitoringTags,
      recovery: {
        strategies: error.enhancedDetails.recoveryStrategies,
        affectedOperations: error.enhancedDetails.affectedOperations,
        retryable: this.isRetryableError(error),
      },
    };
  }

  /**
   * Map severity to log level
   */
  private static mapSeverityToLogLevel(severity: string): string {
    const severityMap: Record<string, string> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'fatal',
    };

    return severityMap[severity] || 'error';
  }

  /**
   * Create error summary for metrics and monitoring
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static createErrorSummary(error: EnhancedAppException): Record<string, any> {
    const correlationContext = error.enhancedDetails.correlationContext;

    return {
      errorType: error.enhancedDetails.type,
      errorCode: error.enhancedDetails.code,
      severity: error.enhancedDetails.severity,
      businessImpact: error.enhancedDetails.businessImpact,
      userImpact: error.enhancedDetails.userImpact,
      serviceName: correlationContext?.serviceName || 'unknown',
      operationName: correlationContext?.operationName || 'unknown',
      traceId: correlationContext?.traceId,
      timestamp: error.enhancedDetails.timestamp,
      retryable: this.isRetryableError(error),
      tags: error.enhancedDetails.monitoringTags,
    };
  }

  /**
   * Format minimal error response for health checks
   */
  public static formatMinimal(error: EnhancedAppException): {
    success: false;
    error: string;
    code: string;
    timestamp: string;
    traceId?: string;
  } {
    const correlationContext = error.enhancedDetails.correlationContext;

    return {
      success: false,
      error: error.enhancedDetails.message,
      code: error.enhancedDetails.code,
      timestamp: error.enhancedDetails.timestamp,
      traceId: correlationContext?.traceId,
    };
  }
}
