# 视觉回归测试

本项目使用 Playwright 的视觉对比功能来检测 UI 变更。

## 测试统计

总计 **15 个视觉测试用例**：

### 1. Homepage Visual (4 tests) - `homepage.spec.ts`

- homepage matches snapshot
- homepage header matches snapshot
- homepage hero section matches snapshot
- homepage footer matches snapshot

### 2. Component Visual (4 tests) - `components.spec.ts`

- job table matches snapshot
- resume upload area matches snapshot
- dashboard sidebar matches snapshot
- search input matches snapshot

### 3. Theme Visual (3 tests) - `themes.spec.ts`

- dark theme homepage matches snapshot
- dark theme dashboard matches snapshot
- light theme dashboard matches snapshot

### 4. Responsive Visual (4 tests) - `responsive.spec.ts`

- mobile viewport homepage matches snapshot
- tablet viewport homepage matches snapshot
- mobile viewport jobs page matches snapshot
- desktop viewport dashboard matches snapshot

### 5. Critical Pages Visual (4 tests) - `pages.spec.ts`

- jobs page matches snapshot
- dashboard page matches snapshot
- resume page matches snapshot
- analysis page matches snapshot

## 配置

视觉测试配置位于 `playwright.config.ts`：

```typescript
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,
    threshold: 0.2,
  },
}
```

## 运行测试

### 运行所有视觉测试

```bash
npm run test:e2e:visual
```

### 更新基线截图

```bash
npm run test:e2e:visual:update
```

### CI 模式运行

```bash
npm run test:e2e:visual:ci
```

## 文件结构

```
apps/ai-recruitment-frontend-e2e/src/visual/
├── homepage.spec.ts      # 首页视觉测试
├── components.spec.ts    # 组件级视觉测试
├── themes.spec.ts        # 主题切换视觉测试
├── responsive.spec.ts    # 响应式断点视觉测试
├── pages.spec.ts         # 关键页面视觉测试
└── **/*.png              # 基线截图 (自动生成的)
```

## CI 集成

视觉回归测试已集成到 CI 工作流：

1. **e2e-nightly.yml** - 每日夜间运行完整的 E2E + 视觉回归测试
2. **visual-regression.yml** - 在以下情况自动触发：
   - 推送到 main/develop 分支
   - PR 涉及前端或 E2E 代码变更
   - 手动触发（支持更新基线截图）

### 手动更新基线截图

在 GitHub Actions 页面手动触发 workflow，选择 `update-snapshots: true`。

## 调试失败的视觉测试

当视觉测试失败时，CI 会上传以下文件：

- **-expected.png** - 期望的基线截图
- **-actual.png** - 实际的当前截图
- **-diff.png** - 差异对比图

下载 artifacts 对比这些文件以了解变更内容。

## 最佳实践

1. **不要随意更新基线** - 只在确认 UI 变更是预期行为时更新
2. **关注 diff 文件** - 差异文件会高亮显示具体变更区域
3. **使用 `maxDiffPixels`** - 允许少量像素差异（如动画、字体渲染差异）
4. **测试隔离** - 每个测试独立运行，避免相互影响
5. **页面加载状态** - 使用 `waitForLoadState('networkidle')` 确保页面完全加载

## 依赖

- `@playwright/test` - Playwright 测试框架
- `pixelmatch` - 像素级图像对比

已添加到 `package.json` devDependencies。
