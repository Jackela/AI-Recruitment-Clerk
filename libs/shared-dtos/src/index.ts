// Models
export * from './models/resume.dto';
export * from './models/feedback-code.dto';

// DTO Interfaces
export * from './dto/jd.dto';

// Events
export * from './events/resume-events.dto';
export * from './events/job-events.dto';

// Authentication & Authorization
export * from './auth/user.dto';
export * from './auth/permissions.dto';
export * from './auth/request.dto';

// Encryption
export * from './encryption/encryption.service';

// Utilities
export * from './utils/retry.utility';

// Database Performance Monitoring
export * from './database/performance-monitor';

// Validation
export * from './validation/input-validator';

// Security Configuration
export * from './config/secure-config.validator';

// NATS Configuration
export * from './nats/nats.config';

// Gemini Client
export * from './gemini/gemini.client';

// Skills Taxonomy
export * from './skills/skills-taxonomy';

// Prompt Templates
export * from './prompts/prompt-templates';

// Error Handling - Enhanced System
export * from './errors/gemini-errors';
export * from './errors/error-correlation';
export * from './errors/enhanced-error-types';
export * from './errors/domain-errors';
export * from './errors/error-response-formatter';
export * from './errors/structured-logging';
export * from './errors/global-exception.filter';
export * from './errors/error-interceptors';

// Error Handling Infrastructure
export * from './interceptors/global-error.interceptor';
export * from './interceptors/global-exception.filter';
export * from './interceptors/error-handling.module';

// Error Handling Decorators and Utilities
export * from './decorators/error-handling.decorators';
export * from './utils/error-handling.utilities';

// Design by Contract
export * from './contracts/dbc.decorators';

// Domain Models - User Management & Questionnaire
export * from './domains/user-management.dto';
export * from './domains/questionnaire.dto';
export { QuestionnaireDomainService, QuestionnaireSubmissionResult, IPSubmissionCheckResult } from './domains/questionnaire.service';
export type { IQuestionnaireRepository, IQuestionnaireTemplateService } from './domains/questionnaire.service';
export * from './domains/questionnaire.rules';
export * from './contracts/questionnaire.contracts';

// Domain Models - Usage Limits
export { 
  UsageLimit, 
  UsageLimitId,
  IPAddress,
  UsageLimitPolicy, 
  QuotaAllocation,
  UsageTracking,
  UsageRecord, 
  UsageLimitCheckResult,
  UsageRecordResult,
  UsageStatistics,
  BonusType,
  UsageLimitCreatedEvent,
  UsageLimitExceededEvent,
  BonusQuotaAddedEvent,
  DailyUsageResetEvent,
  UsageRecordedEvent as UsageLimitUsageRecordedEvent
} from './domains/usage-limit.dto';
export { UsageLimitDomainService, UsageLimitResult, UsageTrackingResult, UsageStatsResult } from './domains/usage-limit.service';
export type { IUsageLimitRepository } from './domains/usage-limit.service';
export * from './domains/usage-limit.rules';
export * from './contracts/usage-limit.contracts';

// Domain Models - Incentives
export * from './domains/incentive.dto';
export { IncentiveDomainService, IncentiveCreationResult, IncentiveValidationResult, IncentiveApprovalResult, PaymentProcessingResult } from './domains/incentive.service';
export type { IIncentiveRepository, IPaymentGateway } from './domains/incentive.service';
export * from './domains/incentive.rules';
export * from './contracts/incentive.contracts';

// Domain Models - Analytics  
export { AnalyticsEvent, AnalyticsEventId, UserSession as AnalyticsUserSession, EventStatus, EventType, EventCategory, ConsentStatus, MetricUnit, AnalyticsEventSummary, DeviceInfo, GeoLocation } from './domains/analytics.dto';
export type { AnalyticsEventData } from './domains/analytics.dto';
export { AnalyticsDomainService, EventCreationResult, BatchProcessingResult, PrivacyComplianceResult, DataRetentionReportResult, SessionAnalyticsResult, EventProcessingMetricsResult, DataPrivacyMetricsResult, ReportingAccessResult } from './domains/analytics.service';
export type { IAnalyticsRepository, IDomainEventBus, IAuditLogger, IPrivacyService, ISessionTracker } from './domains/analytics.service';
export * from './domains/analytics.rules';
export * from './contracts/analytics.contracts';

// Privacy & GDPR Compliance
export * from './privacy/consent.dto';
export * from './privacy/data-subject-rights.dto';
export * from './privacy/privacy-simple.dto';
// export * from './privacy/privacy-infrastructure.dto'; // Commented out due to duplicate exports

// Common Patterns - 通用模式
export * from './common/base-service.pattern';
export * from './common/nats-client.pattern';
// export * from './common/validation.patterns'; // Commented out due to ValidationResult duplicate export
// Note: mobile-component.patterns depends on Angular and breaks Node test envs.
// It is intentionally not re-exported from the root barrel to keep backend tests working.
export * from './common/error-handling.patterns';
