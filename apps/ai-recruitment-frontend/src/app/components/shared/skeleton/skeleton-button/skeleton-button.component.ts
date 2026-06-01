import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

/**
 * 骨架屏按钮占位符组件
 * 用于显示按钮的加载状态
 */
@Component({
  selector: 'arc-skeleton-button',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="skeleton-button shimmer"
      [class.contained]="variant === 'contained'"
      [class.outlined]="variant === 'outlined'"
      [class.text]="variant === 'text'"
      [style.width]="width"
      [style.height]="height"
      role="status"
      [attr.aria-label]="'Loading button' | translate"
    ></div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }

      .skeleton-button {
        display: inline-block;
        background: var(--skeleton-bg, var(--color-neutral-200));
        border-radius: var(--radius-sm, 4px);
        min-width: 64px;

        &.contained {
          background: var(--skeleton-bg, var(--color-neutral-200));
        }

        &.outlined {
          background: transparent;
          border: 1px solid var(--skeleton-bg, var(--color-neutral-200));
        }

        &.text {
          background: transparent;
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

          &.outlined,
          &.text {
            background: transparent;
            position: relative;
            overflow: hidden;

            &::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: linear-gradient(
                90deg,
                var(--skeleton-bg, var(--color-neutral-200)) 25%,
                var(--skeleton-shimmer, var(--color-neutral-100)) 50%,
                var(--skeleton-bg, var(--color-neutral-200)) 75%
              );
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              opacity: 0.3;
            }
          }
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
        .skeleton-button {
          --skeleton-bg: var(--color-neutral-700);
          --skeleton-shimmer: var(--color-neutral-600);

          &.outlined {
            border-color: var(--color-neutral-600);
          }
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonButtonComponent {
  /** 按钮宽度 */
  @Input() public width = '100px';

  /** 按钮高度 */
  @Input() public height = '36px';

  /** 变体样式：text(文本), contained(填充), outlined(描边) */
  @Input() public variant: 'text' | 'contained' | 'outlined' = 'contained';
}
