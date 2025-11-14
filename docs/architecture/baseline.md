# Architecture Baseline – 2025-11-10

## Nx Project Inventory
| Project | Type | Root | Domain / Notes |
| --- | --- | --- | --- |
| ai-recruitment-frontend | application | apps/ai-recruitment-frontend | Angular UI for candidate & job workflows. |
| ai-recruitment-frontend-e2e | e2e suite | apps/ai-recruitment-frontend-e2e | Playwright UI regression pack. |
| app-gateway | application | apps/app-gateway | NestJS gateway/orchestrator. |
| app-gateway-e2e | e2e suite | apps/app-gateway-e2e | Back-end smoke and contract flows. |
| resume-parser-svc | application | apps/resume-parser-svc | Handles resume ingestion & parsing events. |
| scoring-engine-svc | application | apps/scoring-engine-svc | Candidate scoring APIs. |
| jd-extractor-svc | application | apps/jd-extractor-svc | Job description extraction via LLMs. |
| report-generator-svc | application | apps/report-generator-svc | Generates hiring reports / listens on NATS. |
| ai-recruitment-clerk | workspace | . | Root-level scripts/tests (aggregates Nx + Playwright commands). |
| candidate-scoring-domain | library | libs/candidate-scoring-domain | Domain logic for scoring. |
| report-generation-domain | library | libs/report-generation-domain | Domain for reporting artifacts. |
| resume-processing-domain | library | libs/resume-processing-domain | Resume processing aggregates. |
| incentive-system-domain | library | libs/incentive-system-domain | Incentive engine. |
| usage-management-domain | library | libs/usage-management-domain | Usage/limits. |
| user-management-domain | library | libs/user-management-domain | Accounts & orgs. |
| job-management-domain | library | libs/job-management-domain | Job postings/pipelines. |
| marketing-domain | library | libs/marketing-domain | Marketing automations. |
| ai-services-shared | library | libs/ai-services-shared | Common AI adapters. |
| shared-dtos | library | libs/shared-dtos | Cross-service DTOs/contracts. |
| api-contracts | library | libs/api-contracts | Contract validation utilities. |
| shared-nats-client | library | libs/shared-nats-client | NATS connection + stream config. |
| infrastructure-shared | library | libs/infrastructure-shared | Shared Nest infrastructure. |

## Configuration Source Inventory
### Environment & Secrets
- Root-level `.env`, `.env.development`, `.env.production.template`, `.env.security.template`, `.env.railway.template`, `.env.test`, `.env.local`, plus project-specific variants like `apps/app-gateway/test/.env.test` and `apps/resume-parser-svc/.env.test`.
- Scripts rely on duplicated exports (e.g., `validate-system.sh`, `start-system.sh`) instead of consuming typed config.

### Application & Library Config Modules
- Frontend keeps UI config variants in `apps/ai-recruitment-frontend/src/config/app.config.ts` and `i18n.config.ts` (no shared typings with backend).
- Gateway stores feature flags and cache defaults in `apps/app-gateway/src/config/feature-flags.config.ts` and `apps/app-gateway/src/cache/cache.config.ts`.
- Scoring engine and resume parser now import the shared configuration package for MongoDB + NATS (other backends still consume env vars directly).
- Messaging clients embed stream definitions inside `libs/shared-nats-client/src/config/stream-configs.ts` and duplicated DTO validation in `libs/shared-dtos/src/config/secure-config.validator.ts`.
- Additional ad-hoc settings exist under `config/quality-gates.json`, `monitoring/telemetry/opentelemetry-config.ts`, and service-specific Jest configs.
- Shared SSOT module (`libs/configuration`) now exposes typed env parsing with Nest integration; `app-gateway`, `resume-parser-svc`, `report-generator-svc`, and `scoring-engine-svc` consume it. Privacy compliance flows, guest UX, health checks, dual-run middleware, and resume GridFS helpers now rely on the module; remaining direct env reads are confined to legacy ops/security scaffolding tracked in the refactor plan.

**Observation:** each layer parses env vars independently; there is no SSOT package exporting sanitized configuration for services, tests, and scripts.

## Testing & Coverage Baseline
### Current Status by Project
| Project | Jest Status (`nx run <project>:test --coverage`) | Coverage Artifacts | Notes |
| --- | --- | --- | --- |
| ai-recruitment-frontend | ✅ Suites pass (selectors/effects/components). | HTML-only output under `coverage/apps/ai-recruitment-frontend/`; `coverage-summary.json` missing. | Need reporter producing JSON/text so Nx can enforce thresholds. |
| app-gateway | ✅ Suites pass (cache, auth, workflows). | Same gap—HTML only. | Tests are slow (~30–40s each) and run in series. |
| resume-parser-svc | ✅ Repository + parsing + mapper specs pass. | JSON/LCOV emitted (~46% statements after mapper unit tests). | SSOT config adopted; still need broader coverage (vision-llm, field-mapper service). |
| scoring-engine-svc | ✅ Controller/service specs pass. | No coverage files emitted. | Minimal assertions; only hello world tests exist. |
| jd-extractor-svc | ✅ 7 suites / 112 tests pass. | Only HTML artifacts; no JSON summary. | Good domain coverage but lacks metrics. |
| report-generator-svc | ✅ Integration + performance-monitor specs pass. | JSON + LCOV under `coverage/apps/report-generator-svc/`. | Coverage ~20% statements after new unit tests; controllers/services still largely untested. |
| shared-dtos | ✅ Domain service / incentive tests pass. | Coverage artifacts missing. | Heavy domain scenarios already exist. |
| api-contracts | ✅ Contract validator suites pass (libs/api-contracts/src/validation/contract.validator.test.ts). | Coverage missing. | Long runtime (~130s) due to integration tests. |
| ai-recruitment-clerk | Not run (workspace-level jest). | N/A | Should orchestrate aggregated coverage later. |
| candidate-scoring-domain | ⚠️ `No tests found` (libs/candidate-scoring-domain). | N/A | Entire bounded context lacks tests. |
| report-generation-domain | ⚠️ No tests. | N/A | Same gap. |
| resume-processing-domain | ⚠️ No tests. | N/A | Same gap. |
| incentive-system-domain | ⚠️ No tests. | N/A | Same gap. |
| usage-management-domain | ⚠️ No tests. | N/A | Same gap. |
| user-management-domain | ⚠️ No tests. | N/A | Same gap. |
| infrastructure-shared | ⚠️ No tests. | N/A | Shared infra untested. |
| job-management-domain | ⚠️ No tests. | N/A | Domain logic unverified. |
| marketing-domain | ⚠️ No tests. | N/A | Domain logic unverified. |
| ai-services-shared | ⚠️ No tests. | N/A | Adapter layer untested. |
| shared-nats-client | ⚠️ No tests. | N/A | Connection + stream rules untested. |

### Key Findings
- **Coverage reporting has been upgraded**: Jest now emits JSON/LCOV/text summaries (validated on `report-generator-svc`, currently ~10% statements), but most projects still have low or no coverage and require new suites before enforcing gates.
- **Majority of bounded-context libraries lack any tests**, meaning SOLID/DDDs contracts are undocumented and unguarded.
- **Backend test failure** in report-generator-svc blocks CI and indicates schema drift in `ScoreBreakdown`.
- **Long-running suites** (`api-contracts`, `app-gateway`) stretch past 1–2 minutes, so future refactors must parallelize or use targeted jest configs.

### Recommended Next Steps (aligns with Tasks 2–5)
1. Create `libs/configuration` package exporting validated env + feature config consumed everywhere.
2. Define Nx tags (`layer:domain|application|infrastructure|presentation`, `context:*`) and update `eslint.config.mjs` / `nx.json` boundaries.
3. Carve bounded contexts into `libs/<context>/{domain,application,infrastructure}` and move business logic out of apps.
4. Introduce base test harnesses per context; require ≥85% coverage once reporters fixed.
5. Stabilize `report-generator-svc` tests by fixing Mongoose schema typing and add integration tests for NATS workflows.
6. Document regression checklist (commands: `npm run lint`, `npm run test`, `npm run test:integration`, `npm run test:e2e`) once suites are reliable.
