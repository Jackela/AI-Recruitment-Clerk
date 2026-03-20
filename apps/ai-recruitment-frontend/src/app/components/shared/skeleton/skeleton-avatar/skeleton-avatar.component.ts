import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

/**
 * 骨架屏头像占位符组件
 * 用于显示头像的加载状态
 */
@Component({
  selector: 'arc-skeleton-avatar',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="skeleton-avatar shimmer"
      role="status"
      [attr.aria-label]="'Loading avatar' | translate"
      [style.width.px]="sizeInPx"
      [style.height.px]="sizeInPx"
      [class.circle]="shape === 'circle'"
      [class.square]="shape === 'square'"
    ></div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .skeleton-avatar {
        background: var(--skeleton-bg, var(--color-neutral-200));
        flex-shrink: 0;

        &.circle {
          border-radius: 50%;
        }

        &.square {
          border-radius: var(--radius-sm, 4px);
        }

        &.shimmer {
          background: linear-gradient(
            90deg,
            var(--skeleton-bg, var(--color-neutral-200)) 25%,
            var(--skeleton-shimmer, var(--color-neutral-100)) 50%,
            var(--skeleton-bg, var(--color-neutral-200)) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      // 暗黑模式
      :host-context([data-theme='dark']) {
        .skeleton-avatar {
          --skeleton-bg: var(--color-neutral-700);
          --skeleton-shimmer: var(--color-neutral-600);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonAvatarComponent {
  /** 尺寸：sm(24px), md(40px), lg(64px), xl(96px) */
  @Input() public size: 'sm' | 'md' | 'lg' | 'xl' = 'md';

  /** 形状：circle(圆形), square(方形) */
  @Input() public shape: 'circle' | 'square' = 'circle';

  /** 自定义尺寸（像素），优先于size属性 */
  @Input() public customSize?: number;

  /**
   * 尺寸映射表
   */
  private readonly sizeMap: Record<string, number> = {
    sm: 24,
    md: 40,
    lg: 64,
    xl: 96,
  };

  /**
   * 获取实际尺寸（像素）
   */
  get sizeInPx(): number {
    if (this.customSize) {
      return this.customSize;
    }
    return this.sizeMap[this.size] || this.sizeMap['md'];
  }
}
