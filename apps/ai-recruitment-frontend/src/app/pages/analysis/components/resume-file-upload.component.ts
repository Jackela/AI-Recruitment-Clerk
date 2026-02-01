import type {
  ElementRef} from '@angular/core';
import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  signal,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Defines the shape of the candidate info.
 */
export interface CandidateInfo {
  name: string;
  email: string;
  targetPosition: string;
  notes: string;
}

/**
 * Defines the shape of the file upload data.
 */
export interface FileUploadData {
  file: File;
  candidateInfo: CandidateInfo;
}

/**
 * Represents the resume file upload component.
 */
@Component({
  selector: 'arc-resume-file-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="resume-upload-container">
      <!-- Fantasy Header Section -->
      <header class="page-header" role="banner">
        <div class="header-content">
          <div class="header-text">
            <h1 id="page-title" class="page-title">AI智能简历分析</h1>
            <p class="page-subtitle">上传简历，获得专业的AI驱动分析报告</p>
          </div>
        </div>
      </header>

      <!-- Upload Bento Card -->
      <article class="upload-bento-card" role="main">
        <form (submit)="onSubmit($event)" class="upload-form">
          <div class="form-grid">
            <!-- Left Column: File Upload -->
            <div class="upload-column">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17,8 12,3 7,8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <h2 class="section-title">上传简历</h2>
              </div>

              <div
                class="file-drop-zone"
                [class.drag-over]="isDragOver()"
                [class.has-file]="selectedFile()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="fileInput.click()"
                role="button"
                tabindex="0"
                [attr.aria-label]="selectedFile() ? '已选择文件: ' + selectedFile()?.name : '点击或拖拽上传简历文件'"
              >
                <input
                  #fileInput
                  type="file"
                  (change)="onFileSelect($event)"
                  accept=".pdf,.doc,.docx"
                  hidden
                  aria-label="选择简历文件"
                />

                <!-- Empty State -->
                <div class="drop-content" *ngIf="!selectedFile()">
                  <div class="upload-icon-wrapper">
                    <svg
                      class="upload-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17,8 12,3 7,8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <div class="sparkle sparkle-1"></div>
                    <div class="sparkle sparkle-2"></div>
                    <div class="sparkle sparkle-3"></div>
                  </div>
                  <h3 class="drop-title">拖拽文件到这里</h3>
                  <p class="drop-text">或者 <span class="click-text">点击选择文件</span></p>
                  <div class="file-types">
                    <span class="file-badge">PDF</span>
                    <span class="file-badge">DOC</span>
                    <span class="file-badge">DOCX</span>
                  </div>
                  <p class="file-limit">最大文件大小: 10MB</p>
                </div>

                <!-- File Selected State -->
                <div class="file-selected" *ngIf="selectedFile()">
                  <div class="file-preview">
                    <svg
                      class="file-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                    </svg>
                  </div>
                  <div class="file-info">
                    <h4 class="file-name">{{ selectedFile()?.name }}</h4>
                    <p class="file-size">{{ formatFileSize(selectedFile()?.size || 0) }}</p>
                  </div>
                  <button
                    type="button"
                    (click)="removeFile($event)"
                    class="remove-btn"
                    aria-label="删除文件"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right Column: Candidate Information -->
            <div class="info-column">
              <div class="section-header">
                <div class="section-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <h2 class="section-title">候选人信息</h2>
                <span class="optional-badge">可选</span>
              </div>

              <div class="info-grid">
                <div class="input-group">
                  <label for="candidateName" class="input-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    姓名
                  </label>
                  <input
                    id="candidateName"
                    [(ngModel)]="candidateInfo.name"
                    name="candidateName"
                    placeholder="输入候选人姓名"
                    class="form-input"
                    type="text"
                  />
                </div>

                <div class="input-group">
                  <label for="candidateEmail" class="input-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    邮箱
                  </label>
                  <input
                    id="candidateEmail"
                    [(ngModel)]="candidateInfo.email"
                    name="candidateEmail"
                    type="email"
                    placeholder="输入邮箱地址"
                    class="form-input"
                  />
                </div>

                <div class="input-group full-width">
                  <label for="targetPosition" class="input-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                    目标职位
                  </label>
                  <input
                    id="targetPosition"
                    [(ngModel)]="candidateInfo.targetPosition"
                    name="targetPosition"
                    placeholder="输入目标职位，提高匹配精度"
                    class="form-input"
                  />
                </div>

                <div class="input-group full-width">
                  <label for="notes" class="input-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14,2 14,8 20,8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    备注
                  </label>
                  <textarea
                    id="notes"
                    [(ngModel)]="candidateInfo.notes"
                    name="notes"
                    rows="3"
                    placeholder="添加任何相关备注..."
                    class="form-textarea"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-section">
            <button
              type="submit"
              [disabled]="!selectedFile() || isSubmitting"
              class="btn-primary"
              [attr.aria-label]="isSubmitting ? '处理中...' : '开始AI分析'"
            >
              <svg
                *ngIf="!isSubmitting"
                class="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span *ngIf="isSubmitting" class="spinner" aria-hidden="true"></span>
              <span>{{ isSubmitting ? '处理中...' : '开始AI分析' }}</span>
            </button>
            <button
              type="button"
              (click)="onDemoClick()"
              [disabled]="isSubmitting"
              class="btn-secondary"
              aria-label="查看演示"
            >
              <svg
                class="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>查看演示</span>
            </button>
          </div>
        </form>
      </article>
    </div>
  `,
  styleUrls: ['./resume-file-upload.component.scss'],
})
export class ResumeFileUploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Input() isSubmitting = false;

  @Output() fileSubmitted = new EventEmitter<FileUploadData>();
  @Output() demoRequested = new EventEmitter<void>();
  @Output() fileValidationError = new EventEmitter<string>();

  // Component State
  selectedFile = signal<File | null>(null);
  isDragOver = signal(false);

  // Form Data
  candidateInfo: CandidateInfo = {
    name: '',
    email: '',
    targetPosition: '',
    notes: '',
  };

  // File Upload Methods
  /**
   * Performs the on drag over operation.
   * @param event - The event.
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  /**
   * Performs the on drag leave operation.
   * @param event - The event.
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  /**
   * Performs the on drop operation.
   * @param event - The event.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  /**
   * Performs the on file select operation.
   * @param event - The event.
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.fileValidationError.emit(
        '不支持的文件格式。请上传 PDF、DOC 或 DOCX 文件。',
      );
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.fileValidationError.emit('文件大小超过限制。请上传小于10MB的文件。');
      return;
    }

    this.selectedFile.set(file);
  }

  /**
   * Removes file.
   * @param event - The event.
   */
  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Performs the format file size operation.
   * @param bytes - The bytes.
   * @returns The string value.
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Performs the on submit operation.
   * @param event - The event.
   */
  onSubmit(event: Event): void {
    event.preventDefault();

    const file = this.selectedFile();
    if (!file) {
      this.fileValidationError.emit('请选择一个简历文件');
      return;
    }

    this.fileSubmitted.emit({
      file,
      candidateInfo: { ...this.candidateInfo },
    });
  }

  /**
   * Performs the on demo click operation.
   */
  onDemoClick(): void {
    this.demoRequested.emit();
  }

  /**
   * Performs the reset form operation.
   */
  resetForm(): void {
    this.selectedFile.set(null);
    this.candidateInfo = {
      name: '',
      email: '',
      targetPosition: '',
      notes: '',
    };

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }
}
