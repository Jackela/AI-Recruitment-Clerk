# 前端离线降级模式实现

## 概述

本次实现为 AI 招聘系统前端添加了离线降级模式，当后端 API 不可用时，前端能够自动切换到模拟数据模式，保证用户可以正常浏览和查看界面。

## 功能特性

### 1. 连接检测

- **ConnectionService**: 检测后端连接状态
  - `checkBackendConnection()`: 发送健康检查请求
  - `retryConnection()`: 重试连接
  - 使用信号(Signal)管理状态，支持响应式更新

### 2. 模拟数据

- **MOCK_JOBS**: 8条示例岗位数据
  - 包含不同状态（活跃、草稿、关闭、处理中）
  - 中文职位标题（高级软件工程师、产品经理等）
  - 完整的数据结构（id、title、status、createdAt、resumeCount等）

### 3. 状态管理扩展

- **JobActions** 新增：
  - `setOfflineMode`: 设置离线模式状态
  - `loadJobsFromCache`: 从缓存/模拟数据加载
  - `connectionStatusChanged`: 连接状态变化
  - `retryConnection`: 重试连接

- **JobState** 新增：
  - `isOffline`: 是否离线模式
  - `connectionMessage`: 连接状态消息

- **JobEffects** 修改：
  - `loadJobs$`: 先检测连接，再决定使用 API 或模拟数据
  - `retryConnection$`: 支持手动重试连接

- **JobSelectors** 新增：
  - `selectIsOffline`: 选择离线状态
  - `selectConnectionMessage`: 选择连接消息
  - `selectOfflineStatus`: 组合离线状态信息

### 4. UI 界面

- **离线模式提示条**:
  - 黄色警告样式
  - 显示"离线模式"和状态消息
  - 提供"重试连接"按钮
- **JobsListComponent**:
  - 显示离线模式指示器
  - 重试按钮支持手动刷新连接
  - 不显示长时间 loading spinner

## 文件变更

### 新增文件

```
apps/ai-recruitment-frontend/src/app/core/services/connection.service.ts
apps/ai-recruitment-frontend/src/app/core/services/connection.service.spec.ts
apps/ai-recruitment-frontend/src/app/core/mocks/job.mock.ts
```

### 修改文件

```
apps/ai-recruitment-frontend/src/app/store/jobs/job.actions.ts
apps/ai-recruitment-frontend/src/app/store/jobs/job.reducer.ts
apps/ai-recruitment-frontend/src/app/store/jobs/job.state.ts
apps/ai-recruitment-frontend/src/app/store/jobs/job.effects.ts
apps/ai-recruitment-frontend/src/app/store/jobs/job.selectors.ts
apps/ai-recruitment-frontend/src/app/pages/jobs/jobs-list/jobs-list.component.ts
apps/ai-recruitment-frontend/src/app/pages/jobs/jobs-list/jobs-list.component.html
apps/ai-recruitment-frontend/src/app/pages/jobs/jobs-list/jobs-list.component.scss
```

## 工作原理

1. **页面加载时**:
   - 触发 `loadJobs()` action
   - JobEffects 首先检查后端连接 (`checkBackendConnection()`)
   - 如果连接失败，自动切换到模拟数据模式

2. **离线模式**:
   - 显示黄色警告条提示用户
   - 展示 8 条模拟岗位数据
   - 数据加载有 500ms 延迟，模拟真实体验

3. **重试连接**:
   - 用户可以点击"重试连接"按钮
   - 重新检测后端连接
   - 成功后自动切换到真实数据

4. **数据流**:
   ```
   User Action -> Action Dispatch -> Effect
   -> Check Connection -> API or Mock Data
   -> Action Success -> Reducer -> State Update
   -> Selector -> Component -> UI Update
   ```

## 测试验证

运行测试：

```bash
npm run test -- connection.service
```

测试用例包括：

- ConnectionService 创建测试
- 离线模式数据获取测试
- Mock 数据完整性测试
- 中文标题验证

## 后续优化建议

1. **本地缓存**: 使用 LocalStorage 存储最后成功获取的数据
2. **更多页面**: 为其他页面（简历、报告）添加离线支持
3. **操作队列**: 离线时缓存用户操作，联网后自动同步
4. **优雅降级**: 显示部分功能不可用提示
5. **后台同步**: 定期检查连接并自动同步数据

## 使用说明

无需任何配置，系统会自动检测后端状态并切换模式：

- **后端正常**: 显示真实数据
- **后端离线**: 自动显示模拟数据并提示用户
- **手动刷新**: 点击"重试连接"按钮测试连接

## 技术栈

- Angular 17+ (Standalone Components)
- NgRx (State Management)
- RxJS (Reactive Programming)
- TypeScript 5+
