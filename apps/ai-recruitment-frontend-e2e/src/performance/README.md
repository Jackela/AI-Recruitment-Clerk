# E2E Performance Testing

使用 Playwright 测量关键性能指标的测试套件。

## 文件结构

```
apps/ai-recruitment-frontend-e2e/
├── src/
│   ├── performance/              # 性能测试目录
│   │   ├── page-load.spec.ts     # 页面加载性能测试
│   │   ├── critical-path.spec.ts # 关键路径性能测试
│   │   ├── file-upload.spec.ts   # 文件上传性能测试
│   │   └── analysis.spec.ts      # 分析任务性能测试
│   └── utils/
│       └── performance.ts        # 性能测试工具函数
├── performance-budget.json       # 性能预算配置
└── performance-tests.json        # 性能测试脚本配置
```

## 测试用例概览

共 10+ 个性能测试用例：

### 1. 页面加载性能 (page-load.spec.ts) - 8个测试

- 首页在3秒内加载完成
- 首页资源大小符合预算
- 仪表盘在5秒内加载
- 仪表盘资源大小符合预算
- 登录页在3秒内加载
- 职位列表页在4秒内加载
- 候选人列表页在4秒内加载
- 性能预算合规性检查

### 2. 关键路径性能 (critical-path.spec.ts) - 6个测试

- 职位创建流程在10秒内完成
- 登录流程在5秒内完成
- 简历上传分析流程在70秒内完成
- 候选人搜索在3秒内返回结果
- 职位申请提交在8秒内完成
- 页面间导航性能

### 3. 文件上传性能 (file-upload.spec.ts) - 4个测试

- 10MB简历文件在30秒内上传完成
- 5MB简历文件在15秒内上传完成
- 多文件批量上传在60秒内完成
- 上传进度在2秒内显示

### 4. 分析任务性能 (analysis.spec.ts) - 5个测试

- 简历分析在60秒内完成
- 职位匹配分析在45秒内完成
- 批量简历分析在120秒内完成
- 技能提取在30秒内完成
- 分析报告生成在20秒内完成

## 性能预算

在 `performance-budget.json` 中配置：

```json
{
  "homepage": { "loadTime": 3000, "size": 500000 },
  "dashboard": { "loadTime": 5000, "size": 1000000 },
  "upload": { "duration": 30000 },
  "analysis": { "duration": 60000 },
  "jobCreation": { "duration": 10000 },
  "login": { "loadTime": 3000 },
  "jobsList": { "loadTime": 4000 },
  "candidateList": { "loadTime": 4000 }
}
```

## 运行测试

### 运行所有性能测试

```bash
npm run test:performance
```

### 运行特定测试套件

```bash
# 页面加载测试
npm run test:performance:page-load

# 关键路径测试
npm run test:performance:critical-path

# 文件上传测试
npm run test:performance:file-upload

# 分析任务测试
npm run test:performance:analysis
```

### 生成 HTML 报告

```bash
npm run test:performance:report
```

## 性能指标说明

### 导航时间指标

- **domContentLoaded**: DOM内容加载完成时间
- **loadComplete**: 页面完全加载时间
- **firstPaint**: 首次渲染时间
- **firstContentfulPaint**: 首次内容渲染时间

### 资源指标

- **resourceCount**: 资源文件数量
- **totalResourceSize**: 资源总大小（字节）

### 功能指标

- **duration**: 操作完成时间（毫秒）
- **uploadTime**: 文件上传时间
- **analysisTime**: 分析任务时间

## 工具函数

### `measurePageLoad(page)`

测量页面加载的核心指标

### `measurePerformanceMetrics(page)`

获取完整的性能指标，包括资源信息

### `getPageSizeMetrics(page)`

获取页面资源大小信息

### `checkPerformanceBudget(metrics, budget, pageSize)`

检查性能是否符合预算

### `logPerformanceResults(testName, metrics)`

记录性能测试结果到控制台

### `loadPerformanceBudget()`

加载性能预算配置

### `clearPerformanceEntries(page)`

清除之前的性能记录

### `measureTimeToInteractive(page)`

测量页面可交互时间

### `generateLargeFile(sizeInBytes)`

生成用于测试的大文件

## 警报机制

当测试失败时，会输出详细的违规信息：

```
❌ Performance Budget Violations:
   - Load time 3200ms exceeds budget 3000ms
   - Page size 520KB exceeds budget 500KB
```

## CI 集成

建议在 CI 流程中添加性能测试：

```yaml
- name: Run Performance Tests
  run: npm run test:performance
```

## 注意事项

1. 确保测试数据文件 `src/test-data/resumes/test-resume.pdf` 存在
2. 性能测试应在稳定的环境中运行
3. 建议多次运行取平均值
4. 网络条件会影响测试结果
