import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
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
    <div class="upload-card" [@slideIn]>
      <div class="card-header">
        <h2>📄 上传简历</h2>
        <p>支持 PDF、DOC、DOCX 格式</p>
      </div>

      <form (submit)="onSubmit($event)" class="upload-form">
        <!-- File Upload Area -->
        <div
          class="file-drop-zone"
          [class.drag-over]="isDragOver()"
          [class.has-file]="selectedFile()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input
            #fileInput
            type="file"
            (change)="onFileSelect($event)"
            accept=".pdf,.doc,.docx"
            hidden
          />

          <div class="drop-content" *ngIf="!selectedFile()">
            <svg
              class="upload-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17,8 12,3 7,8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <h3>拖拽文件到这里</h3>
            <p>或者 <span class="click-text">点击选择文件</span></p>
            <div class="file-types">支持: PDF, DOC, DOCX (最大 10MB)</div>
          </div>

          <div class="file-selected" *ngIf="selectedFile()">
            <svg
              class="file-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              ></path>
              <polyline points="14,2 14,8 20,8"></polyline>
            </svg>
            <div class="file-info">
              <h4>{{ selectedFile()?.name }}</h4>
              <p>{{ formatFileSize(selectedFile()?.size || 0) }}</p>
            </div>
            <button
              type="button"
              (click)="removeFile($event)"
              class="remove-btn"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Candidate Information -->
        <div class="info-section">
          <h3>候选人信息 (可选)</h3>
          <div class="info-grid">
            <div class="input-group">
              <label for="candidateName">姓名</label>
              <input
                id="candidateName"
                [(ngModel)]="candidateInfo.name"
                name="candidateName"
                placeholder="输入候选人姓名"
                class="form-input"
              />
            </div>
            <div class="input-group">
              <label for="candidateEmail">邮箱</label>
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
              <label for="targetPosition">职位匹配 (可选)</label>
              <input
                id="targetPosition"
                [(ngModel)]="candidateInfo.targetPosition"
                name="targetPosition"
                placeholder="输入目标职位，提高匹配精度"
                class="form-input"
              />
            </div>
            <div class="input-group full-width">
              <label for="notes">备注</label>
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

        <!-- Action Buttons -->
        <div class="action-section">
          <button
            type="submit"
            [disabled]="!selectedFile() || isSubmitting"
            class="primary-btn"
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M9 11l3 3 8-8"></path>
            </svg>
            {{ isSubmitting ? '处理中...' : '开始AI分析' }}
          </button>
          <button
            type="button"
            (click)="onDemoClick()"
            [disabled]="isSubmitting"
            class="secondary-btn"
          >
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polygon points="5,3 19,12 5,21"></polygon>
            </svg>
            查看演示
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['../unified-analysis.component.css'],
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
