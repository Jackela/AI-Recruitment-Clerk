# Implementation Plan: Dependency Vulnerability Hardening

**Branch**: `001-harden-deps` | **Date**: 2025-10-30 | **Spec**: [specs/001-harden-deps/spec.md](specs/001-harden-deps/spec.md)  
**Input**: Feature specification from `/specs/001-harden-deps/spec.md`

## Summary

Eliminate all high- and moderate-severity dependency vulnerabilities across the Nx monorepo by upgrading or replacing packages, enforcing release gates, and documenting residual risk paths. The approach focuses on targeted dependency upgrades, remediation tracking, enriching scan outputs with remediation ownership, and hardening CI workflows so dependency-scans fail when unresolved vulnerabilities remain.

## Technical Context

**Language/Version**: TypeScript (Node.js 20.x)  
**Primary Dependencies**: Nx build system, NestJS backend services, Angular frontend, Jest, Playwright, npm audit tooling  
**Storage**: Existing service data stores (MongoDB/PostgreSQL) unchanged; no new storage required  
**Testing**: Nx-managed Jest unit/integration suites, contract validation workflows, Playwright E2E, dependency-scan CI jobs  
**Target Platform**: Containerized Node.js services and Angular SPA deployed via existing CI/CD  
**Project Type**: Full-stack web monorepo (frontend + backend services)  
**Performance Goals**: Keep end-to-end CI pipeline runtime at or below 18 minutes (current baseline) while ensuring dependency scans complete within CI timeouts  
**Constraints**: Releases blocked unless zero outstanding high/mod vulnerabilities; all automated checks must stay green post-updates  
**Scale/Scope**: Applies across all apps (`apps/app-gateway`, `apps/ai-recruitment-frontend`, services) and shared libs ensuring enterprise-wide dependency hygiene

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Gate 1 – Constitution Definition: Project constitution file currently contains placeholders and no enforceable principles. PASS with note: document true principles in a future governance update.
- Post-Phase-1 Review: Design artifacts introduce no new constitution considerations; gate status remains PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-harden-deps/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 findings
├── data-model.md        # Phase 1 entity definitions
├── quickstart.md        # Phase 1 onboarding guide
├── contracts/           # Phase 1 API contracts
└── tasks.md             # Phase 2 work breakdown (via /speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── app-gateway/
├── app-gateway-e2e/
├── ai-recruitment-frontend/
├── ai-recruitment-frontend-e2e/
├── jd-extractor-svc/
├── report-generator-svc/
├── resume-parser-svc/
└── scoring-engine-svc/

libs/
├── shared-dtos/
├── user-management-domain/
├── job-management-domain/
├── resume-processing-domain/
├── ai-services-shared/
└── infrastructure-shared/

e2e/                      # Playwright scenarios
tools/, scripts/          # Project tooling and automation
```

**Structure Decision**: Operate within existing Nx monorepo layout—updates target shared dependency configurations in `package.json`, affected app directories under `apps/`, and shared libraries in `libs/`, with CI workflows under `.github/` remaining in scope for gating changes.

## Complexity Tracking

No constitution violations identified; complexity tracking not required.
