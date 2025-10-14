import {
  AnalyticsEvent,
  EventType,
  EventCategory,
  EventStatus,
  ConsentStatus,
  MetricUnit,
  UserSession,
} from './analytics.dto';

/**
 * Represents the analytics rules.
 */
export class AnalyticsRules {
  // 核心业务规则常量 - 数据分析系统
  static readonly MAX_EVENTS_PER_SESSION = 1000; // 单会话最大事件数
  static readonly MAX_SESSION_DURATION_HOURS = 24; // 最大会话时长（小时）
  static readonly EVENT_PROCESSING_BATCH_SIZE = 100; // 事件处理批次大小
  static readonly MIN_EVENT_INTERVAL_MS = 100; // 最小事件间隔（毫秒）

  // 数据保留期限常量
  static readonly USER_DATA_RETENTION_DAYS = 730; // 用户数据保留期（2年）
  static readonly SYSTEM_DATA_RETENTION_DAYS = 90; // 系统数据保留期（3个月）
  static readonly BUSINESS_DATA_RETENTION_DAYS = 1095; // 业务数据保留期（3年）
  static readonly ERROR_DATA_RETENTION_DAYS = 365; // 错误数据保留期（1年）

  // 隐私合规常量
  static readonly ANONYMIZATION_THRESHOLD_DAYS = 365; // 自动匿名化阈值（1年）
  static readonly CONSENT_EXPIRY_DAYS = 730; // 用户同意过期时间（2年）
  static readonly MAX_PERSONAL_DATA_STORAGE_DAYS = 1095; // 个人数据最大存储时间（3年）

  // 性能监控常量
  static readonly MAX_EVENT_SIZE_BYTES = 50 * 1024; // 最大事件大小（50KB）
  static readonly CRITICAL_PERFORMANCE_THRESHOLD_MS = 5000; // 关键性能阈值（5秒）
  static readonly HIGH_VOLUME_THRESHOLD_EVENTS_PER_MINUTE = 600; // 高流量阈值（每分钟600事件）

  /**
   * 验证事件创建的资格条件
   */
  static canCreateEvent(
    sessionId: string,
    eventType: EventType,
    eventData: any,
    consentStatus: ConsentStatus,
    existingEventsInSession?: number,
  ): EventCreationEligibilityResult {
    const errors: string[] = [];

    // 验证会话ID
    if (!sessionId || sessionId.trim().length === 0) {
      errors.push('Valid session ID is required');
    }

    // 验证事件类型
    if (!Object.values(EventType).includes(eventType)) {
      errors.push('Invalid event type');
    }

    // 验证用户同意状态
    if (!this.isConsentValid(consentStatus, eventType)) {
      errors.push('Valid user consent is required for this event type');
    }

    // 验证会话事件数量限制
    const sessionEvents = existingEventsInSession || 0;
    if (sessionEvents >= this.MAX_EVENTS_PER_SESSION) {
      errors.push(
        `Session event limit exceeded (${this.MAX_EVENTS_PER_SESSION} events max)`,
      );
    }

    // 验证事件数据大小
    const eventSizeBytes = JSON.stringify(eventData).length;
    if (eventSizeBytes > this.MAX_EVENT_SIZE_BYTES) {
      errors.push(
        `Event size exceeds limit (${eventSizeBytes} > ${this.MAX_EVENT_SIZE_BYTES} bytes)`,
      );
    }

    // 验证事件数据完整性
    const dataValidation = this.validateEventDataStructure(
      eventType,
      eventData,
    );
    if (!dataValidation.isValid) {
      errors.push(...dataValidation.errors);
    }

    return new EventCreationEligibilityResult(
      errors.length === 0,
      errors,
      this.calculateEventPriority(eventType),
    );
  }

  /**
   * 验证用户同意状态是否有效
   */
  static isConsentValid(
    consentStatus: ConsentStatus,
    eventType: EventType,
  ): boolean {
    // 系统事件不需要用户同意
    if (this.isSystemEventType(eventType)) {
      return consentStatus === ConsentStatus.NOT_APPLICABLE;
    }

    // 用户相关事件需要有效同意
    return consentStatus === ConsentStatus.GRANTED;
  }

  /**
   * 判断是否为系统事件类型
   */
  static isSystemEventType(eventType: EventType): boolean {
    const systemEventTypes = [
      EventType.SYSTEM_PERFORMANCE,
      EventType.ERROR_EVENT,
      EventType.API_CALL,
    ];
    return systemEventTypes.includes(eventType);
  }

  /**
   * 验证事件数据结构
   */
  static validateEventDataStructure(
    eventType: EventType,
    eventData: any,
  ): EventDataValidationResult {
    const errors: string[] = [];

    if (!eventData) {
      errors.push('Event data is required');
      return new EventDataValidationResult(false, errors);
    }

    switch (eventType) {
      case EventType.USER_INTERACTION:
        if (!eventData.action) {
          errors.push('User interaction event requires action field');
        }
        if (!eventData.target) {
          errors.push('User interaction event requires target field');
        }
        break;

      case EventType.PAGE_VIEW:
        if (!eventData.pageUrl) {
          errors.push('Page view event requires pageUrl field');
        }
        if (!eventData.pageTitle) {
          errors.push('Page view event requires pageTitle field');
        }
        break;

      case EventType.FORM_SUBMISSION:
        if (!eventData.formId) {
          errors.push('Form submission event requires formId field');
        }
        if (!eventData.fields || !Array.isArray(eventData.fields)) {
          errors.push('Form submission event requires fields array');
        }
        break;

      case EventType.SYSTEM_PERFORMANCE:
        if (!eventData.operation) {
          errors.push('Performance event requires operation field');
        }
        if (typeof eventData.duration !== 'number') {
          errors.push('Performance event requires numeric duration field');
        }
        if (typeof eventData.success !== 'boolean') {
          errors.push('Performance event requires boolean success field');
        }
        break;

      case EventType.ERROR_EVENT:
        if (!eventData.errorMessage) {
          errors.push('Error event requires errorMessage field');
        }
        if (!eventData.errorCode) {
          errors.push('Error event requires errorCode field');
        }
        break;

      case EventType.BUSINESS_METRIC:
        if (!eventData.metricName) {
          errors.push('Business metric event requires metricName field');
        }
        if (typeof eventData.metricValue !== 'number') {
          errors.push(
            'Business metric event requires numeric metricValue field',
          );
        }
        if (!Object.values(MetricUnit).includes(eventData.metricUnit)) {
          errors.push('Business metric event requires valid metricUnit');
        }
        break;

      case EventType.API_CALL:
        if (!eventData.endpoint) {
          errors.push('API call event requires endpoint field');
        }
        if (!eventData.method) {
          errors.push('API call event requires method field');
        }
        if (typeof eventData.statusCode !== 'number') {
          errors.push('API call event requires numeric statusCode field');
        }
        break;
    }

    return new EventDataValidationResult(errors.length === 0, errors);
  }

  /**
   * 计算事件处理优先级
   */
  static calculateEventPriority(eventType: EventType): EventPriority {
    let priority = 0;
    const factors: string[] = [];

    // 事件类型优先级
    switch (eventType) {
      case EventType.ERROR_EVENT:
        priority += 90;
        factors.push('Critical error event');
        break;
      case EventType.SYSTEM_PERFORMANCE:
        priority += 80;
        factors.push('System performance monitoring');
        break;
      case EventType.BUSINESS_METRIC:
        priority += 70;
        factors.push('Business metric tracking');
        break;
      case EventType.USER_INTERACTION:
        priority += 50;
        factors.push('User interaction tracking');
        break;
      case EventType.API_CALL:
        priority += 40;
        factors.push('API call monitoring');
        break;
      case EventType.PAGE_VIEW:
        priority += 30;
        factors.push('Page view tracking');
        break;
      case EventType.FORM_SUBMISSION:
        priority += 60;
        factors.push('Form submission tracking');
        break;
      case EventType.CONVERSION_EVENT:
        priority += 85;
        factors.push('Conversion event tracking');
        break;
    }

    return new EventPriority(
      Math.min(100, priority),
      this.getPriorityLevel(priority),
      factors,
    );
  }

  /**
   * 验证事件是否可以进行批量处理
   */
  static canBatchProcessEvents(
    events: AnalyticsEvent[],
  ): BatchProcessingEligibilityResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (events.length === 0) {
      errors.push('No events provided for batch processing');
      return new BatchProcessingEligibilityResult(false, errors, warnings, 0);
    }

    if (events.length > this.EVENT_PROCESSING_BATCH_SIZE) {
      errors.push(
        `Batch size exceeds limit (${events.length} > ${this.EVENT_PROCESSING_BATCH_SIZE})`,
      );
    }

    // 验证事件状态
    const invalidStatusEvents = events.filter(
      (event) => event.getStatus() !== EventStatus.PENDING_PROCESSING,
    );
    if (invalidStatusEvents.length > 0) {
      warnings.push(
        `${invalidStatusEvents.length} events are not in pending status`,
      );
    }

    // 检查事件时间分布
    const eventTimes = events.map((event) =>
      new Date(event.getTimestamp()).getTime(),
    );
    const timeSpan = Math.max(...eventTimes) - Math.min(...eventTimes);
    const maxTimeSpanMs = 60 * 60 * 1000; // 1小时

    if (timeSpan > maxTimeSpanMs) {
      warnings.push('Events span more than 1 hour, consider splitting batch');
    }

    const eligibleCount = events.filter(
      (event) => event.getStatus() === EventStatus.PENDING_PROCESSING,
    ).length;

    return new BatchProcessingEligibilityResult(
      errors.length === 0,
      errors,
      warnings,
      eligibleCount,
    );
  }

  /**
   * 生成数据保留策略建议
   */
  static generateRetentionPolicy(
    event: AnalyticsEvent,
  ): AnalyticsDataRetentionPolicy {
    const eventType = event.getEventType();
    const createdAt = event.getCreatedAt();
    const retentionDays = this.getRetentionPeriodDays(eventType);

    const retentionExpiry = new Date(createdAt);
    retentionExpiry.setDate(retentionExpiry.getDate() + retentionDays);

    const anonymizationThreshold = new Date(createdAt);
    anonymizationThreshold.setDate(
      anonymizationThreshold.getDate() + this.ANONYMIZATION_THRESHOLD_DAYS,
    );

    const daysUntilExpiry = Math.ceil(
      (retentionExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const daysUntilAnonymization = Math.ceil(
      (anonymizationThreshold.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return new AnalyticsDataRetentionPolicy(
      event.getId().getValue(),
      retentionExpiry,
      anonymizationThreshold,
      daysUntilExpiry,
      daysUntilAnonymization,
      this.getRetentionActions(daysUntilExpiry, daysUntilAnonymization),
    );
  }

  /**
   * 评估隐私合规风险
   */
  static assessPrivacyComplianceRisk(
    event: AnalyticsEvent,
    userSession: UserSession,
  ): PrivacyComplianceRiskAssessment {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // 检查用户同意状态
    if (!userSession.hasValidConsent()) {
      riskScore += 40;
      riskFactors.push('Missing or expired user consent');
    }

    // 检查数据保留期限
    const retentionExpiry = event.getRetentionExpiry();
    if (retentionExpiry && Date.now() > retentionExpiry.getTime()) {
      riskScore += 50;
      riskFactors.push('Data retention period exceeded');
    }

    // 检查是否包含敏感数据
    const daysSinceCreation = Math.floor(
      (Date.now() - event.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24),
    );
    if (
      daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS &&
      event.getStatus() !== EventStatus.ANONYMIZED
    ) {
      riskScore += 30;
      riskFactors.push('Data should be anonymized based on age');
    }

    // 检查地理位置合规性
    if (event.getEventType() === EventType.USER_INTERACTION) {
      riskScore += 10;
      riskFactors.push('User interaction data requires careful handling');
    }

    return new PrivacyComplianceRiskAssessment(
      event.getId().getValue(),
      event.getSessionId(),
      Math.min(100, riskScore),
      this.getRiskLevel(riskScore),
      riskFactors,
      this.getPrivacyComplianceActions(riskScore),
    );
  }

  /**
   * 验证数据匿名化要求
   */
  static validateAnonymizationRequirement(
    event: AnalyticsEvent,
  ): AnonymizationRequirementResult {
    const daysSinceCreation = Math.floor(
      (Date.now() - event.getCreatedAt().getTime()) / (1000 * 60 * 60 * 24),
    );

    const isRequired = daysSinceCreation >= this.ANONYMIZATION_THRESHOLD_DAYS;
    const isOverdue =
      daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS + 30; // 30天宽限期

    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (isOverdue) {
      urgency = 'CRITICAL';
    } else if (isRequired) {
      urgency = 'HIGH';
    } else if (daysSinceCreation > this.ANONYMIZATION_THRESHOLD_DAYS - 30) {
      urgency = 'MEDIUM';
    } else {
      urgency = 'LOW';
    }

    return new AnonymizationRequirementResult(
      isRequired,
      isOverdue,
      urgency,
      daysSinceCreation,
      this.ANONYMIZATION_THRESHOLD_DAYS,
    );
  }

  /**
   * 计算分析报告权限
   */
  static calculateReportingPermissions(
    userRole: string,
    reportType: ReportType,
    dataScope: DataScope,
  ): ReportingPermissionsResult {
    const permissions: string[] = [];
    const restrictions: string[] = [];

    // 基于角色的权限
    switch (userRole.toLowerCase()) {
      case 'admin':
      case 'administrator':
        permissions.push('full_access', 'export_data', 'view_personal_data');
        break;

      case 'analyst':
      case 'data_analyst':
        permissions.push('view_aggregated_data', 'create_reports');
        if (dataScope === DataScope.ANONYMIZED_ONLY) {
          permissions.push('export_anonymized_data');
        }
        restrictions.push('cannot_view_raw_personal_data');
        break;

      case 'viewer':
      case 'readonly':
        permissions.push('view_reports');
        restrictions.push('cannot_export_data', 'cannot_view_personal_data');
        break;

      default:
        restrictions.push('no_access_permissions');
    }

    // 基于报告类型的权限
    if (
      reportType === ReportType.USER_BEHAVIOR &&
      !permissions.includes('view_personal_data')
    ) {
      restrictions.push('user_behavior_requires_elevated_permissions');
    }

    return new ReportingPermissionsResult(
      permissions.length > 0 && !permissions.includes('no_access_permissions'),
      permissions,
      restrictions,
    );
  }

  // 私有辅助方法
  private static getRetentionPeriodDays(eventType: EventType): number {
    switch (eventType) {
      case EventType.USER_INTERACTION:
      case EventType.PAGE_VIEW:
      case EventType.FORM_SUBMISSION:
        return this.USER_DATA_RETENTION_DAYS;

      case EventType.SYSTEM_PERFORMANCE:
      case EventType.API_CALL:
        return this.SYSTEM_DATA_RETENTION_DAYS;

      case EventType.BUSINESS_METRIC:
      case EventType.CONVERSION_EVENT:
        return this.BUSINESS_DATA_RETENTION_DAYS;

      case EventType.ERROR_EVENT:
        return this.ERROR_DATA_RETENTION_DAYS;

      default:
        return this.USER_DATA_RETENTION_DAYS;
    }
  }

  private static getPriorityLevel(
    score: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 85) return 'CRITICAL';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  }

  private static getRiskLevel(
    score: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private static getRetentionActions(
    daysUntilExpiry: number,
    daysUntilAnonymization: number,
  ): string[] {
    const actions: string[] = [];

    if (daysUntilExpiry <= 0) {
      actions.push('DELETE_IMMEDIATELY');
    } else if (daysUntilExpiry <= 7) {
      actions.push('SCHEDULE_DELETION');
    }

    if (daysUntilAnonymization <= 0) {
      actions.push('ANONYMIZE_IMMEDIATELY');
    } else if (daysUntilAnonymization <= 30) {
      actions.push('SCHEDULE_ANONYMIZATION');
    }

    if (actions.length === 0) {
      actions.push('CONTINUE_NORMAL_RETENTION');
    }

    return actions;
  }

  private static getPrivacyComplianceActions(riskScore: number): string[] {
    const actions: string[] = [];

    if (riskScore >= 75) {
      actions.push('IMMEDIATE_REVIEW_REQUIRED');
      actions.push('CONSIDER_DATA_DELETION');
      actions.push('LEGAL_CONSULTATION');
    } else if (riskScore >= 50) {
      actions.push('ENHANCED_MONITORING');
      actions.push('REVIEW_CONSENT_STATUS');
    } else if (riskScore >= 25) {
      actions.push('ROUTINE_MONITORING');
      actions.push('SCHEDULE_COMPLIANCE_CHECK');
    } else {
      actions.push('STANDARD_PROCESSING');
    }

    return actions;
  }
}

// 结果类定义
/**
 * Represents the event creation eligibility result.
 */
export class EventCreationEligibilityResult {
  /**
   * Initializes a new instance of the Event Creation Eligibility Result.
   * @param isEligible - The is eligible.
   * @param errors - The errors.
   * @param priority - The priority.
   */
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[],
    public readonly priority: EventPriority,
  ) {}
}

/**
 * Represents the event data validation result.
 */
export class EventDataValidationResult {
  /**
   * Initializes a new instance of the Event Data Validation Result.
   * @param isValid - The is valid.
   * @param errors - The errors.
   */
  constructor(
    public readonly isValid: boolean,
    public readonly errors: string[],
  ) {}
}

/**
 * Represents the event priority.
 */
export class EventPriority {
  /**
   * Initializes a new instance of the Event Priority.
   * @param score - The score.
   * @param level - The level.
   * @param factors - The factors.
   */
  constructor(
    public readonly score: number,
    public readonly level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly factors: string[],
  ) {}
}

/**
 * Represents the batch processing eligibility result.
 */
export class BatchProcessingEligibilityResult {
  /**
   * Initializes a new instance of the Batch Processing Eligibility Result.
   * @param isEligible - The is eligible.
   * @param errors - The errors.
   * @param warnings - The warnings.
   * @param eligibleEventCount - The eligible event count.
   */
  constructor(
    public readonly isEligible: boolean,
    public readonly errors: string[],
    public readonly warnings: string[],
    public readonly eligibleEventCount: number,
  ) {}
}

/**
 * Represents the analytics data retention policy.
 */
export class AnalyticsDataRetentionPolicy {
  /**
   * Initializes a new instance of the Analytics Data Retention Policy.
   * @param eventId - The event id.
   * @param retentionExpiry - The retention expiry.
   * @param anonymizationThreshold - The anonymization threshold.
   * @param daysUntilExpiry - The days until expiry.
   * @param daysUntilAnonymization - The days until anonymization.
   * @param recommendedActions - The recommended actions.
   */
  constructor(
    public readonly eventId: string,
    public readonly retentionExpiry: Date,
    public readonly anonymizationThreshold: Date,
    public readonly daysUntilExpiry: number,
    public readonly daysUntilAnonymization: number,
    public readonly recommendedActions: string[],
  ) {}
}

/**
 * Represents the privacy compliance risk assessment.
 */
export class PrivacyComplianceRiskAssessment {
  /**
   * Initializes a new instance of the Privacy Compliance Risk Assessment.
   * @param eventId - The event id.
   * @param sessionId - The session id.
   * @param riskScore - The risk score.
   * @param riskLevel - The risk level.
   * @param riskFactors - The risk factors.
   * @param recommendedActions - The recommended actions.
   */
  constructor(
    public readonly eventId: string,
    public readonly sessionId: string,
    public readonly riskScore: number,
    public readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly riskFactors: string[],
    public readonly recommendedActions: string[],
  ) {}
}

/**
 * Represents the anonymization requirement result.
 */
export class AnonymizationRequirementResult {
  /**
   * Initializes a new instance of the Anonymization Requirement Result.
   * @param isRequired - The is required.
   * @param isOverdue - The is overdue.
   * @param urgency - The urgency.
   * @param daysSinceCreation - The days since creation.
   * @param anonymizationThresholdDays - The anonymization threshold days.
   */
  constructor(
    public readonly isRequired: boolean,
    public readonly isOverdue: boolean,
    public readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public readonly daysSinceCreation: number,
    public readonly anonymizationThresholdDays: number,
  ) {}
}

/**
 * Represents the reporting permissions result.
 */
export class ReportingPermissionsResult {
  /**
   * Initializes a new instance of the Reporting Permissions Result.
   * @param hasAccess - The has access.
   * @param permissions - The permissions.
   * @param restrictions - The restrictions.
   */
  constructor(
    public readonly hasAccess: boolean,
    public readonly permissions: string[],
    public readonly restrictions: string[],
  ) {}
}

// 枚举定义
export enum ReportType {
  USER_BEHAVIOR = 'user_behavior',
  SYSTEM_PERFORMANCE = 'system_performance',
  BUSINESS_METRICS = 'business_metrics',
  ERROR_ANALYSIS = 'error_analysis',
  CONVERSION_FUNNEL = 'conversion_funnel',
}

export enum DataScope {
  FULL_ACCESS = 'full_access',
  ANONYMIZED_ONLY = 'anonymized_only',
  AGGREGATED_ONLY = 'aggregated_only',
}

// 接口定义
/**
 * Defines the shape of the session analytics.
 */
export interface SessionAnalytics {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  eventCount: number;
  lastActivityTime: Date;
  isActive: boolean;
  averageEventInterval: number;
}

/**
 * Defines the shape of the event processing metrics.
 */
export interface EventProcessingMetrics {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  throughputPerSecond: number;
  errorRate: number;
}

/**
 * Defines the shape of the data privacy metrics.
 */
export interface DataPrivacyMetrics {
  totalEvents: number;
  anonymizedEvents: number;
  expiredEvents: number;
  pendingAnonymization: number;
  complianceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
