# Tasks: CI/CD, Quality Gates, Migration & Gray Release for Resume×JD Pivot

Feature: specs/002-cicd-quality-migration/spec.md  
Branch: 002-cicd-quality-migration  
Plan: specs/002-cicd-quality-migration/plan.md

## Phase 1 — Setup

- [X] T001 Create CI workflow for PR/main at .github/workflows/ci.yml
- [X] T002 Add quality gates script (coverage/lint/typecheck/e2e smoke) at tools/ci/verify-quality-gates.mjs
- [X] T003 Configure Nx affected targets and cache in nx.json
- [X] T004 Document gates and approvals in docs/pivot/quality-gates.md
- [X] T035 Create central thresholds config at config/quality-gates.json (coverage %, lint fail-on-error, typecheck, e2e smoke)
- [X] T047 Add PII scan script at tools/ci/pii-scan.mjs (regex patterns for email/phone/ID with allowlist)

## Phase 2 — Foundational (blocking for all stories)

- [X] T005 Add audit event model scaffold at libs/shared-dtos/src/audit-event.dto.ts
- [X] T006 Add feature flag DTO/schema at libs/shared-dtos/src/feature-flag.dto.ts
- [X] T007 Add rollout config (percentage, kill switch) at apps/app-gateway/src/config/feature-flags.config.ts
- [X] T008 Add privacy redaction utility at libs/infrastructure-shared/src/privacy/redaction.util.ts
- [X] T036 Wire config/quality-gates.json into tools/ci/verify-quality-gates.mjs (fail CI if thresholds unmet)
- [X] T037 Require guarded review for thresholds at .github/CODEOWNERS (config/quality-gates.json owned by release owners)
- [X] T044 Create one-time conversion script to normalize resumes to ParsedResumeDto at tools/migration/convert-resume-format.mjs (idempotent, dry-run mode)
- [X] T045 Add migration rehearsal workflow at .github/workflows/migration-rehearsal.yml (run conversion on fixtures corpus; publish summary artifact)

## Phase 3 — US1: PR 质量门禁自动化 (P1)

Goal: PR 合并前自动执行构建/静态检查/单测/覆盖率/E2E 冒烟，未达标禁止合并。  
Independent test: 提交含质量问题的 PR 被拦截；修复后通过。

- [X] T009 [US1] Wire lint/typecheck/build/test:coverage jobs in .github/workflows/ci.yml
- [X] T010 [US1] Enforce coverage thresholds from jest.config.cjs in tools/ci/verify-quality-gates.mjs
- [X] T011 [P] [US1] Add e2e smoke job (upload→score→suggest→export) in .github/workflows/ci.yml
- [X] T012 [US1] Add status check docs and required checks list in docs/pivot/quality-gates.md
- [X] T048 [US1] Integrate PII scan job in .github/workflows/ci.yml (scan logs/artifacts; fail on hits; link remediation docs)

## Phase 4 — US2: 单击部署与灰度放量 (P1)

Goal: 一键部署至预发布，验证后以随机百分比灰度放量到生产，支持即时回滚/关闭开关。  
Independent test: 完成“预发布→5%→50%→全量”放量任一步骤可独立执行与撤销。

- [X] T013 [US2] Create pre-release deploy script at tools/deploy/pre-release.deploy.ps1
- [X] T014 [US2] Create production deploy/rollback scripts at tools/deploy/production.deploy.ps1
- [X] T015 [US2] Implement release endpoints per contracts at apps/app-gateway/src/ops/release.controller.ts
- [X] T016 [US2] Map release contracts at specs/002-cicd-quality-migration/contracts/release.yaml to routes in apps/app-gateway/src/ops/release.routes.ts (after T015)
- [X] T017 [US2] Add rollout controller to set percentage at apps/app-gateway/src/ops/gray.controller.ts
- [X] T018 [US2] Add rollback handler and record rollback point at apps/app-gateway/src/ops/rollback.service.ts
- [X] T034 [US2] Add post-deploy smoke to CD at .github/workflows/cd.yml (trigger Playwright smoke immediately after pre-release deploy)

## Phase 5 — US3: 功能开关与目标人群控制 (P2)

Goal: 提供特性开关，默认随机百分比放量；白名单/标签为辅。可查询状态与影响范围。  
Independent test: 设置 10% 放量仅 Beta 用户可见；改为 100% 全体可见。

- [X] T019 [US3] Implement feature flags API per contracts at apps/app-gateway/src/ops/flags.controller.ts
- [X] T020 [P] [US3] In-memory flag store with audit hooks at apps/app-gateway/src/ops/flags.store.ts
- [X] T021 [US3] Request gating middleware (percentage sampling) at apps/app-gateway/src/middleware/rollout.middleware.ts
- [X] T022 [US3] Optional cohorts (whitelist/label) support at apps/app-gateway/src/middleware/cohort.middleware.ts

## Phase 6 — US4: 迁移期间双轨运行与数据一致性 (P2)

Goal: 并行运行旧/新路径，对比分数、建议条数与延迟，达阈值后切换。  
Independent test: 同一批样本在两路径输出差异低于阈值并可视化对比。

- [X] T023 [US4] Introduce dual-run switch FF_DUAL_RUN at apps/app-gateway/src/config/feature-flags.config.ts
- [X] T024 [US4] Implement dual invocation and capture outputs at apps/app-gateway/src/middleware/dual-run.middleware.ts
- [X] T025 [P] [US4] Write comparison logs (no PII) to tools/logs/migration/ with summary script tools/migration/compare-summary.mjs
- [X] T026 [US4] Add switch-over command doc and criteria at docs/pivot/migration-cutover.md
- [X] T041 [US4] Compute consistency metrics (Pearson corr, NDCG@10) from dual-run logs at tools/migration/consistency-metrics.mjs and output reports to tools/logs/migration/reports/
- [X] T046 [US4] Capture rehearsal results and criteria in docs/pivot/migration-cutover.md (pass/fail gates tied to thresholds)

## Phase 7 — US5: 可审计与隐私最小化 (P3)

Goal: 审计发布/放量/回滚/阈值调整；日志与构建不含 PII 原文，仅脱敏片段与指标。  
Independent test: 抽检日志无 PII；审计台账可追溯所有关键操作。

- [X] T027 [US5] Add audit middleware to record actor/action/target at apps/app-gateway/src/middleware/audit.middleware.ts
- [X] T028 [P] [US5] Implement redaction pipeline for logs at libs/infrastructure-shared/src/privacy/redaction.util.ts
- [X] T029 [US5] Add audit export endpoint per policy at apps/app-gateway/src/ops/audit.controller.ts
- [X] T030 [US5] Update docs with audit and privacy policy at docs/pivot/privacy-audit.md

## Final Phase — Polish & Cross-cutting

- [X] T031 Update quickstart with deploy/gray/rollback steps at specs/002-cicd-quality-migration/quickstart.md
- [X] T032 Add runbook for incidents and kill switch at docs/pivot/runbook.md
- [X] T033 Refine observability contracts and link dashboards at specs/002-cicd-quality-migration/contracts/observability.yaml
- [X] T038 Implement observability collector endpoint at apps/app-gateway/src/ops/observability.controller.ts (expose funnels per contracts)
- [X] T039 Add metrics service for exposure/success/error/cancel at apps/app-gateway/src/ops/metrics.service.ts
- [X] T040 Document dashboards and metric definitions at docs/pivot/observability.md (windows: 1h/24h/7d; roles: dev, product)
- [X] T042 Add user impact endpoint at apps/app-gateway/src/ops/impact.controller.ts (exposure/success/error/cancel by cohort/percentage)
- [X] T043 Document impact endpoint usage and sample queries at docs/pivot/impact-panel.md

## Dependencies (Story Order)

1) US1 → 2) US2 → 3) US3 → 4) US4 → 5) US5

## Parallel Execution Examples

- [P] T011 (E2E smoke job) can run in parallel with T009/T010 once workflow scaffold exists.
- [P] T020 (flag store) parallel to T019 controller.
- [P] T025 (compare summary) parallel to T024 middleware.
- [P] T028 (redaction) parallel to T027 audit middleware.

## Implementation Strategy

- Deliver P1 stories first (US1, US2) to enable safe releases.  
- Then enable control (US3) and migration validation (US4).  
- Finally complete audit/privacy hardening (US5) and polish.

***

Validation: All tasks follow checklist format with TaskID, optional [P], required [US?] for story phases, and explicit file paths.

