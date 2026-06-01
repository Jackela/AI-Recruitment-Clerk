# E2E Performance Testing

使用 Playwright 测量关键性能指标的完整测试套件。

## 文件结构

```
apps/ai-recruitment-frontend-e2e/
├── src/
│   ├── performance/                    # 性能测试目录
│   │   ├── page-load.spec.ts           # 页面加载性能测试
│   │   ├── critical-path.spec.ts       # 关键路径性能测试
│   │   ├── file-upload.spec.ts         # 文件上传性能测试
│   │   ├── analysis.spec.ts            # 分析任务性能测试
│   │   ├── performance-full.spec.ts    # 完整性能测试 (Core Web Vitals)
│   │   ├── performance-memory.spec.ts  # 内存性能测试
│   │   ├── performance-network.spec.ts # 网络性能测试
│   │   ├── performance-interactions.spec.ts # 交互性能测试
│   │   └── performance-budget.json     # 性能预算配置
│   └── utils/
│       └── performance.ts              # 性能测试工具函数
├── performance-budget.json             # 性能预算配置
└── performance-tests.json              # 性能测试脚本配置
```

## 测试用例概览

共 35+ 个性能测试用例：

### 1. 完整性能测试 (performance-full.spec.ts) - 6个测试

- **首页性能 - Core Web Vitals**: LCP < 2.5s, FCP < 1.8s, CLS < 0.1, TTFB < 600ms
- **仪表板性能**: 数据加载和渲染性能测试
- **岗位列表性能**: 大数据列表渲染性能
- **文件上传性能**: 上传速度和进度监测
- **分析功能性能**: AI分析处理性能 (duration < 70s)
- **关键路径性能**: 端到端用户流程性能测试
- **页面大小预算**: 各页面资源大小控制验证

### 2. 内存性能测试 (performance-memory.spec.ts) - 7个测试

- **内存使用基准测试**: 初始内存使用监测
- **仪表板内存使用**: 仪表板页面内存占用检查
- **内存泄漏检测 - 重复导航**: 多次导航后内存增长测试
- **内存泄漏检测 - 表单操作**: 表单填写/清空内存测试
- **内存泄漏检测 - 模态框开关**: 模态框创建/销毁测试
- **垃圾回收验证**: 垃圾回收有效性测试
- **长时间运行内存稳定性**: 长时间使用内存趋势测试
- **大型数据列表内存性能**: 大量数据加载内存测试

### 3. 网络性能测试 (performance-network.spec.ts) - 9个测试

- **网络请求基础性能**: 总请求数和大小控制
- **首页资源加载优化**: 资源类型分析和加载顺序
- **API请求响应时间**: API端点响应时间监测
- **CDN缓存验证**: 缓存命中率测试
- **资源加载顺序优化**: CSS/JS加载顺序验证
- **图片优化验证**: 图片格式和大小优化检查
- **预加载和预连接优化**: Preload/Preconnect标签检查
- **慢网络条件下的性能**: Slow 3G网络性能测试
- **请求失败率监测**: API请求成功率统计

### 4. 交互性能测试 (performance-interactions.spec.ts) - 10个测试

- **点击响应时间 - 导航菜单**: 导航链接点击响应 < 100ms
- **点击响应时间 - 按钮交互**: 按钮点击响应 < 150ms
- **输入延迟 - 表单字段**: 表单输入流畅度测试
- **输入延迟 - 搜索框实时响应**: 搜索建议实时响应
- **悬停响应时间**: 悬停交互响应 < 50ms
- **动画帧率 - 页面滚动**: 滚动动画 FPS > 30
- **动画帧率 - 模态框**: 模态框动画 FPS > 30
- **列表滚动性能**: 虚拟列表滚动性能
- **复杂交互序列性能**: 多步骤交互总时长 < 2s
- **首屏交互准备时间 (TTI)**: 可交互时间 < 5s
- **键盘导航性能**: Tab导航响应时间 < 50ms

### 5. 页面加载性能 (page-load.spec.ts) - 8个测试

- 首页在3秒内加载完成
- 首页资源大小符合预算
- 仪表盘在5秒内加载
- 仪表盘资源大小符合预算
- 登录页在3秒内加载
- 职位列表页在4秒内加载
- 候选人列表页在4秒内加载
- 性能预算合规性检查

### 6. 关键路径性能 (critical-path.spec.ts) - 6个测试

- 职位创建流程在10秒内完成
- 登录流程在5秒内完成
- 简历上传分析流程在70秒内完成
- 候选人搜索在3秒内返回结果
- 职位申请提交在8秒内完成
- 页面间导航性能

### 7. 文件上传性能 (file-upload.spec.ts) - 4个测试

- 10MB简历文件在30秒内上传完成
- 5MB简历文件在15秒内上传完成
- 多文件批量上传在60秒内完成
- 上传进度在2秒内显示

### 8. 分析任务性能 (analysis.spec.ts) - 5个测试

- 简历分析在60秒内完成
- 职位匹配分析在45秒内完成
- 批量简历分析在120秒内完成
- 技能提取在30秒内完成
- 分析报告生成在20秒内完成

## 性能预算

在 `performance-budget.json` 和 `src/utils/performance.ts` 中配置：

### Core Web Vitals 预算

| 页面     | LCP (ms) | FCP (ms) | CLS  | TTFB (ms) | Size (KB) |
| -------- | -------- | -------- | ---- | --------- | --------- |
| 首页     | 2500     | 1800     | 0.1  | 600       | 500       |
| 仪表板   | 3000     | 2000     | 0.1  | 800       | 1000      |
| 岗位列表 | 2500     | 1500     | 0.1  | 600       | 800       |
| 分析页面 | 5000     | 3000     | 0.15 | 1000      | -         |

### 功能性能预算

```json
{
  "upload": { "duration": 30000, "speed": 1048576 },
  "analysis": { "duration": 70000 },
  "memory": {
    "maxHeapSize": 200000000,
    "leakThreshold": 1048576,
    "usageRatio": 0.8
  },
  "interactions": {
    "clickResponse": 100,
    "inputDelay": 50,
    "hoverResponse": 50,
    "animationFps": 30
  },
  "network": {
    "maxRequests": 100,
    "failureRate": 0.05,
    "apiTimeout": 2000,
    "cacheRate": 0.5
  }
}
```

### 性能预算说明

- **LCP** (Largest Contentful Paint): 最大内容绘制时间，目标 < 2.5s
- **FCP** (First Contentful Paint): 首次内容绘制时间，目标 < 1.8s
- **CLS** (Cumulative Layout Shift): 累积布局偏移，目标 < 0.1
- **TTFB** (Time to First Byte): 首字节时间，目标 < 600ms
- **内存泄漏阈值**: 1MB/次迭代
- **动画帧率**: 最低 30 FPS

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

### `measurePerformance(page, url)`

测量 Core Web Vitals (LCP, FCP, CLS, TTFB)

### `checkPerformanceBudget(metrics, budget)`

检查 Core Web Vitals 是否符合预算

### `measureMemoryUsage(page)`

测量 JavaScript 堆内存使用情况

### `detectMemoryLeak(page, action, iterations)`

检测内存泄漏，执行动作并监测内存增长

### `measureNetworkRequests(page)`

测量网络请求详情，包括请求数、大小、类型分布

### `measureInteractionLatency(page, selector, action)`

测量交互响应延迟 (click/hover/focus)

### `measureInputDelay(page, selector, text)`

测量输入延迟和输入速度

### `measureFrameRate(page, duration)`

测量动画帧率 (FPS)

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
