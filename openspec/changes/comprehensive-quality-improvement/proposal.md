## Why

项目经过 vibe coding 快速迭代后，积累了技术债务和质量问题：278个文件使用 `any` 类型违反 CLAUDE.md 规则、resume-parser-svc 零测试覆盖、Report Generator 使用 mock 实现、111 个 TODO 注释待处理。这些问题会随时间腐化，降低 AI 代理的开发效率和代码可维护性。

现在修复这些问题可以确保项目的长期健康，提升 AI 友好度，并为后续功能开发打下坚实基础。

## What Changes

### 类型安全改进

- 消除 278 个文件中的 `any` 类型，替换为明确的接口和类型定义
- 在 CI 中增加 `@typescript-eslint/no-explicit-any` 错误级别的检查

### 测试覆盖增强

- 为 `resume-parser-svc` 添加完整的单元测试
- 为 `jd-extractor-svc` 添加单元测试
- 为 `scoring-engine-svc` 扩展测试覆盖（当前仅 6 个测试）
- 为 `report-generator-svc` 添加单元测试

### Report Generator 真实实现

- 替换 mock 实现为真实的报告生成逻辑
- 支持 PDF 和 JSON 格式的报告输出
- 集成模板引擎生成专业报告

### 代码重构

- 拆分超过 500 行的大文件（usage-limit.controller.ts: 1000行等）
- 清理关键 TODO 注释
- 统一代码风格和模式

### CI 优化

- 平衡 pre-push hook 的严格性和开发体验
- 添加 `any` 类型检测到 CI 流程
- 优化 CI 执行时间

## Capabilities

### New Capabilities

- `type-safety-enforcement`: 强制类型安全检查，消除 `any` 类型，CI 中增加类型检查门禁
- `microservice-test-coverage`: 微服务测试覆盖标准，确保所有微服务达到最低测试覆盖率
- `report-generator-real`: 真实报告生成功能，支持 PDF/JSON 格式输出
- `code-quality-gates`: 代码质量门禁，包括文件大小限制、TODO 清理等

### Modified Capabilities

无现有 spec 需要修改。

## Impact

### 受影响的代码

- `apps/app-gateway/src/domains/` - 多个大型控制器需要拆分
- `apps/resume-parser-svc/` - 需要添加测试
- `apps/jd-extractor-svc/` - 需要添加测试
- `apps/scoring-engine-svc/` - 需要扩展测试
- `apps/report-generator-svc/` - 需要真实实现和测试
- `libs/*/` - 需要类型定义改进

### 受影响的配置

- `.github/workflows/ci.yml` - 添加类型检查
- `eslint.config.mjs` - 提升 `no-explicit-any` 到错误级别
- `.husky/pre-push` - 可能需要调整

### 依赖

- 可能需要添加 PDF 生成库（如 `puppeteer` 或 `pdfmake`）
- 可能需要添加模板引擎（如 `handlebars` 或 `ejs`）

### 风险

- 大规模类型修改可能引入运行时错误，需要充分的测试覆盖
- CI 更严格可能影响开发体验，需要平衡
