# API Contract Validation Strategy
*AI Recruitment Clerk - DDD Refactoring*

## Overview

This strategy ensures type safety and consistency between Angular frontend contracts and NestJS backend DTOs to prevent runtime errors and maintain API compatibility.

## Problem Statement

### Current Issues Identified
1. **Status Enum Mismatch**: Frontend Job interface defines 5 status values while backend only supports 2
2. **Contract Drift Risk**: Frontend and backend contracts evolve independently with no validation
3. **No Type Safety Bridge**: No mechanism to validate frontend interfaces against backend DTOs
4. **Runtime Error Risk**: Mismatched contracts can cause unexpected failures

### Architectural Context
- **Frontend**: Angular with local interface definitions (good DDD separation)
- **Backend**: NestJS with domain-specific DTOs in new libraries
- **Communication**: REST API through app-gateway service

## Validation Strategy

### Phase 1: Contract Definition & Standardization

#### 1.1 Create Shared Contract Definitions
```typescript
// libs/api-contracts/src/job-management/job.contracts.ts
export namespace JobContracts {
  export type JobStatus = 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  
  export interface JobBase {
    id: string;
    title: string;
    status: JobStatus;
    createdAt: Date;
    resumeCount: number;
  }
  
  export interface JobDetail extends JobBase {
    jdText: string;
  }
  
  export interface CreateJobRequest {
    jobTitle: string;
    jdText: string;
  }
}
```

#### 1.2 Contract Validation Schema
```typescript
// libs/api-contracts/src/validation/contract.validator.ts
export class ContractValidator {
  static validateJobContract(frontendJob: any, backendJob: any): ValidationResult {
    // Validate structure and types match
  }
  
  static validateStatusEnumConsistency(): ValidationResult {
    // Ensure status enums are synchronized
  }
}
```

### Phase 2: Automated Validation Pipeline

#### 2.1 Build-Time Validation
```typescript
// tools/contract-validation/validate-contracts.ts
import { JobContracts } from '@ai-recruitment-clerk/api-contracts';

// Type-level validation using TypeScript utilities
type ValidateJobInterface<T> = T extends JobContracts.JobBase ? T : never;

// Runtime validation during build
export function validateAllContracts(): ValidationResult[] {
  return [
    validateJobContracts(),
    validateResumeContracts(),
    validateReportContracts(),
  ];
}
```

#### 2.2 Integration into CI/CD
```yaml
# .github/workflows/contract-validation.yml
- name: Validate API Contracts
  run: |
    npm run validate:contracts
    npm run test:contract-compatibility
```

#### 2.3 Runtime Validation (Development)
```typescript
// apps/app-gateway/src/validation/runtime-contract.validator.ts
export class RuntimeContractValidator {
  static validateResponse<T>(response: T, contract: string): T {
    if (process.env.NODE_ENV === 'development') {
      // Validate response matches expected contract
      this.validateAgainstSchema(response, contract);
    }
    return response;
  }
}
```

### Phase 3: Contract Evolution Management

#### 3.1 Contract Versioning
```typescript
// libs/api-contracts/src/versioning/contract-versions.ts
export namespace ContractVersions {
  export namespace V1 {
    export type JobStatus = 'processing' | 'completed';
  }
  
  export namespace V2 {
    export type JobStatus = 'draft' | 'active' | 'processing' | 'completed' | 'closed';
  }
}
```

#### 3.2 Migration Strategy
```typescript
// apps/app-gateway/src/migrations/contract-migrations.ts
export class ContractMigration {
  static migrateJobStatusV1ToV2(oldJob: V1.Job): V2.Job {
    // Handle backward compatibility
    return {
      ...oldJob,
      status: this.mapOldStatusToNew(oldJob.status)
    };
  }
}
```

### Phase 4: Monitoring & Alerting

#### 4.1 Contract Drift Detection
```typescript
// tools/monitoring/contract-drift-detector.ts
export class ContractDriftDetector {
  static detectDrift(): DriftReport {
    return {
      frontendContracts: this.scanFrontendInterfaces(),
      backendContracts: this.scanBackendDTOs(),
      discrepancies: this.findDiscrepancies(),
      riskLevel: this.assessRisk()
    };
  }
}
```

#### 4.2 Automated Alerts
```typescript
// tools/monitoring/contract-alerts.ts
export class ContractAlerts {
  static checkAndAlert(): void {
    const drift = ContractDriftDetector.detectDrift();
    if (drift.riskLevel === 'HIGH') {
      this.sendSlackAlert(drift);
      this.createGitHubIssue(drift);
    }
  }
}
```

## Implementation Roadmap

### Immediate Actions (High Priority)
1. **Fix Status Enum Mismatch**
   - Update backend to support all 5 status values OR
   - Update frontend to use only 2 status values
2. **Create api-contracts library** with shared type definitions
3. **Add build-time validation** to catch discrepancies

### Short-term (Medium Priority)
1. Implement runtime validation in development
2. Create automated contract comparison tests
3. Add CI/CD pipeline integration

### Long-term (Low Priority)
1. Contract versioning and migration system
2. Automated drift detection and alerting
3. Contract documentation generation

## Benefits

1. **Type Safety**: Compile-time detection of contract mismatches
2. **Runtime Safety**: Development-time validation prevents deployment of broken contracts
3. **Documentation**: Self-documenting API contracts
4. **Evolution Management**: Safe contract evolution with backward compatibility
5. **Developer Experience**: Clear feedback on contract violations

## Risk Mitigation

1. **Breaking Changes**: Automated detection prevents accidental breaking changes
2. **Communication Gaps**: Shared contracts improve frontend-backend communication
3. **Runtime Failures**: Early detection reduces production issues
4. **Technical Debt**: Prevents accumulation of contract inconsistencies

## Conclusion

This comprehensive validation strategy ensures robust API contract consistency while maintaining the benefits of DDD separation. The phased approach allows for immediate risk mitigation while building toward a fully automated contract management system.