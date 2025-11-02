# Implementation Plan: CI/CD, Quality Gates, Migration & Gray Release for Resume×JD Pivot

**Branch**: `002-cicd-quality-migration` | **Date**: 2025-11-02 | **Spec**: specs/002-cicd-quality-migration/spec.md
**Input**: Feature specification from `specs/002-cicd-quality-migration/spec.md`

## Summary

将现有项目的 CI/CD 与质量门禁、迁移与灰度发布体系重构到可支撑“应届生 简历×JD 匹配并提供可直接修改建议”的新定位：
- 在 PR 和主干上强制执行构建、静态检查、测试与覆盖率阈值；
- 提供一键部署到预发布与自动冒烟；
- 在生产采用随机百分比为主的灰度放量与一键回滚；
- 建立双轨运行对比与仪表盘；
- 落实隐私最小化、审计可追溯。

## Technical Context

**Language/Version**: TypeScript (Node.js ≥ 20.18), Angular (frontend)
**Primary Dependencies**: Nx mono-repo、NestJS（后端应用）、Jest（单测）、Playwright（E2E）
**Storage**: 无新增强依赖存储；可选启用 PostgreSQL/SQLite 仅用于缓存/评测日志（默认关闭）
**Testing**: Jest（单元/集成）、Playwright（E2E）
**Target Platform**: Web 后端服务 + Web 前端（浏览器）
**Project Type**: Nx 多项目（apps/*, libs/*）
**Performance Goals**: P95 评分+建议 ≤ 2.5s（无外部 LLM）；灰度与回滚控制 < 5 分钟
**Constraints**: 不持久化 PII 原文；门禁阈值可配置；双环境（预发布、生产）
**Scale/Scope**: 两层环境、随机百分比灰度（1%→全量），100% 匿名化真实样本用于门禁与观测

NEEDS CLARIFICATION: 无（关键决策已在 spec 中确认）

## Constitution Check

Gates derived from repository guidelines and privacy constraints:
- Test-first and quality gates: lint、typecheck、unit tests、coverage thresholds、E2E smoke on pre-release must pass.
- Module boundaries: Nx enforce boundaries for apps/libs.
- No new persistent PII: logs/builds cannot contain resume/JD raw text or PII.
- No new long-term storage required by default.

Assessment: No violations identified. This plan adheres to gates. Re-check after Phase 1 design.

## Project Structure

### Documentation (this feature)

```text
specs/002-cicd-quality-migration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
```

### Source Code (repository root)

```text
apps/
├── app-gateway/                  # 现有网关，新增发布与灰度代理/审计端点（仅网关层）
├── match-svc/                    # 新服务（评分/建议），纳入 CI/CD 
└── resume-parser-svc/            # 解析服务，增强后纳入门禁

libs/
├── shared-dtos/                  # DTO + JSON Schema（版本化）
├── matching-domain/              # 打分/解释/规则/术语库
├── nlp-shared/                   # 文本清洗、分词、嵌入适配
└── resume-templates/             # 导出模板与文案

e2e/
└── match-flow.spec.ts            # 上传→评分→建议→导出 的冒烟与回归
```

**Structure Decision**: 继续采用 Nx 单仓；新增/改动模块均通过 Nx 受影响图驱动构建与测试。

## Complexity Tracking

（无额外复杂度豁免需求）

## Phase 0: Outline & Research

Unknowns: 无（核心决策在 spec 中已定：两层环境、随机百分比灰度、100% 匿名化真实样本）。

Dependencies (best practices tasks):
- Nx CI 缓存与受影响图在 PR 门禁中的最佳实践。
- Flaky 测试的隔离与重试策略（Jest、Playwright）。
- 灰度放量与回滚的操作手册与审计。
- 隐私最小化与日志脱敏（不含 PII 原文）。

Integrations (patterns tasks):
- 门禁与灰度指标的观测面板（延迟、错误率、曝光率、成功率）。
- 开关体系与放量策略的元数据模型与审计事件结构。

Outputs: specs/002-cicd-quality-migration/research.md（见文件）。

## Phase 1: Design & Contracts

Deliver:
- data-model.md：实体/字段/关系/验证规则/状态转换。
- contracts/：OpenAPI 合同（feature-flags、release、observability）。
- quickstart.md：本地与 CI 跑通、预发布部署、灰度演练与回滚指南。

Re-run Constitution Check after design: 预期无新增违反；若需持久化评测日志，将以可选项说明。

## Phase 2: Implementation Plan (high-level)

（实现细节与任务拆分将在 `/speckit.tasks` 阶段输出，不在本命令范围内。）

