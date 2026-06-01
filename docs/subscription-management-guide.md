# Angular 订阅管理规范

## 1. 发现的所有订阅泄漏位置

### 已修复的关键问题

#### 1.1 组件订阅泄漏

| 文件路径                                 | 问题类型                                  | 修复方式                          | 状态      |
| ---------------------------------------- | ----------------------------------------- | --------------------------------- | --------- |
| `feedback-code-modal.component.ts:279`   | Observable.subscribe 未取消               | takeUntil + ngOnDestroy           | ✅ 已修复 |
| `error-boundary.component.ts:88`         | Router.events.subscribe 未取消            | takeUntil + ngOnDestroy           | ✅ 已修复 |
| `theme-toggle.component.ts:461`          | addEventListener 未移除                   | 保存handler引用 + ngOnDestroy移除 | ✅ 已修复 |
| `language-selector.component.ts:367,378` | addEventListener 未移除 (click + keydown) | 保存handler引用 + ngOnDestroy移除 | ✅ 已修复 |

#### 1.2 潜在风险位置（需要审查）

以下组件/服务使用了 `.subscribe()` 但未明确检查是否有取消机制：

**高风险（组件内直接订阅）：**

- `app.ts` - 已有 ngOnDestroy，但需确认是否清理所有订阅
- `pages/marketing/campaign.component.ts:180` - window.addEventListener
- `pages/analysis/unified-analysis.component.ts` - 检查 store.subscribe
- `pages/dashboard/enhanced-dashboard.component.ts` - 使用 service 模式，service 需清理

**中风险（指令）：**

- `directives/click-outside.directive.ts:35` - 已有 ngOnDestroy
- `directives/infinite-scroll.directive.ts:34` - 已有 ngOnDestroy
- `directives/accessibility/accessible-card.directive.ts:91` - 需检查

**低风险（Services - 通常是单例）：**

- `services/auth.service.ts` - 单例服务，生命周期长
- `services/websocket.service.ts` - 已有 ngOnDestroy
- `services/file-upload.service.ts:477` - HTTP 请求，通常自动完成

## 2. 修复方案详解

### 2.1 takeUntil 模式（推荐用于组件）

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({...})
export class MyComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // ✅ 正确：所有订阅都通过 takeUntil 自动清理
    this.service.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      this.handleData(data);
    });

    this.store.select(selectSomething).pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.state = state;
    });
  }

  ngOnDestroy() {
    // ✅ 正确：发出完成信号并清理 Subject
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 2.2 AsyncPipe 模式（模板中，最简单）

```typescript
@Component({
  template: `
    <!-- ✅ 正确：自动订阅和取消订阅 -->
    <div *ngIf="data$ | async as data">
      {{ data.name }}
    </div>

    <!-- ✅ 正确：多个订阅也安全 -->
    <user-profile [user]="user$ | async"></user-profile>
    <user-stats [stats]="stats$ | async"></user-stats>
  `,
})
export class MyComponent {
  data$ = this.service.getData();
  user$ = this.store.select(selectUser);
  stats$ = this.store.select(selectStats);
  // 无需 ngOnDestroy！
}
```

### 2.3 toSignal 模式（Angular 16+，响应式）

```typescript
import { toSignal } from '@angular/core/rxjs-interop';

@Component({...})
export class MyComponent {
  // ✅ 正确：自动转换为 Signal，自动管理订阅
  data = toSignal(this.service.data$, { initialValue: [] });

  // 使用 Signal
  computedValue = computed(() => this.data().length);
}
```

### 2.4 takeUntilDestroyed 模式（Angular 16+）

```typescript
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({...})
export class MyComponent {
  constructor() {
    // ✅ 正确：自动在组件销毁时取消订阅
    this.service.data$.pipe(
      takeUntilDestroyed()
    ).subscribe(data => {
      this.handleData(data);
    });
  }
}
```

### 2.5 事件监听器管理

```typescript
import { Component, OnDestroy } from '@angular/core';

@Component({...})
export class MyComponent implements OnDestroy {
  // ✅ 正确：保存 handler 引用以便移除
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private scrollHandler: ((e: Event) => void) | null = null;

  ngOnInit() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // ✅ 正确：箭头函数绑定 this，保存在实例属性
    this.clickHandler = (event: MouseEvent) => {
      this.handleClick(event);
    };

    this.scrollHandler = () => {
      this.handleScroll();
    };

    document.addEventListener('click', this.clickHandler);
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy() {
    // ✅ 正确：移除所有事件监听器
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  private handleClick(event: MouseEvent): void {
    // 处理点击
  }

  private handleScroll(): void {
    // 处理滚动
  }
}
```

## 3. 推荐的统一订阅管理模式

### 3.1 基础 BaseComponent（可复用）

```typescript
import { Component, OnDestroy, Directive } from '@angular/core';
import { Subject } from 'rxjs';

@Directive()
export abstract class BaseComponent implements OnDestroy {
  protected destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3.2 使用 BaseComponent

```typescript
import { Component } from '@angular/core';
import { takeUntil } from 'rxjs';
import { BaseComponent } from './base.component';

@Component({...})
export class MyComponent extends BaseComponent {
  ngOnInit() {
    this.service.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // 处理数据
    });
  }
  // 无需再写 ngOnDestroy！
}
```

### 3.3 推荐的优先级

1. **首选 AsyncPipe** - 简单、安全、无需额外代码
2. **次选 toSignal** - Angular 16+，响应式，自动管理
3. **使用 takeUntilDestroyed** - Angular 16+，适用于 constructor 中的逻辑
4. **使用 takeUntil + destroy$** - 适用于 ngOnInit 和复杂场景
5. **手动管理** - 仅用于特殊场景（如动态订阅）

## 4. 防止未来泄漏的代码规范

### 4.1 ESLint 规则

在 `.eslintrc.json` 中添加：

```json
{
  "rules": {
    "rxjs/no-unsafe-subscribe": "error",
    "rxjs/no-subscribe-callbacks": "warn",
    "rxjs/no-ignored-subscription": "error"
  }
}
```

### 4.2 代码审查清单

每个组件/指令在审查时必须检查：

- [ ] **是否有 `.subscribe()`？**
  - 如果有，是否有取消机制？
  - 是否使用了 `takeUntil`、`async` pipe 或 `toSignal`？

- [ ] **是否有 `addEventListener`？**
  - 如果有，是否有对应的 `removeEventListener`？
  - 是否在 `ngOnDestroy` 中移除？

- [ ] **是否实现了 `OnDestroy`？**
  - 如果组件/指令有订阅或事件监听器，必须实现

- [ ] **Services 中的订阅**
  - 单例服务（providedIn: 'root'）可以接受长生命周期的订阅
  - 组件级服务必须清理订阅

### 4.3 代码模板

#### 组件模板（新标准）

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-example',
  template: `
    <!-- 使用 async pipe -->
    <div *ngIf="data$ | async as data">
      {{ data.name }}
    </div>
  `,
})
export class ExampleComponent implements OnInit, OnDestroy {
  data$ = this.service.getData();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    // 需要手动处理时使用 takeUntil
    this.service.events$.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      this.handleEvent(event);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 指令模板（新标准）

```typescript
import { Directive, ElementRef, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appClickOutside]',
})
export class ClickOutsideDirective implements OnDestroy {
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  constructor(private el: ElementRef) {
    this.clickHandler = (event: MouseEvent) => {
      if (!this.el.nativeElement.contains(event.target)) {
        // 处理点击外部
      }
    };
    document.addEventListener('click', this.clickHandler);
  }

  ngOnDestroy() {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
  }
}
```

### 4.4 自动化检测

添加 pre-commit hook 检查潜在的订阅泄漏：

```bash
#!/bin/bash
# .husky/pre-commit

echo "🔍 检查订阅泄漏..."

# 查找 .subscribe() 但没有 takeUntil 或 async pipe 的文件
issues=$(grep -r "\.subscribe(" apps/ai-recruitment-frontend/src --include="*.ts" | \
  grep -v "\.spec\.ts" | \
  grep -v "takeUntil" | \
  grep -v "// ignore-subscription" | \
  wc -l)

if [ "$issues" -gt 0 ]; then
  echo "⚠️  发现 $issues 个潜在的订阅泄漏。请检查以下文件："
  grep -r "\.subscribe(" apps/ai-recruitment-frontend/src --include="*.ts" | \
    grep -v "\.spec\.ts" | \
    grep -v "takeUntil" | \
    grep -v "// ignore-subscription"
  exit 1
fi

echo "✅ 订阅检查通过"
```

## 5. 修复验证

修复后，请确保：

1. **TypeScript 编译通过**

   ```bash
   npm run typecheck
   ```

2. **单元测试通过**

   ```bash
   npm run test
   ```

3. **手动检查**
   - 打开浏览器开发者工具
   - 切换到 Memory 面板
   - 录制 Heap Snapshot
   - 导航应用不同页面
   - 再次录制 Heap Snapshot
   - 检查是否有组件实例未释放

## 6. 总结

### 已完成的修复

1. ✅ `feedback-code-modal.component.ts` - 添加 takeUntil + ngOnDestroy
2. ✅ `error-boundary.component.ts` - 添加 takeUntil + ngOnDestroy
3. ✅ `theme-toggle.component.ts` - 添加事件监听器移除
4. ✅ `language-selector.component.ts` - 添加事件监听器移除

### 下一步建议

1. 对高风险位置进行全面审查
2. 在团队内推广新的订阅管理规范
3. 配置 ESLint 规则自动检测
4. 添加自动化测试覆盖内存泄漏场景
5. 定期进行内存分析

---

**最后更新**: 2026-03-17
**版本**: 1.0
**作者**: AI Assistant
