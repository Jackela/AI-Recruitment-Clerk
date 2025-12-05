# Implementation Tasks

## 1. SSOT Consolidation (Sprint 1)

### 1.1 Consolidate ResumeDTO
- [ ] 1.1.1 Verify canonical ResumeDTO in `libs/shared-dtos/src/models/resume.dto.ts`
- [ ] 1.1.2 Delete duplicate `libs/resume-processing-domain/src/application/dtos/resume.dto.ts`
- [ ] 1.1.3 Update `libs/resume-processing-domain/src/index.ts` to re-export from shared-dtos
- [ ] 1.1.4 Update all consumer imports (15+ files)

### 1.2 Consolidate ValidationResult
- [ ] 1.2.1 Create `libs/shared-dtos/src/validation/types.ts` with canonical ValidationResult
- [ ] 1.2.2 Update `libs/shared-dtos/src/validation/input-validator.ts` to import from types
- [ ] 1.2.3 Update `libs/shared-dtos/src/common/validation.patterns.ts`
- [ ] 1.2.4 Update `libs/api-contracts/src/validation/contract.validator.ts`
- [ ] 1.2.5 Update `libs/shared-dtos/src/index.ts` with new export

### 1.3 Consolidate Health Check Types
- [ ] 1.3.1 Create `libs/shared-dtos/src/health/types.ts`
- [ ] 1.3.2 Move interfaces from `health-check.service.ts`
- [ ] 1.3.3 Update all health check consumers

### 1.4 Centralize Constants
- [ ] 1.4.1 Create `libs/shared-dtos/src/constants/file-validation.constants.ts`
- [ ] 1.4.2 Update `InputValidator` to use centralized constants
- [ ] 1.4.3 Update parsing services to use centralized constants
- [ ] 1.4.4 Update controllers to use centralized constants

## 2. Security Test Coverage (Sprint 2)

### 2.1 Guard Tests
- [ ] 2.1.1 Create `local-auth.guard.spec.ts`
- [ ] 2.1.2 Create `roles.guard.spec.ts`
- [ ] 2.1.3 Create `conditional-throttler.guard.spec.ts`
- [ ] 2.1.4 Create `api-key.guard.spec.ts`

### 2.2 Middleware Tests
- [ ] 2.2.1 Create `csrf-protection.middleware.spec.ts`
- [ ] 2.2.2 Create `security-headers.middleware.spec.ts`
- [ ] 2.2.3 Create `correlation-id.middleware.spec.ts`
- [ ] 2.2.4 Create `request-logging.middleware.spec.ts`

## 3. DRY Consolidation (Sprint 3)

### 3.1 ParsingService Strategy Pattern
- [ ] 3.1.1 Create `parsing-strategy.interface.ts`
- [ ] 3.1.2 Create `pdf-parser.strategy.ts`
- [ ] 3.1.3 Create `docx-parser.strategy.ts`
- [ ] 3.1.4 Create `text-parser.strategy.ts`
- [ ] 3.1.5 Refactor `parsing.service.ts` to orchestrator
- [ ] 3.1.6 Delete `parsing.service.enhanced.ts`
- [ ] 3.1.7 Update `parsing.module.ts`

### 3.2 File Validation Service
- [ ] 3.2.1 Create `libs/shared-dtos/src/validation/file-validator.service.ts`
- [ ] 3.2.2 Migrate validation logic from InputValidator
- [ ] 3.2.3 Update consumers

## 4. SRP Refactoring (Sprint 4)

### 4.1 Split AuthService
- [ ] 4.1.1 Create `registration.service.ts`
- [ ] 4.1.2 Create `authentication.service.ts`
- [ ] 4.1.3 Create `token.service.ts`
- [ ] 4.1.4 Create `password.service.ts`
- [ ] 4.1.5 Create `session.service.ts`
- [ ] 4.1.6 Refactor `auth.service.ts` to facade
- [ ] 4.1.7 Update `auth.module.ts`

### 4.2 Split AnalyticsIntegrationService
- [ ] 4.2.1 Create `event-tracking.service.ts`
- [ ] 4.2.2 Create `metrics.service.ts`
- [ ] 4.2.3 Create `reporting.service.ts`
- [ ] 4.2.4 Create `privacy.service.ts`
- [ ] 4.2.5 Refactor `analytics-integration.service.ts` to facade
- [ ] 4.2.6 Update `analytics.module.ts`

## 5. Remaining Tests (Sprint 5)

### 5.1 Interceptor Tests
- [ ] 5.1.1 Create `service-integration.interceptor.spec.ts`
- [ ] 5.1.2 Create `timeout.interceptor.spec.ts`
- [ ] 5.1.3 Create `logging.interceptor.spec.ts`
- [ ] 5.1.4 Create `transform.interceptor.spec.ts`

### 5.2 Controller Tests
- [ ] 5.2.1 Create/expand `resume.controller.spec.ts`
- [ ] 5.2.2 Create/expand `analytics.controller.spec.ts`
- [ ] 5.2.3 Create/expand `jobs.controller.spec.ts`

## 6. Validation
- [ ] 6.1 Run full lint suite
- [ ] 6.2 Run all unit tests
- [ ] 6.3 Run integration tests
- [ ] 6.4 Verify coverage targets met
- [ ] 6.5 Update openspec tasks.md statuses
