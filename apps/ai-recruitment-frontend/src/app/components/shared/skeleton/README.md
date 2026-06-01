# Skeleton Component Library

一套可复用的骨架屏组件，统一加载状态 UI。

## 组件列表

| 组件                    | 选择器                | 用途       |
| ----------------------- | --------------------- | ---------- |
| SkeletonTextComponent   | `arc-skeleton-text`   | 文本占位符 |
| SkeletonCardComponent   | `arc-skeleton-card`   | 卡片占位符 |
| SkeletonTableComponent  | `arc-skeleton-table`  | 表格占位符 |
| SkeletonAvatarComponent | `arc-skeleton-avatar` | 头像占位符 |
| SkeletonButtonComponent | `arc-skeleton-button` | 按钮占位符 |

## 安装与导入

### 方法1: 通过 SharedModule（推荐）

```typescript
import { SharedModule } from './components/shared/shared.module';

@NgModule({
  imports: [SharedModule],
})
export class YourModule {}
```

### 方法2: 单独导入组件

```typescript
import {
  SkeletonTextComponent,
  SkeletonCardComponent,
} from './components/shared/skeleton';

@Component({
  standalone: true,
  imports: [SkeletonTextComponent, SkeletonCardComponent],
  // ...
})
export class YourComponent {}
```

## 组件详情

### 1. SkeletonTextComponent (arc-skeleton-text)

文本占位符组件。

#### 输入属性

| 属性     | 类型                 | 默认值    | 说明                         |
| -------- | -------------------- | --------- | ---------------------------- |
| `lines`  | `number`             | `3`       | 行数                         |
| `width`  | `string \| string[]` | `'100%'`  | 每行宽度，可以是单个值或数组 |
| `height` | `string`             | `'1em'`   | 行高                         |
| `gap`    | `string`             | `'0.5em'` | 行间距                       |

#### 使用示例

```html
<!-- 基础用法 -->
<arc-skeleton-text></arc-skeleton-text>

<!-- 自定义行数和宽度 -->
<arc-skeleton-text [lines]="5" [width]="['100%', '80%', '60%', '80%', '40%']">
</arc-skeleton-text>

<!-- 自定义行高和间距 -->
<arc-skeleton-text [lines]="3" height="1.5em" gap="0.75em"> </arc-skeleton-text>
```

---

### 2. SkeletonCardComponent (arc-skeleton-card)

卡片占位符组件。

#### 输入属性

| 属性                 | 类型      | 默认值   | 说明             |
| -------------------- | --------- | -------- | ---------------- |
| `hasHeader`          | `boolean` | `true`   | 是否有头部       |
| `hasAvatar`          | `boolean` | `false`  | 是否有头像       |
| `lines`              | `number`  | `3`      | 内容行数         |
| `hasActions`         | `boolean` | `false`  | 是否有操作按钮   |
| `avatarSize`         | `number`  | `48`     | 头像尺寸（像素） |
| `actionButtonCount`  | `number`  | `2`      | 操作按钮数量     |
| `actionButtonWidth`  | `string`  | `'80px'` | 操作按钮宽度     |
| `actionButtonHeight` | `string`  | `'36px'` | 操作按钮高度     |

#### 使用示例

```html
<!-- 基础卡片 -->
<arc-skeleton-card></arc-skeleton-card>

<!-- 带头像和操作按钮的卡片 -->
<arc-skeleton-card
  [hasHeader]="true"
  [hasAvatar]="true"
  [lines]="4"
  [hasActions]="true"
  [actionButtonCount]="3"
></arc-skeleton-card>

<!-- 简化版卡片 -->
<arc-skeleton-card [hasHeader]="false" [lines]="2"></arc-skeleton-card>
```

---

### 3. SkeletonTableComponent (arc-skeleton-table)

表格占位符组件。

#### 输入属性

| 属性           | 类型       | 默认值 | 说明                   |
| -------------- | ---------- | ------ | ---------------------- |
| `rows`         | `number`   | `5`    | 行数                   |
| `columns`      | `number`   | `4`    | 列数                   |
| `hasHeader`    | `boolean`  | `true` | 是否有表头             |
| `columnWidths` | `number[]` | `[]`   | 列宽配置（百分比数组） |

#### 使用示例

```html
<!-- 基础表格 -->
<arc-skeleton-table></arc-skeleton-table>

<!-- 自定义行列数 -->
<arc-skeleton-table
  [rows]="10"
  [columns]="6"
  [hasHeader]="true"
></arc-skeleton-table>

<!-- 自定义列宽 -->
<arc-skeleton-table
  [rows]="5"
  [columns]="4"
  [columnWidths]="[10, 40, 30, 20]"
></arc-skeleton-table>
```

---

### 4. SkeletonAvatarComponent (arc-skeleton-avatar)

头像占位符组件。

#### 输入属性

| 属性         | 类型                           | 默认值      | 说明                              |
| ------------ | ------------------------------ | ----------- | --------------------------------- |
| `size`       | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'`      | 预设尺寸                          |
| `shape`      | `'circle' \| 'square'`         | `'circle'`  | 形状                              |
| `customSize` | `number`                       | `undefined` | 自定义尺寸（像素），优先于 `size` |

#### 尺寸映射

| size | 像素值 |
| ---- | ------ |
| sm   | 24px   |
| md   | 40px   |
| lg   | 64px   |
| xl   | 96px   |

#### 使用示例

```html
<!-- 不同尺寸 -->
<arc-skeleton-avatar size="sm"></arc-skeleton-avatar>
<arc-skeleton-avatar size="md"></arc-skeleton-avatar>
<arc-skeleton-avatar size="lg"></arc-skeleton-avatar>
<arc-skeleton-avatar size="xl"></arc-skeleton-avatar>

<!-- 不同形状 -->
<arc-skeleton-avatar shape="circle"></arc-skeleton-avatar>
<arc-skeleton-avatar shape="square"></arc-skeleton-avatar>

<!-- 自定义尺寸 -->
<arc-skeleton-avatar [customSize]="120"></arc-skeleton-avatar>
```

---

### 5. SkeletonButtonComponent (arc-skeleton-button)

按钮占位符组件。

#### 输入属性

| 属性      | 类型                                  | 默认值        | 说明     |
| --------- | ------------------------------------- | ------------- | -------- |
| `width`   | `string`                              | `'100px'`     | 按钮宽度 |
| `height`  | `string`                              | `'36px'`      | 按钮高度 |
| `variant` | `'text' \| 'contained' \| 'outlined'` | `'contained'` | 变体样式 |

#### 使用示例

```html
<!-- 不同变体 -->
<arc-skeleton-button variant="contained"></arc-skeleton-button>
<arc-skeleton-button variant="outlined"></arc-skeleton-button>
<arc-skeleton-button variant="text"></arc-skeleton-button>

<!-- 自定义尺寸 -->
<arc-skeleton-button width="120px" height="48px"></arc-skeleton-button>
```

---

## 组合使用示例

### 用户资料卡片加载状态

```html
<arc-skeleton-card
  *ngIf="isLoading"
  [hasHeader]="true"
  [hasAvatar]="true"
  [lines]="3"
  [hasActions]="true"
></arc-skeleton-card>

<div *ngIf="!isLoading" class="user-profile">
  <!-- 实际内容 -->
</div>
```

### 数据表格加载状态

```html
<arc-skeleton-table
  *ngIf="isLoading"
  [rows]="10"
  [columns]="5"
  [columnWidths]="[5, 25, 30, 20, 20]"
></arc-skeleton-table>

<table *ngIf="!isLoading">
  <!-- 实际表格内容 -->
</table>
```

### 评论列表加载状态

```html
<div class="comment-list">
  <div *ngIf="isLoading" class="loading-comments">
    <div class="comment-item" *ngFor="let _ of [1,2,3]">
      <div class="comment-header">
        <arc-skeleton-avatar size="md"></arc-skeleton-avatar>
        <arc-skeleton-text
          [lines]="1"
          width="120px"
          height="1em"
        ></arc-skeleton-text>
      </div>
      <arc-skeleton-text
        [lines]="2"
        [width]="['100%', '70%']"
      ></arc-skeleton-text>
    </div>
  </div>

  <div *ngIf="!isLoading" class="comments">
    <!-- 实际评论内容 -->
  </div>
</div>
```

---

## 组件关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    Skeleton Library                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐                                         │
│  │ SkeletonText    │ ◄──── 基础组件，被其他组件依赖          │
│  │ (arc-skeleton-  │                                         │
│  │  text)          │                                         │
│  └────────┬────────┘                                         │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ SkeletonCard    │  │ SkeletonTable   │                   │
│  │ (arc-skeleton-  │  │ (arc-skeleton-  │                   │
│  │  card)          │  │  table)         │                   │
│  │                 │  │                 │                   │
│  │ 使用:           │  │ 使用:           │                   │
│  │ - SkeletonText  │  │ - 内部实现      │                   │
│  │   (title/content)│  │   shimmer lines │                  │
│  └────────┬────────┘  └─────────────────┘                   │
│           │                                                  │
│           │  ┌─────────────────┐  ┌─────────────────┐       │
│           └──┤ SkeletonAvatar  │  │ SkeletonButton  │       │
│              │ (arc-skeleton-  │  │ (arc-skeleton-  │       │
│              │  avatar)        │  │  button)        │       │
│              │                 │  │                 │       │
│              │ 使用:           │  │ 使用:           │       │
│              │ - SkeletonCard  │  │ - SkeletonCard  │       │
│              │   (avatar)      │  │   (actions)     │       │
│              └─────────────────┘  └─────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘

依赖关系:
• SkeletonCard 依赖 SkeletonText (标题和内容)
• SkeletonCard 内部使用 avatar 和 button 的 shimmer 效果
• SkeletonTable 独立实现，但遵循相同的视觉风格
• SkeletonAvatar 和 SkeletonButton 是独立的基础组件
```

---

## 样式定制

### CSS 自定义属性

你可以在全局样式中覆盖这些变量来自定义骨架屏外观：

```scss
:root {
  --skeleton-bg: #e0e0e0; // 骨架屏背景色
  --skeleton-shimmer: #f5f5f5; // 闪光效果颜色
  --skeleton-radius: 4px; // 圆角大小
  --skeleton-animation-duration: 1.5s; // 动画时长
}

// 暗黑模式
[data-theme='dark'] {
  --skeleton-bg: #424242;
  --skeleton-shimmer: #616161;
}
```

### 导入共享样式

如果你想在组件级别使用基础样式：

```scss
@import './components/shared/skeleton/skeleton-shared';

.my-custom-skeleton {
  @extend .skeleton-base;
  // 自定义样式...
}
```

---

## 迁移指南

### 从现有 Loading 组件迁移

如果你正在使用现有的 `arc-loading` 组件，可以按以下方式迁移到骨架屏：

#### 替换场景

| 原使用场景   | 推荐替换为                       |
| ------------ | -------------------------------- |
| 文本内容加载 | `arc-skeleton-text`              |
| 卡片内容加载 | `arc-skeleton-card`              |
| 表格数据加载 | `arc-skeleton-table`             |
| 列表项加载   | `arc-skeleton-card` 或组合组件   |
| 全屏加载     | `arc-loading` (保留用于全屏遮罩) |

#### 迁移示例

**Before:**

```html
<arc-loading *ngIf="isLoading" message="加载中..."></arc-loading>
<div *ngIf="!isLoading" class="content">...实际内容...</div>
```

**After:**

```html
<arc-skeleton-text *ngIf="isLoading" [lines]="3"></arc-skeleton-text>
<div *ngIf="!isLoading" class="content">...实际内容...</div>
```

### 组合现有组件

你可以混合使用骨架屏组件和现有组件：

```html
<!-- 保留全屏加载 -->
<arc-loading
  *ngIf="isInitialLoading"
  overlay="true"
  message="初始化中..."
></arc-loading>

<!-- 使用骨架屏进行内容占位 -->
<arc-skeleton-card
  *ngIf="!isInitialLoading && isContentLoading"
></arc-skeleton-card>

<div *ngIf="!isInitialLoading && !isContentLoading">
  <!-- 实际内容 -->
</div>
```

---

## 无障碍支持

所有骨架屏组件都实现了以下无障碍特性：

- `role="status"` - 标识加载状态
- `aria-label` / `aria-hidden` - 提供适当的标签
- 支持 `prefers-reduced-motion` - 在减少动画偏好下禁用 shimmer 效果

---

## 最佳实践

1. **匹配布局**: 骨架屏的形状应尽可能接近实际内容的布局
2. **渐进加载**: 对于复杂页面，可以分区域使用骨架屏
3. **避免过度**: 不要为每个小组件都添加骨架屏，只在主要内容区域使用
4. **动画时长**: 1.5秒的动画时长是最佳选择，不会太快或太慢
5. **暗黑模式**: 骨架屏自动支持暗黑模式，无需额外配置
