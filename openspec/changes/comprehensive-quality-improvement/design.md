## Context

AI-Recruitment-Clerk 是一个经过快速迭代（vibe coding）的项目，积累了技术债务。主要问题：

1. **类型安全**: 381 处 `any` 类型分布在 124 个文件中
2. **测试覆盖**: resume-parser-svc、jd-extractor-svc 零测试，scoring-engine-svc 仅 6 个测试
3. **大文件**: 4 个控制器超过 900 行，多个组件超过 700 行
4. **Mock 实现**: report-generator-svc 使用模拟实现，无真实报告生成

项目架构清晰（Nx monorepo、微服务、ESM），CLAUDE.md 规则完善，但执行不够严格。

## Goals / Non-Goals

**Goals:**

- 消除核心业务逻辑中的 `any` 类型（保留测试文件中的 `expect.any()`）
- 所有微服务达到最低 60% 测试覆盖率
- Report Generator 支持真实的 PDF/JSON 报告生成
- 所有文件控制在 500 行以内
- CI 增加类型安全门禁

**Non-Goals:**

- 不修改现有 API 契约（保持向后兼容）
- 不重构整个架构
- 不添加新功能（只修复和改进）
- 不优化 CI 执行时间（保持现状）

## Decisions

### D1: 类型安全改进策略 - 渐进式替换

**决定**: 按优先级分三批处理 `any` 类型

**理由**:

- 一口气修复 381 处风险太高
- 渐进式可以逐步验证，降低回归风险

**批次划分**:
| 批次 | 范围 | 文件数 | 风险 |
|------|------|--------|------|
| P1 | 核心服务 (app-gateway, domain services) | ~40 | 高 |
| P2 | 共享库 (shared-dtos, libs/\*) | ~30 | 中 |
| P3 | 测试工具和边缘文件 | ~54 | 低 |

**替代方案**: 一次性全局替换 - 拒绝，风险过高

### D2: 测试覆盖策略 - 优先核心路径

**决定**: 为每个微服务创建基础测试框架，优先覆盖核心业务逻辑

**理由**:

- resume-parser-svc 完全没有测试，风险最高
- 测试框架建立后，后续添加测试更容易

**覆盖优先级**:

1. resume-parser-svc: 消息处理、Gemini API 集成
2. jd-extractor-svc: LLM 服务、技能提取
3. scoring-engine-svc: 评分算法、匹配逻辑
4. report-generator-svc: 报告生成、模板渲染

### D3: Report Generator 实现方案 - Puppeteer + Handlebars

**决定**: 使用 Puppeteer 生成 PDF，Handlebars 作为模板引擎

**理由**:

- Puppeteer 可以渲染复杂 HTML/CSS，输出高质量 PDF
- Handlebars 已在项目中使用，团队熟悉
- HTML → PDF 管道灵活，便于调试

**依赖**:

```
puppeteer (PDF 生成)
handlebars (已存在)
exceljs (Excel 生成)
```

**替代方案**:

- PDFKit: 纯 JS，但布局复杂度高 - 拒绝
- wkhtmltopdf: 需要系统依赖，Docker 镜像变大 - 拒绝

### D4: 大文件拆分策略 - 按职责拆分

**决定**: 控制器按资源拆分，组件按职责拆分，服务按功能拆分

**控制器拆分示例**:

```
usage-limit.controller.ts (1000行)
→ quotas.controller.ts (300行)
→ limits.controller.ts (350行)
→ history.controller.ts (250行)
```

**组件拆分模式**:

```
enhanced-dashboard.component.ts (858行)
→ stats-display.component.ts (200行)
→ metrics.component.ts (250行)
→ charts.component.ts (200行)
→ dashboard.service.ts (300行)
```

### D5: CI 类型安全门禁 - 警告先行

**决定**: 先在 CI 中添加 `any` 类型警告，逐步提升到错误

**理由**:

- 直接报错会阻塞所有 PR
- 渐进式可以给团队适应时间

**阶段**:

1. 阶段 1: 添加警告，不阻塞 CI
2. 阶段 2: 核心目录报错
3. 阶段 3: 全局报错

## Risks / Trade-offs

| 风险                           | 影响 | 缓解措施                         |
| ------------------------------ | ---- | -------------------------------- |
| 类型修改引入运行时错误         | 高   | 每批次修改后运行全量测试         |
| Puppeteer 增加 Docker 镜像大小 | 中   | 使用 puppeteer-core + 系统依赖   |
| 大文件拆分影响 Git 历史        | 低   | 使用 git mv 保留历史             |
| 测试编写耗时                   | 中   | 优先核心路径，使用现有 mock 模式 |

## Migration Plan

### 阶段 1: 基础设施 (1-2 天)

1. 添加 puppeteer、exceljs 依赖
2. 配置 ESLint `no-explicit-any` 规则（警告级别）
3. 创建测试基础设施模板

### 阶段 2: 类型安全 P1 (3-5 天)

1. 修复 app-gateway 核心服务的 `any` 类型
2. 修复 domain services 的 ValueObject.restore 方法
3. 为错误处理添加类型接口

### 阶段 3: 测试覆盖 (5-7 天)

1. resume-parser-svc 单元测试
2. jd-extractor-svc 单元测试
3. scoring-engine-svc 扩展测试
4. report-generator-svc 测试

### 阶段 4: Report Generator (3-4 天)

1. 实现 PDF 生成
2. 实现 Excel 生成
3. 替换 mock 实现

### 阶段 5: 代码重构 (3-5 天)

1. 拆分大型控制器
2. 拆分大型组件
3. 拆分大型服务

### 阶段 6: CI 优化 (1-2 天)

1. 提升 `no-explicit-any` 到错误级别
2. 添加文件大小检查
3. 更新 pre-push hook

## Confirmed Decisions

| 决策项         | 选择         | 理由                            |
| -------------- | ------------ | ------------------------------- |
| 测试覆盖率目标 | **80%+**     | 更严格的代码质量保证            |
| Puppeteer 版本 | **完整版**   | 开箱即用，Docker 镜像大小可接受 |
| pre-push hook  | **保持现状** | 质量优先，防止问题进入远程      |
