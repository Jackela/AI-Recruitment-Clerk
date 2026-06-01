# EmptyStateComponent 使用示例

## 基本用法

### 1. 默认空状态

```typescript
import { Component } from '@angular/core';
import { EmptyStateComponent } from '@app/components/shared/empty-state';

@Component({
  selector: 'app-example',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <arc-empty-state
      icon="inbox"
      title="empty.default.title"
      description="empty.default.description"
    >
    </arc-empty-state>
  `,
})
export class ExampleComponent {}
```

### 2. 搜索无结果

```typescript
import { Component } from '@angular/core';
import type { EmptyStateAction } from '@app/components/shared/empty-state';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <arc-empty-state
      type="search"
      icon="search"
      title="empty.search.title"
      description="empty.search.description"
      [actions]="searchActions"
      (actionClick)="handleAction($event)"
    >
    </arc-empty-state>
  `,
})
export class SearchComponent {
  searchActions: EmptyStateAction[] = [
    {
      label: 'common.clearSearch',
      icon: 'x',
      variant: 'outline',
      handler: () => this.clearSearch(),
    },
    {
      label: 'common.back',
      icon: 'arrow-left',
      variant: 'secondary',
      handler: () => this.goBack(),
    },
  ];

  clearSearch(): void {
    // 清除搜索逻辑
  }

  goBack(): void {
    // 返回逻辑
  }

  handleAction(action: EmptyStateAction): void {
    console.log('Action clicked:', action.label);
  }
}
```

### 3. 职位列表空状态

```typescript
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import type { EmptyStateAction } from '@app/components/shared/empty-state';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <arc-empty-state
      icon="briefcase"
      title="empty.jobs.title"
      description="empty.jobs.description"
      [actions]="jobActions"
    >
    </arc-empty-state>
  `,
})
export class JobsListComponent {
  constructor(private router: Router) {}

  jobActions: EmptyStateAction[] = [
    {
      label: 'jobs.button.createNew',
      icon: 'plus',
      variant: 'primary',
      handler: () => this.createJob(),
    },
  ];

  createJob(): void {
    this.router.navigate(['/jobs/create']);
  }
}
```

### 4. 错误状态

```typescript
import { Component } from '@angular/core';
import type { EmptyStateAction } from '@app/components/shared/empty-state';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <arc-empty-state
      type="error"
      icon="alert-circle"
      title="empty.error.title"
      description="empty.error.description"
      [actions]="errorActions"
    >
    </arc-empty-state>
  `,
})
export class ErrorComponent {
  errorActions: EmptyStateAction[] = [
    {
      label: 'common.refresh',
      icon: 'refresh',
      variant: 'primary',
      handler: () => this.retry(),
    },
    {
      label: 'common.back',
      icon: 'arrow-left',
      variant: 'outline',
      handler: () => this.goBack(),
    },
  ];

  retry(): void {
    // 重试加载
  }

  goBack(): void {
    // 返回上一页
  }
}
```

### 5. 自定义图片

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-custom',
  standalone: true,
  imports: [EmptyStateComponent],
  template: `
    <arc-empty-state
      image="/assets/images/empty-jobs.svg"
      title="empty.jobs.title"
      description="empty.jobs.description"
      [actions]="[
        {
          label: 'jobs.button.createNew',
          icon: 'plus',
          variant: 'primary',
          handler: createJob,
        },
      ]"
    >
    </arc-empty-state>
  `,
})
export class CustomComponent {
  createJob(): void {
    // 创建职位
  }
}
```

## 在 NgModule 中使用

如果你的组件是在 NgModule 中声明的：

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmptyStateComponent } from './components/shared/empty-state';
import { JobsListComponent } from './pages/jobs/jobs-list/jobs-list.component';

@NgModule({
  declarations: [JobsListComponent],
  imports: [
    CommonModule,
    EmptyStateComponent, // 导入 standalone 组件
  ],
})
export class JobsModule {}
```

## 迁移现有组件

### 数据表空状态迁移

**Before:**

```html
<div
  class="empty-state"
  *ngIf="paginatedData().length === 0 && !options.loading"
>
  <svg width="64" height="64" viewBox="0 0 24 24" ...></svg>
  <p>{{ options.emptyMessage || ('table.noData' | translate) }}</p>
</div>
```

**After:**

```html
<arc-empty-state
  *ngIf="paginatedData().length === 0 && !options.loading"
  icon="grid"
  [title]="options.emptyMessage || 'empty.default.title'"
  description="empty.default.description"
>
</arc-empty-state>
```

### 工时表空状态迁移

**Before:**

```html
<div
  class="empty-state"
  *ngIf="paginatedData().length === 0 && !tableOptions().loading"
>
  <svg width="64" height="64" viewBox="0 0 24 24" ...></svg>
  <p>
    {{ tableOptions().emptyMessage || ('timesheet.noRecords' | translate) }}
  </p>
</div>
```

**After:**

```html
<arc-empty-state
  *ngIf="paginatedData().length === 0 && !tableOptions().loading"
  icon="calendar"
  [title]="tableOptions().emptyMessage || 'empty.default.title'"
  description="empty.default.description"
>
</arc-empty-state>
```

### 职位列表空状态迁移

**Before:**

```html
<div *ngIf="(jobs$ | async)?.length === 0" class="empty-state" data-testid="empty-state">
  <div class="empty-illustration">
    <svg width="120" height="120"...></svg>
  </div>
  <h3 class="empty-title">{{ 'jobs.0091' | translate }}</h3>
  <p class="empty-description" [innerHTML]="'jobs.emptyDescription' | translate"></p>
  <a routerLink="/jobs/create" class="btn-primary">
    <svg...></svg>
    <span>{{ 'jobs.0064' | translate }}</span>
  </a>
</div>
```

**After:**

```html
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

```typescript
emptyStateActions: EmptyStateAction[] = [
  {
    label: 'jobs.button.createNew',
    icon: 'plus',
    variant: 'primary',
    handler: () => this.router.navigate(['/jobs/create'])
  }
];
```

## 属性说明

| 属性          | 类型                                            | 必需 | 默认值      | 描述                       |
| ------------- | ----------------------------------------------- | ---- | ----------- | -------------------------- |
| `type`        | `'default' \| 'search' \| 'error' \| 'success'` | 否   | `'default'` | 空状态类型，影响颜色和样式 |
| `icon`        | `string`                                        | 否   | `'grid'`    | 图标名称，内置支持多种图标 |
| `image`       | `string`                                        | 否   | -           | 自定义图片 URL，优先于图标 |
| `title`       | `string`                                        | 否   | -           | 标题，使用翻译键           |
| `description` | `string`                                        | 否   | -           | 描述，使用翻译键           |
| `actions`     | `EmptyStateAction[]`                            | 否   | -           | 操作按钮列表               |
| `actionClick` | `EventEmitter`                                  | 否   | -           | 操作点击事件输出           |

## 内置图标

- `inbox` - 收件箱
- `search` - 搜索
- `alert-circle` / `error` - 错误警告
- `briefcase` - 公文包
- `file-text` - 文件
- `grid` - 网格（默认）
- `calendar` - 日历
- `user` - 用户
- `check-circle` / `success` - 成功
- `folder` - 文件夹
- `database` - 数据库
- `trash` - 删除

## 操作按钮图标

- `plus` - 加号
- `x` - 关闭
- `arrow-left` - 左箭头
- `refresh` - 刷新
- `search` - 搜索
- `trash` - 删除
- `edit` - 编辑
- `filter` - 筛选
