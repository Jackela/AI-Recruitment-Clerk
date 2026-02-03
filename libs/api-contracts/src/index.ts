/**
 * API Contracts Library
 * Shared contract definitions between Angular frontend and NestJS backend
 * Ensures type safety and consistency across the entire application
 */

// Job Management Contracts
export type { JobContracts } from './job-management/job.contracts.js';

// Report Generation Contracts
export type { ReportContracts } from './report-generation/report.contracts.js';

// Resume Processing Contracts
export type { ResumeContracts } from './resume-processing/resume.contracts.js';

// Contract Validation Utilities
export * from './validation/index.js';
