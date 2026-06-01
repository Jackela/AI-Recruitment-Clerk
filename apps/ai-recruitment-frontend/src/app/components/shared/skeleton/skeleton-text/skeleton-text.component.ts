import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 骨架屏文本占位符组件
 * 用于显示文本内容的加载状态
 */
@Component({
  selector: 'arc-skeleton-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-text" [style.gap]="gap">
      <div
        *ngFor="let line of linesArray; let i = index"
        class="skeleton-line shimmer"
        [style.width]="getWidth(i)"
        [style.height]="height"
        [attr.aria-hidden]="true"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-text {
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      .skeleton-line {
        background: var(--skeleton-bg, var(--color-neutral-200));
        border-radius: var(--radius-sm, 4px);
        min-width: 20%;

        // Shimmer 动画
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
        .skeleton-line {
          --skeleton-bg: var(--color-neutral-700);
          --skeleton-shimmer: var(--color-neutral-600);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonTextComponent {
  /** 行数 */
  @Input() public lines = 3;

  /** 每行宽度，可以是字符串或字符串数组 */
  @Input() public width: string | string[] = '100%';

  /** 行高 */
  @Input() public height = '1em';

  /** 行间距 */
  @Input() public gap = '0.5em';

  /**
   * 生成行数数组用于ngFor
   */
  get linesArray(): number[] {
    return Array(this.lines)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * 获取指定行的宽度
   * @param index 行索引
   * @returns 宽度值
   */
  public getWidth(index: number): string {
    if (Array.isArray(this.width)) {
      return this.width[index] || this.width[this.width.length - 1] || '100%';
    }
    return this.width;
  }
}
