import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../../../pipes/translate.pipe';

/**
 * 骨架屏表格占位符组件
 * 用于显示表格内容的加载状态
 */
@Component({
  selector: 'arc-skeleton-table',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div
      class="skeleton-table"
      role="status"
      [attr.aria-label]="'Loading table content' | translate"
    >
      <!-- Header Row -->
      <div *ngIf="hasHeader" class="skeleton-row skeleton-header">
        <div
          *ngFor="let col of columnsArray; let i = index"
          class="skeleton-cell"
          [style.width.%]="getColumnWidth(i)"
        >
          <div class="skeleton-line shimmer" style="width: 80%"></div>
        </div>
      </div>

      <!-- Data Rows -->
      <div
        *ngFor="let row of rowsArray"
        class="skeleton-row"
        [class.even]="row % 2 === 0"
      >
        <div
          *ngFor="let col of columnsArray; let i = index"
          class="skeleton-cell"
          [style.width.%]="getColumnWidth(i)"
        >
          <div
            class="skeleton-line shimmer"
            [style.width.%]="getRandomWidth(row, col)"
          ></div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .skeleton-table {
        width: 100%;
        border: 1px solid var(--color-neutral-200);
        border-radius: var(--radius-md, 8px);
        overflow: hidden;
      }

      .skeleton-row {
        display: flex;
        align-items: center;
        padding: 1rem;
        gap: 1rem;
        background: var(--color-background, #ffffff);

        &:not(:last-child) {
          border-bottom: 1px solid var(--color-neutral-100);
        }

        &.even {
          background: var(--color-neutral-50);
        }

        &.skeleton-header {
          background: var(--color-neutral-100);
          font-weight: 600;

          .skeleton-line {
            height: 1.2em;
          }
        }
      }

      .skeleton-cell {
        flex: 1;
        min-width: 60px;
      }

      .skeleton-line {
        height: 1em;
        background: var(--skeleton-bg, var(--color-neutral-200));
        border-radius: var(--radius-sm, 4px);
        min-width: 40px;

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
        .skeleton-table {
          border-color: var(--color-neutral-700);
        }

        .skeleton-row {
          background: var(--color-neutral-800);

          &:not(:last-child) {
            border-bottom-color: var(--color-neutral-700);
          }

          &.even {
            background: var(--color-neutral-750);
          }

          &.skeleton-header {
            background: var(--color-neutral-700);
          }
        }

        .skeleton-line {
          --skeleton-bg: var(--color-neutral-700);
          --skeleton-shimmer: var(--color-neutral-600);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonTableComponent {
  /** 行数 */
  @Input() public rows = 5;

  /** 列数 */
  @Input() public columns = 4;

  /** 是否有表头 */
  @Input() public hasHeader = true;

  /** 列宽配置，百分比数组 */
  @Input() public columnWidths: number[] = [];

  /**
   * 生成行数组用于ngFor
   */
  get rowsArray(): number[] {
    return Array(this.rows)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * 生成列数组用于ngFor
   */
  get columnsArray(): number[] {
    return Array(this.columns)
      .fill(0)
      .map((_, i) => i);
  }

  /**
   * 获取指定列的宽度
   * @param index 列索引
   * @returns 宽度百分比
   */
  getColumnWidth(index: number): number {
    if (this.columnWidths.length > 0) {
      return this.columnWidths[index] || 100 / this.columns;
    }
    return 100 / this.columns;
  }

  /**
   * 生成随机宽度以增加真实感
   * @param row 行索引
   * @param col 列索引
   * @returns 宽度百分比
   */
  getRandomWidth(row: number, col: number): number {
    // 使用固定算法确保SSR一致性
    const seed = (row * 100 + col * 13) % 40;
    return 60 + seed;
  }
}
