/**
 * API Contracts Library
 * Shared contract definitions between Angular frontend and NestJS backend
 * Ensures type safety and consistency across the entire application
 */

// Job Management Contracts
export { JobContracts } from './job-management/job.contracts.js';

// Report Generation Contracts  
export { ReportContracts } from './report-generation/report.contracts.js';

// Resume Processing Contracts
export { ResumeContracts } from './resume-processing/resume.contracts.js';

// Contract Validation Utilities
export * from './validation/index.js';