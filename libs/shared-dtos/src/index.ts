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

// Validation
export * from './validation/input-validator';

// NATS Configuration
export * from './nats/nats.config';

// Gemini Client
export * from './gemini/gemini.client';

// Skills Taxonomy
export * from './skills/skills-taxonomy';

// Prompt Templates
export * from './prompts/prompt-templates';

// Error Handling
export * from './errors/gemini-errors';

// Design by Contract
export * from './contracts/dbc.decorators';

// Domain Models - User Management & Questionnaire
export * from './domains/user-management.dto';
export * from './domains/questionnaire.dto';
export { QuestionnaireDomainService, QuestionnaireSubmissionResult, IPSubmissionCheckResult, IQuestionnaireRepository, IQuestionnaireTemplateService } from './domains/questionnaire.service';
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
  UsageLimitData,
  UsageLimitCreatedEvent,
  UsageLimitExceededEvent,
  BonusQuotaAddedEvent,
  DailyUsageResetEvent,
  UsageRecordedEvent as UsageLimitUsageRecordedEvent
} from './domains/usage-limit.dto';
export { UsageLimitDomainService, UsageLimitResult, UsageTrackingResult, UsageStatsResult, IUsageLimitRepository } from './domains/usage-limit.service';
export * from './domains/usage-limit.rules';
export * from './contracts/usage-limit.contracts';

// Domain Models - Incentives
export * from './domains/incentive.dto';
export { IncentiveDomainService, IncentiveCreationResult, IncentiveValidationResult, IncentiveApprovalResult, PaymentProcessingResult, IIncentiveRepository, IPaymentGateway } from './domains/incentive.service';
export * from './domains/incentive.rules';
export * from './contracts/incentive.contracts';

// Domain Models - Analytics  
export { AnalyticsEvent, AnalyticsEventId, UserSession as AnalyticsUserSession, EventStatus, EventType, EventCategory, ConsentStatus, MetricUnit, AnalyticsEventSummary, AnalyticsEventData, DeviceInfo, GeoLocation } from './domains/analytics.dto';
export { AnalyticsDomainService, EventCreationResult, BatchProcessingResult, PrivacyComplianceResult, DataRetentionReportResult, SessionAnalyticsResult, EventProcessingMetricsResult, DataPrivacyMetricsResult, ReportingAccessResult, IAnalyticsRepository, IDomainEventBus, IAuditLogger, IPrivacyService, ISessionTracker } from './domains/analytics.service';
export * from './domains/analytics.rules';
export * from './contracts/analytics.contracts';

// Privacy & GDPR Compliance
export * from './privacy/consent.dto';
export * from './privacy/data-subject-rights.dto';
export * from './privacy/privacy-simple.dto';