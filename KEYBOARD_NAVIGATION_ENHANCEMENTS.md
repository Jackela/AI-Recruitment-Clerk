# Phase 2.5 - 键盘导航增强文档

## 概述

本文档总结了 Phase 2.5 可访问性增强中的所有键盘导航改进。

## 1. 图表组件键盘访问

### BarChartComponent (`bar-chart.component.ts`)

**位置**: `apps/ai-recruitment-frontend/src/app/components/mobile/charts/bar-chart.component.ts`

**新增功能**:

- `tabindex="0"` - 使图表容器可聚焦
- `aria-description` - 提供键盘导航提示
- `role="list"` / `role="listitem"` - 语义化角色

**键盘快捷键**:
| 按键 | 功能 |
|------|------|
| ArrowRight | 移动到下一个数据点 |
| ArrowLeft | 移动到上一个数据点 |
| ArrowUp | 跳转到第一个数据点 |
| ArrowDown | 跳转到最后一个数据点 |
| Enter / Space | 选择当前数据点 |
| Home | 跳转到第一个数据点 |
| End | 跳转到最后一个数据点 |

**焦点样式**:

- 聚焦的数据点有蓝色阴影 (box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.5))
- 数据点轻微放大效果 (transform: scale(1.05))

---

### PieChartComponent (`pie-chart.component.ts`)

**位置**: `apps/ai-recruitment-frontend/src/app/components/mobile/charts/pie-chart.component.ts`

**新增功能**:

- SVG 扇区可点击和聚焦
- 图例项支持键盘导航
- 循环导航（最后一个到第一个）

**键盘快捷键**:
| 按键 | 功能 |
|------|------|
| ArrowRight / ArrowDown | 移动到下一个扇区 |
| ArrowLeft / ArrowUp | 移动到上一个扇区 |
| Enter / Space | 选择当前扇区 |
| Home | 跳转到第一个扇区 |
| End | 跳转到最后一个扇区 |

**焦点样式**:

- 扇区放大效果 (transform: scale(1.1))
- 投影效果 (filter: drop-shadow)
- 图例项高亮背景

---

## 2. 移动端滑动组件键盘支持

### MobileSwipeComponent (`mobile-swipe.component.ts`)

**位置**: `apps/ai-recruitment-frontend/src/app/components/mobile/mobile-swipe.component.ts`

**新增功能**:

- 完整的键盘快捷键支持
- Tab 键导航操作按钮
- 焦点陷阱模式
- 屏幕阅读器支持

**键盘快捷键**:
| 按键 | 功能 |
|------|------|
| Tab | 导航到下一个操作按钮 |
| Shift+Tab | 导航到上一个操作按钮 |
| Enter | 执行当前聚焦的操作 |
| Delete / Backspace | 执行删除操作（自动查找危险/删除操作） |
| Escape | 关闭操作菜单 |
| ArrowRight / ArrowDown | 下一个操作按钮 |
| ArrowLeft / ArrowUp | 上一个操作按钮 |

**自定义快捷键**:
可以在 SwipeAction 中定义 `keyboardShortcut` 属性：

```typescript
{
  id: 'delete',
  label: '删除',
  keyboardShortcut: 'Delete', // 自定义快捷键
  color: 'danger'
}
```

**焦点样式**:

- 操作按钮高亮 (transform: scale(1.05))
- 蓝色边框 (box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.5))
- 快捷键提示显示

---

## 3. Data-Table 键盘增强

### DataTableComponent (`data-table.component.ts`)

**位置**: `apps/ai-recruitment-frontend/src/app/components/shared/data-table/data-table.component.ts`

**新增功能**:

- 完整的表格键盘导航
- 单元格级焦点管理
- 行选择和操作快捷键
- 分页键盘支持

**键盘快捷键**:
| 按键 | 功能 |
|------|------|
| ArrowDown | 移动到下一行 |
| ArrowUp | 移动到上一行 |
| ArrowRight | 移动到下一列 |
| ArrowLeft | 移动到上一列 |
| Tab | 向前导航单元格 |
| Shift+Tab | 向后导航单元格 |
| Enter | 查看当前行 / 执行操作 |
| Space | 选择当前行（如果可选） |
| Home | 移动到行首 |
| End | 移动到行尾 |
| PageDown | 下一页 |
| PageUp | 上一页 |
| Delete / Backspace | 删除当前行 |
| Escape | 退出表格焦点 |

**ARIA 增强**:

- `aria-selected` - 标记选中行
- `aria-description` - 键盘导航提示
- `tabindex` 管理 - 动态焦点控制

**焦点样式** (SCSS):

```scss
// 聚焦的行
&.focused {
  background: linear-gradient(
    135deg,
    var(--color-primary-50),
    var(--color-royal-50)
  );
  box-shadow: inset 0 0 0 2px var(--color-primary-500);
}

// 聚焦的单元格
&.focused {
  background: var(--color-primary-100);
  box-shadow: inset 0 0 0 2px var(--color-primary-600);

  &::after {
    border: 2px dashed var(--color-primary-400);
  }
}
```

---

## 4. 模态框焦点管理

### ModalComponent (`modal.component.ts`)

**位置**: `apps/ai-recruitment-frontend/src/app/components/shared/modal/modal.component.ts`

**新增功能**:

- 焦点陷阱 (Focus Trap)
- 打开时自动聚焦
- 关闭后焦点恢复
- ESC 键关闭

**键盘快捷键**:
| 按键 | 功能 |
|------|------|
| Escape | 关闭模态框 |
| Tab | 在模态框内循环导航 |
| Shift+Tab | 反向循环导航 |

**焦点陷阱实现**:

```typescript
public trapFocus(event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusableElements = this.getFocusableElements();
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    event.preventDefault();
  }
}
```

**焦点恢复**:

- 打开模态框前保存当前焦点元素
- 关闭后恢复之前聚焦的元素
- 可配置 `restoreFocus` 属性

**自动聚焦优先级**:

1. 确认按钮 (confirmBtn)
2. 取消按钮 (cancelBtn)
3. 关闭按钮 (closeBtn)
4. 第一个可聚焦元素

---

## 5. 表单自动完成

### CreateJobComponent (`create-job.component.html`)

**位置**: `apps/ai-recruitment-frontend/src/app/pages/jobs/create-job/create-job.component.html`

**新增属性**:

- `jobTitle` 输入框: `autocomplete="organization-title"`
- `jdText` 文本域: `autocomplete="off"`

**自动完成值说明**:
| 字段 | autocomplete 值 | 说明 |
|------|----------------|------|
| 职位标题 | organization-title | 帮助浏览器自动填充职位信息 |
| 职位描述 | off | 禁用自动完成（长文本） |

---

## WCAG 2.1.1 合规验证清单

### 1. 键盘可访问性 (Keyboard Accessible)

- [x] 所有功能可通过键盘访问
- [x] 没有键盘陷阱 (除模态框内的有意陷阱)
- [x] 焦点顺序符合逻辑
- [x] 焦点可见

### 2. 无特定时间限制

- [x] 没有需要快速反应的键盘操作
- [x] 用户可以按自己的速度导航

### 3. 焦点指示器

- [x] 所有可聚焦元素有可见的焦点指示器
- [x] 焦点样式符合 WCAG 对比度要求
- [x] 焦点样式不依赖于颜色

### 4. 语义化标记

- [x] 正确的 ARIA 角色
- [x] 适当的状态属性 (aria-selected, aria-expanded 等)
- [x] 键盘导航提示 (aria-description)

### 5. 快捷键

- [x] 快捷键不冲突
- [x] 常用快捷键符合惯例 (Enter, Space, Escape, 方向键)
- [x] 复杂操作有快捷键提示

---

## 使用示例

### 图表组件

```html
<arc-bar-chart
  [data]="chartData"
  [chartTitle]="'月度统计'"
  (dataPointSelect)="onDataPointSelect($event)"
>
</arc-bar-chart>
```

### 滑动组件

```html
<arc-mobile-swipe
  [actions]="swipeActions"
  [item]="candidate"
  itemLabel="候选人"
  (swipeAction)="handleSwipeAction($event)"
  (keyboardAction)="handleKeyboardAction($event)"
>
  <div class="candidate-card">...内容...</div>
</arc-mobile-swipe>
```

### 表格组件

```html
<arc-data-table
  [columns]="tableColumns"
  [data]="tableData"
  [options]="{ selectable: true, multiSelect: true }"
  [showActions]="true"
  (viewItem)="viewCandidate($event)"
  (editItem)="editCandidate($event)"
  (deleteItem)="deleteCandidate($event)"
>
</arc-data-table>
```

### 模态框组件

```html
<arc-modal
  [isOpen]="showModal"
  [title]="'确认删除'"
  [showFooter]="true"
  [restoreFocus]="true"
  (confirmed)="confirmDelete()"
  (cancelled)="closeModal()"
>
  <p>确定要删除此项目吗？</p>
</arc-modal>
```

---

## 测试建议

### 键盘导航测试

1. 使用 Tab 键遍历所有可聚焦元素
2. 验证焦点顺序逻辑
3. 测试方向键在图表和表格中的导航
4. 验证 Enter 和 Space 键功能
5. 测试 Escape 键关闭模态框

### 屏幕阅读器测试

1. 使用 NVDA/JAWS/VoiceOver 测试
2. 验证 ARIA 标签和描述
3. 测试键盘导航提示
4. 验证状态变化通知

### 焦点管理测试

1. 打开模态框前记录焦点位置
2. 关闭模态框后验证焦点恢复
3. 测试焦点陷阱循环
4. 验证焦点可见性

---

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- 支持键盘导航的移动浏览器

## 已知限制

1. **iOS Safari**: 方向键导航需要外接键盘
2. **Android**: 某些键盘可能不支持所有快捷键
3. **IE11**: 不支持 (项目使用 Angular 16+)

---

## 未来增强

1. 为所有操作提供可配置快捷键
2. 添加键盘导航跳过链接
3. 实现快捷键帮助面板
4. 添加键盘宏支持

---

## 相关文件清单

### 修改的文件:

1. `apps/ai-recruitment-frontend/src/app/components/mobile/charts/bar-chart.component.ts`
2. `apps/ai-recruitment-frontend/src/app/components/mobile/charts/pie-chart.component.ts`
3. `apps/ai-recruitment-frontend/src/app/components/mobile/mobile-swipe.component.ts`
4. `apps/ai-recruitment-frontend/src/app/components/shared/data-table/data-table.component.ts`
5. `apps/ai-recruitment-frontend/src/app/components/shared/data-table/data-table.component.html`
6. `apps/ai-recruitment-frontend/src/app/components/shared/data-table/data-table.component.scss`
7. `apps/ai-recruitment-frontend/src/app/components/shared/modal/modal.component.ts`
8. `apps/ai-recruitment-frontend/src/app/pages/jobs/create-job/create-job.component.html`

### 新增功能汇总:

- ✅ 图表组件：方向键导航 + Enter/Space 选择
- ✅ 滑动组件：Tab 导航 + Delete 删除 + Enter 确认
- ✅ Data-Table：完整键盘导航 + 单元格焦点管理
- ✅ 模态框：焦点陷阱 + ESC 关闭 + 焦点恢复
- ✅ 表单字段：autocomplete 属性

---

_文档生成时间: 2026-03-17_
_Phase: 2.5 - 键盘导航增强_
