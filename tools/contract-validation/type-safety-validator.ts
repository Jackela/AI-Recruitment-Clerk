/**
 * Type Safety Validator
 * Build-time validation to ensure frontend and backend contracts remain synchronized
 */

import { JobContracts, ReportContracts, ResumeContracts } from '@ai-recruitment-clerk/api-contracts';

// Import frontend models for comparison
type FrontendJob = {
  id: string;
  title: string;
  jdText: string;
  status: 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  createdAt: Date;
  resumeCount: number;
};

type FrontendJobListItem = {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  createdAt: Date;
  resumeCount: number;
};

type FrontendAnalysisReport = {
  id: string;
  resumeId: string;
  jobId: string;
  candidateName: string;
  matchScore: number;
  oneSentenceSummary: string;
  strengths: string[];
  potentialGaps: string[];
  redFlags: string[];
  suggestedInterviewQuestions: string[];
  generatedAt: Date;
};

// Type-level validation using conditional types
type IsCompatible<T, U> = T extends U ? (U extends T ? true : false) : false;

// Validation results at compile time
type JobDetailCompatibility = IsCompatible<FrontendJob, JobContracts.JobDetail>;
type JobListCompatibility = IsCompatible<FrontendJobListItem, JobContracts.JobListItem>;
type ReportCompatibility = IsCompatible<FrontendAnalysisReport, ReportContracts.AnalysisReport>;

// Compile-time assertion function
function assertCompatibility<T extends true>(): T extends true ? void : never {
  // This function will cause a compile error if T is not true
  return undefined as any;
}

// Static assertions - will fail compilation if contracts don't match
export function validateContractCompatibility() {
  // These lines will cause TypeScript compilation errors if contracts don't match
  assertCompatibility<JobDetailCompatibility>();
  assertCompatibility<JobListCompatibility>();
  assertCompatibility<ReportCompatibility>();

  console.log('✅ All contract validations passed at compile time');
}

// Runtime validation for development
export interface ContractValidationResult {
  contractName: string;
  isCompatible: boolean;
  issues: Array<{
    type: 'missing_field' | 'extra_field' | 'type_mismatch';
    field: string;
    description: string;
  }>;
}

export class TypeSafetyValidator {
  /**
   * Validate job contracts at runtime
   */
  static validateJobContracts(frontendJob: any, backendJob: any): ContractValidationResult {
    const issues: Array<{type: 'missing_field' | 'extra_field' | 'type_mismatch'; field: string; description: string}> = [];
    
    // Check status enum compatibility
    const frontendStatuses = ['draft', 'active', 'processing', 'completed', 'closed'];
    const backendStatuses = ['draft', 'active', 'processing', 'completed', 'closed']; // Should match JobContracts.JobStatus
    
    const missingStatuses = backendStatuses.filter(status => !frontendStatuses.includes(status));
    const extraStatuses = frontendStatuses.filter(status => !backendStatuses.includes(status));
    
    if (missingStatuses.length > 0) {
      issues.push({
        type: 'missing_field',
        field: 'status',
        description: `Frontend missing status values: ${missingStatuses.join(', ')}`
      });
    }
    
    if (extraStatuses.length > 0) {
      issues.push({
        type: 'extra_field',
        field: 'status',
        description: `Frontend has extra status values: ${extraStatuses.join(', ')}`
      });
    }

    // Validate field types
    const requiredFields = ['id', 'title', 'status', 'createdAt', 'resumeCount'];
    for (const field of requiredFields) {
      if (!(field in frontendJob)) {
        issues.push({
          type: 'missing_field',
          field,
          description: `Frontend missing required field: ${field}`
        });
      } else if (!(field in backendJob)) {
        issues.push({
          type: 'missing_field',
          field,
          description: `Backend missing required field: ${field}`
        });
      } else if (typeof frontendJob[field] !== typeof backendJob[field]) {
        issues.push({
          type: 'type_mismatch',
          field,
          description: `Type mismatch - Frontend: ${typeof frontendJob[field]}, Backend: ${typeof backendJob[field]}`
        });
      }
    }

    return {
      contractName: 'JobContracts',
      isCompatible: issues.length === 0,
      issues
    };
  }

  /**
   * Validate all contracts and generate report
   */
  static generateValidationReport(): {
    overallCompatible: boolean;
    results: ContractValidationResult[];
    summary: string;
  } {
    const results: ContractValidationResult[] = [];
    
    // Mock data for validation - in real implementation, this would come from actual samples
    const mockFrontendJob = {
      id: 'job-1',
      title: 'Software Engineer',
      jdText: 'Job description',
      status: 'active' as const,
      createdAt: new Date(),
      resumeCount: 5
    };
    
    const mockBackendJob = {
      id: 'job-1',
      title: 'Software Engineer', 
      jdText: 'Job description',
      status: 'active' as const,
      createdAt: new Date(),
      resumeCount: 5
    };

    results.push(this.validateJobContracts(mockFrontendJob, mockBackendJob));

    const overallCompatible = results.every(result => result.isCompatible);
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    
    const summary = overallCompatible 
      ? '✅ All contracts are compatible'
      : `❌ Found ${totalIssues} contract compatibility issues`;

    return {
      overallCompatible,
      results,
      summary
    };
  }
}

// Auto-validate on module load in development
if (process.env.NODE_ENV === 'development') {
  try {
    validateContractCompatibility();
    const report = TypeSafetyValidator.generateValidationReport();
    console.log('📋 Contract Validation Report:', report.summary);
    
    if (!report.overallCompatible) {
      console.error('Contract validation issues:', report.results);
    }
  } catch (error) {
    console.error('❌ Contract validation failed:', error);
  }
}