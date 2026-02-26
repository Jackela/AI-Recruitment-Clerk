// Infrastructure Shared Enums

export enum DataSubjectRightType {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection',
}

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum IdentityVerificationStatus {
  NOT_VERIFIED = 'not_verified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum DataExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
  XML = 'xml',
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum JobType {
  DATA_PROCESSING = 'data_processing',
  REPORT_GENERATION = 'report_generation',
  ANALYTICS = 'analytics',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
}

export enum EventType {
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event',
  ERROR_EVENT = 'error_event',
  PERFORMANCE_EVENT = 'performance_event',
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum EventCategory {
  AUTHENTICATION = 'authentication',
  ANALYTICS = 'analytics',
  SYSTEM = 'system',
  USER = 'user',
}

export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
}
