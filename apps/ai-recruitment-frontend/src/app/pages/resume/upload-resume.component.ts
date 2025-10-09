import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GuestApiService } from '../../services/guest/guest-api.service';
import { WebSocketService } from '../../services/websocket.service';
import { ProgressTrackerComponent } from '../../components/shared/progress-tracker/progress-tracker.component';

/**
 * Represents the upload resume component.
 */
@Component({
  selector: 'arc-upload-resume',
  standalone: true,
  imports: [CommonModule, FormsModule, ProgressTrackerComponent],
  template: `
    <div class="container">
      <h2>智能简历分析</h2>

      <!-- 上传表单 -->
      <form
        (submit)="onSubmit($event)"
        *ngIf="!analysisId()"
        class="upload-form"
      >
        <div class="form-section">
          <h3>候选人信息 (可选)</h3>
          <div class="row">
            <label>
              姓名
              <input
                [(ngModel)]="candidateName"
                name="candidateName"
                placeholder="请输入候选人姓名"
              />
            </label>
            <label>
              邮箱
              <input
                [(ngModel)]="candidateEmail"
                name="candidateEmail"
                type="email"
                placeholder="请输入邮箱地址"
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              [(ngModel)]="notes"
              name="notes"
              rows="3"
              placeholder="添加任何相关备注..."
            ></textarea>
          </label>
        </div>

        <div class="form-section">
          <h3>上传简历</h3>
          <div class="file-upload">
            <input
              type="file"
              (change)="onFileChange($event)"
              accept=".pdf,.doc,.docx,.txt"
              id="resume-file"
              class="file-input"
            />
            <label for="resume-file" class="file-label">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                ></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>{{
                file ? file.name : '选择简历文件 (PDF, DOC, DOCX)'
              }}</span>
            </label>
          </div>
        </div>

        <div class="actions">
          <button type="submit" [disabled]="!file" class="primary-btn">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7,10 12,15 17,10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            开始智能分析
          </button>
          <button type="button" (click)="getDemo()" class="demo-btn">
            体验演示
          </button>
        </div>
      </form>

      <!-- 进度追踪器 -->
      <arc-progress-tracker
        *ngIf="analysisId()"
        [sessionId]="analysisId()"
        [showMessageLog]="true"
      >
      </arc-progress-tracker>

      <!-- 结果显示 -->
      <div class="results-section" *ngIf="analysisComplete()">
        <h3>分析结果</h3>
        <div class="result-actions">
          <button (click)="viewDetailedResults()" class="view-results-btn">
            查看详细结果
          </button>
          <button
            (click)="downloadReport()"
            class="download-btn"
            *ngIf="reportUrl()"
          >
            下载报告
          </button>
        </div>
      </div>

      <!-- 错误显示 -->
      <div class="error-section" *ngIf="errorMessage()" class="error">
        <h3>处理错误</h3>
        <p>{{ errorMessage() }}</p>
        <button (click)="resetAnalysis()" class="retry-btn">重新开始</button>
      </div>

      <!-- 调试输出 -->
      <details class="debug-section" *ngIf="output()">
        <summary>调试信息</summary>
        <pre class="output">{{ output() }}</pre>
      </details>
    </div>
  `,
  styles: [
    `
      .container {
        max-width: 900px;
        margin: 24px auto;
        padding: 0 1rem;
        font-family:
          system-ui,
          -apple-system,
          'Segoe UI',
          Roboto;
      }

      h2 {
        color: #111827;
        font-size: 1.875rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
      }

      .upload-form {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
      }

      .form-section {
        margin-bottom: 1.5rem;
      }

      .form-section h3 {
        color: #374151;
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 1rem;
      }

      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      label {
        display: block;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.5rem;
      }

      input,
      textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 0.2s;
      }

      input:focus,
      textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .file-upload {
        margin-top: 0.5rem;
      }

      .file-input {
        display: none;
      }

      .file-label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: #f9fafb;
      }

      .file-label:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .file-label svg {
        color: #6b7280;
      }

      .actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
      }

      .primary-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .primary-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .primary-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .demo-btn {
        background: #f3f4f6;
        color: #374151;
        border: 1px solid #d1d5db;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .demo-btn:hover {
        background: #e5e7eb;
      }

      .results-section,
      .error-section {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
      }

      .results-section h3 {
        color: #059669;
        margin-bottom: 1rem;
      }

      .error-section h3 {
        color: #dc2626;
        margin-bottom: 1rem;
      }

      .result-actions {
        display: flex;
        gap: 1rem;
      }

      .view-results-btn {
        background: linear-gradient(135deg, #059669, #047857);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .download-btn {
        background: #6366f1;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .retry-btn {
        background: #f59e0b;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .debug-section {
        margin-top: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        overflow: hidden;
      }

      .debug-section summary {
        background: #f9fafb;
        padding: 0.75rem;
        cursor: pointer;
        font-weight: 500;
        color: #6b7280;
      }

      .output {
        background: #0f172a;
        color: #e2e8f0;
        border-radius: 0;
        padding: 1rem;
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 0.875rem;
        line-height: 1.4;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      @media (max-width: 768px) {
        .container {
          padding: 0 0.5rem;
        }

        .row {
          grid-template-columns: 1fr;
        }

        .actions {
          flex-direction: column;
        }

        .result-actions {
          flex-direction: column;
        }
      }
    `,
  ],
})
export class UploadResumeComponent implements OnDestroy {
  file?: File;
  candidateName = '';
  candidateEmail = '';
  notes = '';

  analysisId = signal('');
  output = signal('');
  analysisComplete = signal(false);
  errorMessage = signal('');
  reportUrl = signal('');

  private destroy$ = new Subject<void>();

  /**
   * Initializes a new instance of the Upload Resume Component.
   * @param guestApi - The guest api.
   * @param webSocketService - The web socket service.
   */
  constructor(
    private readonly guestApi: GuestApiService,
    private readonly webSocketService: WebSocketService,
  ) {}

  /**
   * Performs the on file change operation.
   * @param ev - The ev.
   * @returns The result of the operation.
   */
  onFileChange(ev: Event) {
    const input = ev.target as HTMLInputElement;
    this.file = input.files?.[0] || undefined;
  }

  /**
   * Performs the on submit operation.
   * @param ev - The ev.
   * @returns The result of the operation.
   */
  async onSubmit(ev: Event) {
    ev.preventDefault();
    if (!this.file) {
      this.errorMessage.set('请选择一个简历文件');
      return;
    }

    this.resetState();
    this.output.set('正在上传和初始化分析...');

    this.guestApi
      .analyzeResume(
        this.file,
        this.candidateName,
        this.candidateEmail,
        this.notes,
      )
      .subscribe({
        next: (res) => {
          const sessionId = res?.data?.analysisId || '';
          this.analysisId.set(sessionId);
          this.output.set(JSON.stringify(res, null, 2));

          if (sessionId) {
            this.setupWebSocketListeners(sessionId);
          }
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            err.error?.message || err.message || '上传失败',
          );
          this.output.set(
            JSON.stringify(err.error || { message: err.message }, null, 2),
          );
        },
      });
  }

  /**
   * Retrieves demo.
   * @returns The result of the operation.
   */
  getDemo() {
    this.output.set('Fetching demo...');
    this.guestApi.getDemoAnalysis().subscribe({
      next: (res) => this.output.set(JSON.stringify(res, null, 2)),
      error: (err: HttpErrorResponse) =>
        this.output.set(
          JSON.stringify(err.error || { message: err.message }, null, 2),
        ),
    });
  }

  /**
   * Performs the setup web socket listeners operation.
   * @param sessionId - The session id.
   */
  setupWebSocketListeners(sessionId: string): void {
    // 监听完成事件
    this.webSocketService
      .onCompletion(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((completion) => {
        this.analysisComplete.set(true);
        this.reportUrl.set(((completion as any)?.result?.['reportUrl'] as string) || '');
        this.output.set(JSON.stringify(completion, null, 2));
      });

    // 监听错误事件
    this.webSocketService
      .onError(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.errorMessage.set(error.error || '分析过程中发生错误');
        this.output.set(JSON.stringify(error, null, 2));
      });
  }

  /**
   * Performs the reset state operation.
   */
  resetState(): void {
    this.analysisId.set('');
    this.analysisComplete.set(false);
    this.errorMessage.set('');
    this.reportUrl.set('');
    this.output.set('');
  }

  /**
   * Performs the reset analysis operation.
   */
  resetAnalysis(): void {
    this.resetState();
    this.webSocketService.disconnect();
  }

  /**
   * Performs the view detailed results operation.
   */
  viewDetailedResults(): void {
    // 导航到详细结果页面
    const sessionId = this.analysisId();
    if (sessionId) {
      // Navigation to results page with sessionId
      // TODO: 实现导航逻辑
    }
  }

  /**
   * Performs the download report operation.
   */
  downloadReport(): void {
    const url = this.reportUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  // 保留原有的poll方法作为备用
  /**
   * Performs the poll operation.
   * @returns The result of the operation.
   */
  poll() {
    const id = this.analysisId();
    if (!id) {
      this.output.set('Missing analysisId');
      return;
    }
    this.output.set('手动查询结果...');
    this.guestApi.getAnalysisResults(id).subscribe({
      next: (res) => this.output.set(JSON.stringify(res, null, 2)),
      error: (err: HttpErrorResponse) =>
        this.output.set(
          JSON.stringify(err.error || { message: err.message }, null, 2),
        ),
    });
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.webSocketService.disconnect();
  }
}
