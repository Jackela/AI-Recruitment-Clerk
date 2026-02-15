import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Defines the shape of the page event.
 */
export interface PageEvent {
  pageIndex: number;
  pageSize: number;
}

/**
 * Pagination component for data table.
 * Handles page navigation, page size selection, and item count display.
 */
@Component({
  selector: 'arc-data-table-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-pagination" *ngIf="totalPages > 1">
      <div class="pagination-info">
        显示 {{ startIndex + 1 }} - {{ endIndex }} 条，共 {{ totalItems }} 条
      </div>

      <div class="pagination-controls">
        <select
          [(ngModel)]="pageSize"
          (ngModelChange)="onPageSizeChange()"
          class="page-size-select"
        >
          <option *ngFor="let size of pageSizeOptions" [value]="size">
            {{ size }} 条/页
          </option>
        </select>

        <button
          (click)="goToPage(0)"
          [disabled]="currentPage === 0"
          class="page-btn"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="11,17 6,12 11,7"></polyline>
            <polyline points="18,17 13,12 18,7"></polyline>
          </svg>
        </button>

        <button
          (click)="previousPage()"
          [disabled]="currentPage === 0"
          class="page-btn"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>

        <span class="page-numbers">
          <button
            *ngFor="let page of pageNumbers"
            (click)="goToPage(page)"
            [class.active]="currentPage === page"
            class="page-number"
            type="button"
          >
            {{ page + 1 }}
          </button>
        </span>

        <button
          (click)="nextPage()"
          [disabled]="currentPage === totalPages - 1"
          class="page-btn"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>

        <button
          (click)="goToPage(totalPages - 1)"
          [disabled]="currentPage === totalPages - 1"
          class="page-btn"
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="13,17 18,12 13,7"></polyline>
            <polyline points="6,17 11,12 6,7"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .table-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #fff;
        border-top: 1px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 12px;
      }

      .pagination-info {
        color: #6b7280;
        font-size: 14px;
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .page-size-select {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        background: #fff;
        cursor: pointer;
      }

      .page-size-select:focus {
        outline: none;
        border-color: #3b82f6;
      }

      .page-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s;
      }

      .page-btn:hover:not(:disabled) {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .page-numbers {
        display: flex;
        gap: 4px;
      }

      .page-number {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .page-number:hover {
        background: #f3f4f6;
        border-color: #9ca3af;
      }

      .page-number.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
      }
    `,
  ],
})
export class DataTablePaginationComponent {
  @Input() public totalItems = 0;
  @Input() public pageSize = 10;
  @Input() public currentPage = 0;
  @Input() public pageSizeOptions: number[] = [10, 25, 50, 100];

  @Output() public pageChange = new EventEmitter<PageEvent>();

  public get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  public get startIndex(): number {
    return this.currentPage * this.pageSize;
  }

  public get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.totalItems);
  }

  public get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];

    const maxVisible = 5;
    let start = Math.max(0, current - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible);

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  public previousPage(): void {
    if (this.currentPage > 0) {
      this.emitPageChange(this.currentPage - 1, this.pageSize);
    }
  }

  public nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.emitPageChange(this.currentPage + 1, this.pageSize);
    }
  }

  public goToPage(page: number): void {
    this.emitPageChange(page, this.pageSize);
  }

  public onPageSizeChange(): void {
    this.emitPageChange(0, this.pageSize);
  }

  private emitPageChange(pageIndex: number, pageSize: number): void {
    this.pageChange.emit({ pageIndex, pageSize });
  }
}
