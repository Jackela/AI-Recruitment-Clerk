# 可访问性测试套件

此目录包含完整的可访问性测试套件，基于 WCAG 2.1 AA 标准。

## 测试文件列表

| 文件                                  | 描述                                |
| ------------------------------------- | ----------------------------------- |
| `accessibility-full.spec.ts`          | 完整页面可访问性扫描，使用 axe-core |
| `accessibility-keyboard.spec.ts`      | 键盘导航测试                        |
| `accessibility-screen-reader.spec.ts` | 屏幕阅读器支持测试                  |
| `accessibility-contrast.spec.ts`      | 颜色对比度测试                      |

## 安装依赖

```bash
npm install --save-dev @axe-core/playwright
```

## 运行测试

```bash
# 运行所有可访问性测试
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/

# 运行特定测试文件
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/accessibility-full.spec.ts
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/accessibility-keyboard.spec.ts
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/accessibility-screen-reader.spec.ts
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/accessibility-contrast.spec.ts

# 使用 UI 模式运行
npx playwright test apps/ai-recruitment-frontend-e2e/src/accessibility/ --ui
```

## WCAG 2.1 AA 标准检查项

### 1. 可感知性 (Perceivable)

- ✓ 文本对比度 ≥ 4.5:1
- ✓ 大文本对比度 ≥ 3:1
- ✓ UI 组件对比度 ≥ 3:1
- ✓ 图片有替代文本
- ✓ 内容可调整大小至 200%
- ✓ 文本间距可调

### 2. 可操作性 (Operable)

- ✓ 所有功能可通过键盘访问
- ✓ 无键盘陷阱
- ✓ 焦点可见且顺序合理
- ✓ 提供跳过链接
- ✓ 无自动播放音频
- ✓ 无内容闪烁

### 3. 可理解性 (Understandable)

- ✓ 页面有语言属性
- ✓ 表单输入有标签
- ✓ 错误消息清晰
- ✓ 一致的导航

### 4. 健壮性 (Robust)

- ✓ 有效的 HTML/ARIA
- ✓ 兼容辅助技术
- ✓ 状态变化可感知

## 自动化检查范围

### accessibility-full.spec.ts

- 7 个页面的完整扫描
- 移动端可访问性
- 关键用户流程
- 特定 WCAG 规则
- ARIA 有效性

### accessibility-keyboard.spec.ts

- Tab 导航顺序
- Shift+Tab 反向导航
- Enter/Space 激活
- Escape 关闭
- 焦点可见性
- 键盘陷阱检测
- 方向键导航
- 快捷键支持
- 跳过链接

### accessibility-screen-reader.spec.ts

- ARIA 标签检查
- 角色属性验证
- 状态更新 (aria-busy, aria-disabled)
- 实时区域 (aria-live)
- 页面结构 (标题层次)
- 表格可访问性
- 表单可访问性

### accessibility-contrast.spec.ts

- 文本对比度 ≥ 4.5:1
- 大文本对比度 ≥ 3:1
- UI 组件对比度
- 焦点可见性
- 图表对比度
- 错误/成功状态
- 移动端对比度
- 高对比度模式
- 暗色模式

## 修复建议

如果发现可访问性问题，请参考以下建议：

### 对比度问题

```css
/* 使用工具如 https://webaim.org/resources/contrastchecker/ 检查 */
.text-low-contrast {
  color: #767676; /* 在白色背景上对比度为 4.54:1 */
}
```

### 键盘导航

```html
<!-- 确保所有交互元素可通过键盘访问 -->
<button onclick="...">可访问</button>
<div role="button" tabindex="0" onclick="...">需添加 tabindex</div>
```

### ARIA 标签

```html
<!-- 图标按钮 -->
<button aria-label="关闭">
  <span class="icon-close"></span>
</button>

<!-- 表单输入 -->
<label for="email">邮箱</label>
<input id="email" type="email" aria-describedby="email-help" />
<span id="email-help">我们将不会分享您的邮箱</span>
```

## 参考资源

- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core 规则](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WebAIM 对比度检查器](https://webaim.org/resources/contrastchecker/)
- [ARIA 创作实践](https://www.w3.org/WAI/ARIA/apg/)
