import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonTextComponent } from '../skeleton-text/skeleton-text.component';

/**
 * 骨架屏卡片占位符组件
 * 用于显示卡片内容的加载状态
 */
@Component({
  selector: 'arc-skeleton-card',
  standalone: true,
  imports: [CommonModule, SkeletonTextComponent],
  template: `
    <div
      class="skeleton-card"
      role="status"
      [attr.aria-label]="'Loading card content' | i18n"
    >
      <!-- Header -->
      <div *ngIf="hasHeader" class="skeleton-header">
        <div
          *ngIf="hasAvatar"
          class="skeleton-avatar shimmer"
          [style.width.px]="avatarSize"
          [style.height.px]="avatarSize"
        ></div>
        <div class="skeleton-title">
          <arc-skeleton-text
            [lines]="2"
            [width]="['60%', '40%']"
          ></arc-skeleton-text>
        </div>
      </div>

      <!-- Content -->
      <div class="skeleton-content">
        <arc-skeleton-text [lines]="lines"></arc-skeleton-text>
      </div>

      <!-- Actions -->
      <div *ngIf="hasActions" class="skeleton-actions">
        <div
          *ngFor="let _ of actionButtonsArray"
          class="skeleton-button shimmer"
          [style.width]="actionButtonWidth"
          [style.height]="actionButtonHeight"
        ></div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-card {
        padding: 1.5rem;
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-md, 8px);
        background: var(--color-background, #ffffff);
      }

      .skeleton-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .skeleton-avatar {
        flex-shrink: 0;
        background: var(--skeleton-bg, var(--color-neutral-200));
        border-radius: 50%;

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

      .skeleton-title {
        flex: 1;
        min-width: 0;
      }

      .skeleton-content {
        margin-bottom: 1.5rem;
      }

      .skeleton-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid var(--color-neutral-100);
      }

      .skeleton-button {
        background: var(--skeleton-bg, var(--color-neutral-200));
        border-radius: var(--radius-sm, 4px);

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
        .skeleton-card {
          border-color: var(--color-neutral-700);
          background: var(--color-neutral-800);
        }

        .skeleton-avatar,
        .skeleton-button {
          --skeleton-bg: var(--color-neutral-700);
          --skeleton-shimmer: var(--color-neutral-600);
        }

        .skeleton-actions {
          border-top-color: var(--color-neutral-700);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonCardComponent {
  /** 是否有头部 */
  @Input() public hasHeader = true;

  /** 是否有头像 */
  @Input() public hasAvatar = false;

  /** 内容行数 */
  @Input() public lines = 3;

  /** 是否有操作按钮 */
  @Input() public hasActions = false;

  /** 头像尺寸 */
  @Input() public avatarSize = 48;

  /** 操作按钮数量 */
  @Input() public actionButtonCount = 2;

  /** 操作按钮宽度 */
  @Input() public actionButtonWidth = '80px';

  /** 操作按钮高度 */
  @Input() public actionButtonHeight = '36px';

  /**
   * 生成操作按钮数组用于ngFor
   */
  get actionButtonsArray(): number[] {
    return Array(this.actionButtonCount)
      .fill(0)
      .map((_, i) => i);
  }
}
