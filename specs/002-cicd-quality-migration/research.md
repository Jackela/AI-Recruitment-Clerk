# Research: CI/CD, Quality Gates, Migration & Gray Release

**Feature**: specs/002-cicd-quality-migration/spec.md  
**Date**: 2025-11-02  
**Branch**: 002-cicd-quality-migration

## Decisions and Rationale

### 1) 环境层级与隔离
- Decision: 两层环境（预发布、生产），各自独立审批与回滚点。
- Rationale: 满足当前规模下的发布与验证需求，流程更简洁；减少维护成本。
- Alternatives considered: 三层（开发/预发布/生产）— 增加流程成本且与现有实践不符；跨账号/物理隔离—当前无强合规需求。

### 2) 灰度目标人群策略
- Decision: 随机百分比为主，1% 起步逐步放量；白名单/标签作为辅助通道。
- Rationale: 最通用与简单的风险控制方式，支持 A/B 与快速放量；白名单仅用于专项验证。
- Alternatives: 仅白名单—覆盖窄，代表性不足；仅标签—策略复杂度提升。

### 3) 样本数据来源
- Decision: 100% 匿名化真实样本，严格脱敏与授权。
- Rationale: 确保指标代表性与真实用户场景贴合；合规可控。
- Alternatives: 合成样本—代表性不足；混合样本—治理复杂度提高，当前不需。

### 4) Nx 与 CI 缓存策略
- Decision: 使用 Nx affected graph 与远程/本地缓存；PR 仅跑受影响项目，主干全量关键集。
- Rationale: 显著降低 CI 开销并保持质量覆盖。
- Alternatives: 全量构建—成本高；手工挑选—易漏测。

### 5) Flaky 测试治理
- Decision: 标记可疑测试为“flaky”并隔离到冒烟外；提供重试 1–2 次与失败样本保留；定期压测归档。
- Rationale: 降低偶发失败对发布节奏的影响，保留证据便于修复。
- Alternatives: 禁用测试—风险过高；无限重试—掩盖问题。

### 6) 回滚与 Kill Switch
- Decision: 每次生产发布生成回滚点；关键特性配备 Kill Switch（总闸）；回滚过程与开关操作纳入审计。
- Rationale: 降低事故处置时间，统一审计与可追溯。
- Alternatives: 仅依赖回滚—覆盖不全；仅依赖开关—无法解决配置/环境回退。

### 7) 隐私最小化与日志
- Decision: 构建与运行日志不存原始简历/JD 文本与 PII；仅存脱敏片段与指标；提供抽检流程。
- Rationale: 符合隐私与合规要求，降低泄露风险。
- Alternatives: 允许明文—不可接受。

## Tasks (Derived)

- Research Nx CI 缓存与受影响图最佳实践 → 已确定采用，需在 CI 任务中配置。
- 定义灰度控制台/脚本的操作流程与审计字段。
- 设计“flaky 测试”标记与重试策略（Jest、Playwright）。
- 定义日志脱敏规则与抽检清单。
- 输出回滚手册与演练脚本。

## Status

All NEEDS CLARIFICATION resolved in spec and reflected here. Proceed to Phase 1 design.

