import type { OnInit } from '@angular/core';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import type { ReportListItem } from '../../../store/reports/report.model';

@Component({
  selector: 'arc-reports-placeholder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="reports-page">
      <header class="reports-header">
        <div>
          <h2>报告</h2>
          <p>{{ totalCount() }} 份报告</p>
        </div>
        <button type="button" class="refresh-button" (click)="loadReports()">
          刷新
        </button>
      </header>

      <form class="filters" (submit)="applyFilters($event)">
        <label>
          Job ID
          <input
            name="jobId"
            [(ngModel)]="jobIdFilter"
            placeholder="按职位筛选"
          />
        </label>
        <label>
          Analysis ID
          <input
            name="analysisId"
            [(ngModel)]="analysisIdFilter"
            placeholder="按分析筛选"
          />
        </label>
        <label>
          状态
          <select name="status" [(ngModel)]="statusFilter">
            <option value="">全部</option>
            <option value="generated">已生成</option>
            <option value="draft">草稿</option>
            <option value="archived">已归档</option>
          </select>
        </label>
        <button type="submit">筛选</button>
      </form>

      <div class="state" *ngIf="isLoading()">正在加载报告...</div>
      <div class="state error" *ngIf="errorMessage()">
        {{ errorMessage() }}
      </div>

      <div class="empty-state" *ngIf="!isLoading() && reports().length === 0">
        暂无报告
      </div>

      <div class="table-wrap" *ngIf="reports().length > 0">
        <table>
          <thead>
            <tr>
              <th>候选人</th>
              <th>职位</th>
              <th>分数</th>
              <th>摘要</th>
              <th>生成时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let report of reports(); trackBy: trackByReportId">
              <td>{{ report.candidateName }}</td>
              <td>{{ report.jobTitle || report.jobId || '-' }}</td>
              <td>{{ report.matchScore }}</td>
              <td>{{ report.oneSentenceSummary }}</td>
              <td>{{ formatDate(report.generatedAt) }}</td>
              <td class="actions">
                <button type="button" (click)="download(report, 'pdf')">
                  PDF
                </button>
                <button type="button" (click)="download(report, 'excel')">
                  Excel
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .reports-page {
        display: grid;
        gap: 16px;
        padding: 24px;
      }

      .reports-header,
      .filters {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      h2 {
        margin: 0;
        font-size: 24px;
      }

      p {
        margin: 4px 0 0;
        color: #64748b;
      }

      label {
        display: grid;
        gap: 4px;
        font-size: 13px;
        color: #475569;
      }

      input,
      select {
        min-width: 180px;
        height: 36px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0 10px;
        background: #fff;
      }

      button {
        height: 36px;
        border: 1px solid #2563eb;
        border-radius: 6px;
        padding: 0 12px;
        background: #2563eb;
        color: #fff;
        cursor: pointer;
      }

      .refresh-button,
      .actions button {
        background: #fff;
        color: #2563eb;
      }

      .table-wrap {
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 760px;
      }

      th,
      td {
        padding: 12px;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f8fafc;
        font-size: 12px;
        color: #475569;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      .state,
      .empty-state {
        padding: 24px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #475569;
      }

      .error {
        border-color: #fecaca;
        color: #b91c1c;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPlaceholderComponent implements OnInit {
  public readonly reports = signal<ReportListItem[]>([]);
  public readonly totalCount = signal(0);
  public readonly isLoading = signal(false);
  public readonly errorMessage = signal('');

  public jobIdFilter = '';
  public analysisIdFilter = '';
  public statusFilter = '';

  private readonly apiService = inject(ApiService);

  public ngOnInit(): void {
    this.loadReports();
  }

  public loadReports(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.apiService
      .getReports({
        jobId: this.jobIdFilter,
        analysisId: this.analysisIdFilter,
        status: this.statusFilter,
      })
      .subscribe({
        next: (response) => {
          this.reports.set(response.reports);
          this.totalCount.set(response.totalCount);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('报告加载失败，请稍后重试');
          this.isLoading.set(false);
        },
      });
  }

  public applyFilters(event: Event): void {
    event.preventDefault();
    this.loadReports();
  }

  public download(report: ReportListItem, format: 'pdf' | 'excel'): void {
    window.open(`/api/reports/${report.id}/download?format=${format}`, '_blank');
  }

  public formatDate(value: Date | string): string {
    return new Date(value).toLocaleString();
  }

  public trackByReportId(_index: number, report: ReportListItem): string {
    return report.id;
  }
}
