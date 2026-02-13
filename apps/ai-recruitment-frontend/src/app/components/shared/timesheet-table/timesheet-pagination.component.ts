import { Component, Input, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * TimesheetPaginationComponent - Handles table pagination controls
 */
@Component({
  selector: 'arc-timesheet-pagination',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-pagination">
      <div class="pagination-info">
        显示 {{ startIndex() + 1 }} - {{ endIndex() }} 条，共 {{ totalItems }} 条工时记录
      </div>

      <div class="pagination-controls">
        <select
          [(ngModel)]="internalPageSize"
          (ngModelChange)="onPageSizeChange($event)"
          class="page-size-select"
        >
          <option *ngFor="let size of pageSizeOptions" [value]="size">
            {{ size }} 条/页
          </option>
        </select>

        <button (click)="firstPage()" [disabled]="currentPage === 0" class="page-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="11,17 6,12 11,7"></polyline>
            <polyline points="18,17 13,12 18,7"></polyline>
          </svg>
        </button>

        <button (click)="previousPage()" [disabled]="currentPage === 0" class="page-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
        </button>

        <span class="page-numbers">
          <button
            *ngFor="let page of pageNumbers()"
            (click)="goToPage(page)"
            [class.active]="currentPage === page"
            class="page-number"
            type="button"
          >
            {{ page + 1 }}
          </button>
        </span>

        <button (click)="nextPage()" [disabled]="currentPage === totalPages - 1" class="page-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"></polyline>
          </svg>
        </button>

        <button (click)="lastPage()" [disabled]="currentPage === totalPages - 1" class="page-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="13,17 18,12 13,7"></polyline>
            <polyline points="6,17 11,12 6,7"></polyline>
          </svg>
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./timesheet-pagination.component.scss'],
})
export class TimesheetPaginationComponent {
  @Input({ required: true }) public currentPage!: number;
  @Input({ required: true }) public pageSize!: number;
  @Input({ required: true }) public totalItems!: number;
  @Input({ required: true }) public pageSizeOptions!: number[];

  @Output() public pageChange = new EventEmitter<{ pageIndex: number; pageSize: number }>();
  @Output() public pageSizeChange = new EventEmitter<number>();

  public internalPageSize = computed(() => this.pageSize);

  public get totalPages(): number {
    return Math.ceil(this.totalItems / this.pageSize);
  }

  public startIndex = computed(() => this.currentPage * this.pageSize);

  public endIndex = computed(() => Math.min(this.startIndex() + this.pageSize, this.totalItems));

  public firstPage(): void {
    this.goToPage(0);
  }

  public previousPage(): void {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  public nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  public lastPage(): void {
    this.goToPage(this.totalPages - 1);
  }

  public goToPage(page: number): void {
    this.pageChange.emit({ pageIndex: page, pageSize: this.pageSize });
  }

  public onPageSizeChange(newSize: number): void {
    this.pageSizeChange.emit(newSize);
  }

  public pageNumbers(): number[] {
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
}
