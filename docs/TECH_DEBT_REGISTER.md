# Technical Debt Register - AI Recruitment Clerk

Last Updated: 2026-02-04

This document tracks the top 20 technical debt items requiring attention for long-term maintainability.

## Priority Legend
- **High**: Immediate attention required - affects stability or security
- **Medium**: Plan within 1-2 sprints - affects maintainability
- **Low**: Backlog - address when capacity allows

---

## High Priority Items

### 1. Large Files Exceeding 500 Lines
- **Impact**: High
- **Location**: Multiple services and frontend components
- **Owner**: Frontend Team
- **Description**: Monolithic files violating CLAUDE.md component splitting rules (mobile-dashboard.component.ts ~1208 lines)
- **Suggested Fix**: Split components into display/filter/service patterns per CLAUDE.md guidelines

### 2. Excessive `any` Type Usage
- **Impact**: High
- **Location**: 164+ files across codebase
- **Owner**: Backend Team
- **Description**: Widespread violation of TypeScript strict mode rules (`"strict": true` requirement)
- **Suggested Fix**: Replace with explicit interfaces; add type check to CI pipeline

### 3. Inconsistent Error Handling
- **Impact**: High
- **Location**: 239+ files with mixed try-catch patterns
- **Owner**: Backend Team
- **Description**: No unified error handling strategy; inconsistent error propagation
- **Suggested Fix**: Standardize on libs/infrastructure-shared error handling patterns

### 4. Domain Model Duplication
- **Impact**: High
- **Location**: libs/shared-dtos vs domain libraries
- **Owner**: Architecture Team
- **Description**: Same DTOs duplicated across multiple libraries causing sync issues
- **Suggested Fix**: Consolidate to single source of truth; remove duplicate domain libraries

### 5. Missing Tests for Critical Components
- **Impact**: High
- **Location**: Core services and business logic
- **Owner**: QA Team
- **Description**: Many components lack unit test coverage despite critical path being covered
- **Suggested Fix**: Target 90%+ coverage for business logic; add integration tests

### 13. Inconsistent Security Practices
- **Impact**: High
- **Location**: Authentication and authorization modules
- **Owner**: Security Team
- **Description**: Mixed security approaches; no centralized auth logic
- **Suggested Fix**: Centralize authentication; consistent JWT handling; add security middleware

---

## Medium Priority Items

### 6. TODO Comments in Production Code
- **Impact**: Medium
- **Location**: 97+ files with TODO markers
- **Owner**: All Teams
- **Description**: Technical debt markers left in production code
- **Suggested Fix**: Create tickets for each TODO; implement or remove within 2 sprints

### 7. Hard-coded Configuration Values
- **Impact**: Medium
- **Location**: 190+ files with hardcoded URLs/ports
- **Owner**: DevOps Team
- **Description**: Configuration scattered throughout; violates env-validator pattern
- **Suggested Fix**: Centralize in libs/configuration with environment validation

### 9. Components Without Proper Splitting
- **Impact**: Medium
- **Location**: ai-recruitment-frontend/src/app/components
- **Owner**: Frontend Team
- **Description**: Components exceeding 500 lines without extraction
- **Suggested Fix**: Apply mobile component splitting patterns (display/filter/service)

### 10. Inconsistent Logging Patterns
- **Impact**: Medium
- **Location**: Multiple services and components
- **Owner**: Ops Team
- **Description**: Mixed console.log vs proper logging usage
- **Suggested Fix**: Implement structured logging with correlation IDs via shared logger

### 11. Missing Input Validation
- **Impact**: Medium
- **Location**: API endpoints and services
- **Owner**: Backend Team
- **Description**: Inconsistent validation patterns across endpoints
- **Suggested Fix**: Global validation pipes; DTO validation decorators

### 12. Performance Optimization Debt
- **Impact**: Medium
- **Location**: Cache and database operations
- **Owner**: Backend Team
- **Description**: Inefficient caching and query patterns
- **Suggested Fix**: Proper cache invalidation; optimize queries with indexing

### 14. Missing Health Checks
- **Impact**: Medium
- **Location**: Microservices
- **Owner**: DevOps Team
- **Description**: Not all services expose /api/health endpoints
- **Suggested Fix**: Add health endpoints; implement dependency checks; readiness/liveness probes

### 15. Documentation Debt
- **Impact**: Medium
- **Location**: APIs and services
- **Owner**: All Teams
- **Description**: Missing or outdated API documentation
- **Suggested Fix**: Generate Swagger docs; document domain services

### 16. Configuration Management
- **Impact**: Medium
- **Location**: Environment and deployment configs
- **Owner**: DevOps Team
- **Description**: Inconsistent configuration across environments
- **Suggested Fix**: Use libs/configuration utility; create config templates

### 17. Test Data Management
- **Impact**: Medium
- **Location**: Test files
- **Owner**: QA Team
- **Description**: Inconsistent test data creation and cleanup
- **Suggested Fix**: Implement test data factories; standardize cleanup

### 18. Monitoring and Observability
- **Impact**: Medium
- **Location**: Distributed services
- **Owner**: Ops Team
- **Description**: Inconsistent monitoring across services
- **Suggested Fix**: Distributed tracing; structured logging; centralized dashboard

---

## Low Priority Items

### 19. File Organization Issues
- **Impact**: Low
- **Location**: Root directory violations
- **Owner**: All Teams
- **Description**: Files occasionally saved in incorrect directories
- **Suggested Fix**: Enforce strict directory hierarchy per CLAUDE.md Rule 5

### 20. Build and CI Optimization
- **Impact**: Low
- **Location**: Package.json and build scripts
- **Owner**: DevOps Team
- **Description**: Slow build times; potential unused dependencies
- **Suggested Fix**: Optimize build parallelization; remove unused deps

---

## Tracking

| ID | Item | Status | Target Date |
|----|------|--------|-------------|
| 1 | Large Files | Open | TBD |
| 2 | Any Type Usage | Open | TBD |
| 3 | Error Handling | Open | TBD |
| 4 | Domain Duplication | Open | TBD |
| 5 | Missing Tests | Open | TBD |
| 6 | TODO Comments | Open | TBD |
| 7 | Hard-coded Config | Open | TBD |
| 8 | ESM/CommonJS Mixed | Open | TBD |
| 9 | Component Splitting | Open | TBD |
| 10 | Logging Patterns | Open | TBD |
| 11 | Input Validation | Open | TBD |
| 12 | Performance | Open | TBD |
| 13 | Security Practices | Open | TBD |
| 14 | Health Checks | Open | TBD |
| 15 | Documentation | Open | TBD |
| 16 | Config Management | Open | TBD |
| 17 | Test Data | Open | TBD |
| 18 | Monitoring | Open | TBD |
| 19 | File Organization | Open | TBD |
| 20 | CI Optimization | Open | TBD |

---

## Notes

- Items 1-5 (High Priority) should be addressed first
- This register will be updated monthly during sprint planning
- New items should be added with consensus from tech leads
- When closing an item, add a brief note on the resolution approach
