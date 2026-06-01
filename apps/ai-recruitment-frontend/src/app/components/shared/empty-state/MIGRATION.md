# EmptyStateComponent 迁移指南

## 已创建文件

1. **类型定义** - `src/app/components/shared/empty-state/empty-state.types.ts`
2. **组件** - `src/app/components/shared/empty-state/empty-state.component.ts`
3. **样式** - `src/app/components/shared/empty-state/empty-state.component.scss`
4. **导出** - `src/app/components/shared/empty-state/index.ts`
5. **翻译键** - 已更新 `zh-CN.json` 和 `en-US.json`

## 需要更新的现有空状态位置

### 1. DataTableComponent

**位置**: `src/app/components/shared/data-table/data-table.component.ts`
**当前**: 第 342-364 行使用内联空状态

```typescript
// 更新方案:
// 1. 导入 EmptyStateComponent
import { EmptyStateComponent } from '../empty-state';

// 2. 在 imports 中添加 EmptyStateComponent
imports: [CommonModule, TranslateModule, EmptyStateComponent, ...]

// 3. 在模板中替换空状态
```

```html
<!-- 替换原来的空状态 -->
<arc-empty-state
  *ngIf="paginatedData().length === 0 && !options.loading"
  icon="grid"
  [title]="options.emptyMessage || 'empty.default.title'"
  description="empty.default.description"
>
</arc-empty-state>
```

### 2. TimesheetTableComponent

**位置**: `src/app/components/shared/timesheet-table/timesheet-table.component.ts`
**当前**: 第 114-135 行使用内联空状态

```typescript
// 更新方案:
// 1. 导入 EmptyStateComponent
import { EmptyStateComponent } from '../empty-state';

// 2. 在 imports 中添加 EmptyStateComponent
```

```html
<!-- 替换原来的空状态 -->
<arc-empty-state
  *ngIf="paginatedData().length === 0 && !tableOptions().loading"
  icon="calendar"
  [title]="tableOptions().emptyMessage || 'empty.default.title'"
  description="empty.default.description"
>
</arc-empty-state>
```

### 3. JobsListComponent

**位置**: `src/app/pages/jobs/jobs-list/jobs-list.component.ts`
**当前**: 第 401-446 行使用内联空状态

```typescript
// 更新方案:
// 1. 导入 EmptyStateComponent
import { EmptyStateComponent } from '../../../components/shared/empty-state';

// 2. 在组件类中添加操作处理
import type { EmptyStateAction } from '../../../components/shared/empty-state';

export class JobsListComponent {
  // ...

  readonly emptyStateActions: EmptyStateAction[] = [
    {
      label: 'jobs.button.createNew',
      icon: 'plus',
      variant: 'primary',
      handler: () => this.router.navigate(['/jobs/create']),
    },
  ];
}
```

```html
<!-- 替换原来的空状态 -->
<arc-empty-state
  *ngIf="(jobs$ | async)?.length === 0"
  icon="briefcase"
  title="empty.jobs.title"
  description="empty.jobs.description"
  [actions]="emptyStateActions"
  data-testid="empty-state"
>
</arc-empty-state>
```

## 使用示例

### 基础用法

```html
<!-- 默认空状态 -->
<arc-empty-state
  icon="inbox"
  title="empty.default.title"
  description="empty.default.description"
>
</arc-empty-state>
```

### 搜索无结果

```html
<arc-empty-state
  type="search"
  icon="search"
  title="empty.search.title"
  description="empty.search.description"
  [actions]="[
    { label: 'common.clearSearch', icon: 'x', variant: 'outline', handler: clearSearch },
    { label: 'common.back', icon: 'arrow-left', variant: 'secondary', handler: goBack }
  ]"
  (actionClick)="handleActionClick($event)"
>
</arc-empty-state>
```

### 错误状态

```html
<arc-empty-state
  type="error"
  icon="alert-circle"
  title="empty.error.title"
  description="empty.error.description"
  [actions]="[
    { label: 'common.refresh', icon: 'refresh', variant: 'primary', handler: retry },
    { label: 'common.back', icon: 'arrow-left', variant: 'outline', handler: goBack }
  ]"
>
</arc-empty-state>
```

### 成功状态

```html
<arc-empty-state
  type="success"
  icon="check-circle"
  title="empty.success.title"
  description="empty.success.description"
>
</arc-empty-state>
```

### 自定义图片

```html
<arc-empty-state
  image="/assets/images/empty-jobs.svg"
  title="empty.jobs.title"
  description="empty.jobs.description"
  [actions]="[{ label: 'jobs.button.createNew', icon: 'plus', variant: 'primary', handler: createJob }]"
>
</arc-empty-state>
```

## 支持的图标

内置图标：

- `inbox` - 收件箱
- `search` - 搜索
- `alert-circle` / `error` - 错误/警告
- `briefcase` - 公文包
- `file-text` - 文件
- `grid` - 网格（默认）
- `calendar` - 日历
- `user` - 用户
- `check-circle` / `success` - 成功
- `folder` - 文件夹
- `database` - 数据库
- `trash` - 删除

## API 参考

### Inputs

| 属性          | 类型                                            | 默认值      | 描述                 |
| ------------- | ----------------------------------------------- | ----------- | -------------------- |
| `type`        | `'default' \| 'search' \| 'error' \| 'success'` | `'default'` | 空状态类型，影响样式 |
| `icon`        | `string`                                        | `'grid'`    | 图标名称             |
| `image`       | `string`                                        | `undefined` | 自定义图片 URL       |
| `title`       | `string`                                        | `undefined` | 标题翻译键           |
| `description` | `string`                                        | `undefined` | 描述翻译键           |
| `actions`     | `EmptyStateAction[]`                            | `undefined` | 操作按钮列表         |

### Outputs

| 事件          | 类型                             | 描述             |
| ------------- | -------------------------------- | ---------------- |
| `actionClick` | `EventEmitter<EmptyStateAction>` | 操作按钮点击事件 |

### EmptyStateAction 接口

```typescript
interface EmptyStateAction {
  label: string; // 按钮标签翻译键
  icon?: string; // 按钮图标
  variant?: 'primary' | 'secondary' | 'outline'; // 按钮样式
  handler?: () => void; // 点击处理函数
}
```

## 无障碍支持

- 使用 `role="status"` 和 `aria-live="polite"` 确保屏幕阅读器能朗读空状态信息
- 按钮有 `aria-label` 属性
- 图标使用 `aria-hidden="true"` 避免重复朗读
- 支持键盘导航
- 支持高对比度模式
- 支持减少动画偏好

## 下一步

1. 更新 `shared.module.ts` 以导出 EmptyStateComponent（如果需要）
2. 在需要的地方迁移现有空状态
3. 考虑创建 `arc-icon` 组件来统一图标管理
