import type { OnInit, OnDestroy } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { MobileUploadZoneComponent } from './mobile-upload-zone.component';
import { MobileUploadFileItemComponent } from './mobile-upload-file-item.component';
import type {
  UploadFile,
  UploadProgressEvent,
  UploadErrorEvent,
} from '../../services/mobile/mobile-upload.service';
import { MobileUploadService } from '../../services/mobile/mobile-upload.service';

/**
 * Mobile upload component.
 * Orchestrates file upload functionality with validation,
 * progress tracking, and UI management. Delegates business logic
 * to MobileUploadService and UI rendering to child components.
 */
@Component({
  selector: 'arc-mobile-upload',
  standalone: true,
  imports: [CommonModule, MobileUploadZoneComponent, MobileUploadFileItemComponent],
  template: `
    <div class="mobile-upload-container">
      <!-- Upload Header -->
      <div class="upload-header">
        <h3 class="upload-title">{{ title }}</h3>
        <p class="upload-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <!-- Upload Zone (delegated to child component) -->
      <arc-mobile-upload-zone
        [placeholderText]="zonePlaceholder"
        [multiple]="multiple"
        [maxSizeMB]="maxSizeMB"
        [allowedTypes]="allowedTypes"
        [disabled]="disabled || hasUploading"
        [showActions]="showActions"
        (filesSelected)="onFilesSelected($event)"
      />

      <!-- File List -->
      <div class="upload-list" *ngIf="files.length > 0">
        <h4 class="list-title">
          Uploaded Files ({{ files.length }})
          <button
            class="clear-all"
            *ngIf="canClearAll"
            (click)="clearAll()"
            type="button"
          >
            Clear All
          </button>
        </h4>

        <div class="file-items">
          <arc-mobile-upload-file-item
            *ngFor="let file of files; trackBy: trackByFileId"
            [file]="file"
            (retry)="onRetryUpload(file)"
            (remove)="onRemoveFile(file)"
          />
        </div>
      </div>

      <!-- Upload Summary -->
      <div class="upload-summary" *ngIf="files.length > 0">
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Total:</span>
            <span class="stat-value">{{ files.length }} files</span>
          </div>
          <div class="stat">
            <span class="stat-label">Size:</span>
            <span class="stat-value">{{ formattedTotalSize }}</span>
          </div>
          <div class="stat" *ngIf="hasUploading">
            <span class="stat-label">Progress:</span>
            <span class="stat-value">{{ overallProgress }}%</span>
          </div>
        </div>

        <button
          class="upload-submit"
          *ngIf="canSubmit"
          (click)="submitUpload()"
          [disabled]="disabled || hasUploading"
          type="button"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            *ngIf="!hasUploading"
          >
            <path
              d="M9,16.17L4.83,12L3.41,13.41L9,19L21,7L19.59,5.59L9,16.17Z"
            />
          </svg>
          <div class="spinner" *ngIf="hasUploading"></div>
          {{ hasUploading ? 'Uploading...' : submitText }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .mobile-upload-container {
        width: 100%;
        max-width: 100%;
      }

      .upload-header {
        margin-bottom: 20px;
        text-align: center;

        .upload-title {
          font-size: 20px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 8px 0;
        }

        .upload-subtitle {
          font-size: 14px;
          color: #6c757d;
          margin: 0;
          line-height: 1.4;
        }
      }

      .upload-list {
        margin-bottom: 24px;

        .list-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 600;
          color: #2c3e50;
          margin: 0 0 16px 0;

          .clear-all {
            font-size: 12px;
            font-weight: 500;
            color: #e74c3c;
            background: none;
            border: none;
            cursor: pointer;
            text-decoration: underline;

            &:active {
              opacity: 0.7;
            }
          }
        }

        .file-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      }

      .upload-summary {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;

        .summary-stats {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;

          .stat {
            text-align: center;

            .stat-label {
              display: block;
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 2px;
            }

            .stat-value {
              font-size: 14px;
              font-weight: 600;
              color: #2c3e50;
            }
          }
        }

        .upload-submit {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 24px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;

          &:active:not(:disabled) {
            background: #2980b9;
            transform: scale(0.98);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
          }

          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class MobileUploadComponent implements OnInit, OnDestroy {
  @Input() public title = 'Upload Documents';
  @Input() public subtitle = 'Select or drag files to upload';
  @Input() public zonePlaceholder = 'Tap to upload or drag files';
  @Input() public submitText = 'Upload All';
  @Input() public multiple = true;
  @Input() public maxSizeMB = 10;
  @Input() public allowedTypes: string[] = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'];
  @Input() public disabled = false;
  @Input() public autoUpload = false;
  @Input() public showActions = true;

  @Output() public filesAdded = new EventEmitter<UploadFile[]>();
  @Output() public fileRemoved = new EventEmitter<UploadFile>();
  @Output() public uploadStart = new EventEmitter<UploadFile[]>();
  @Output() public uploadProgress = new EventEmitter<UploadProgressEvent>();
  @Output() public uploadComplete = new EventEmitter<UploadFile[]>();
  @Output() public uploadError = new EventEmitter<UploadErrorEvent>();

  private readonly destroy$ = new Subject<void>();
  private readonly uploadService = inject(MobileUploadService);

  // State from service (for template binding)
  public files: UploadFile[] = [];
  public hasUploading = false;
  public overallProgress = 0;
  public canSubmit = false;
  public canClearAll = false;

  /**
   * Initialize component and subscribe to service state.
   */
  public ngOnInit(): void {
    // Configure service with component inputs
    this.uploadService.setValidationConfig({
      maxSizeMB: this.maxSizeMB,
      allowedTypes: this.allowedTypes,
    });

    // Subscribe to service state changes
    this.uploadService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.files = state.files;
        this.hasUploading = state.hasUploading;
        this.overallProgress = state.overallProgress;
        this.canSubmit = state.canSubmit;
        this.canClearAll = state.canClearAll;
      });
  }

  /**
   * Clean up subscriptions.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle files selected from upload zone.
   */
  public onFilesSelected(files: File[]): void {
    const addedFiles = this.uploadService.addFiles(files);
    if (addedFiles.length > 0) {
      this.filesAdded.emit(addedFiles);

      if (this.autoUpload) {
        this.startUpload(addedFiles);
      }
    }
  }

  /**
   * Handle file removal.
   */
  public onRemoveFile(file: UploadFile): void {
    if (this.uploadService.removeFile(file.id)) {
      this.fileRemoved.emit(file);
    }
  }

  /**
   * Handle file retry.
   */
  public onRetryUpload(file: UploadFile): void {
    this.uploadService.retryFile(file.id);
    this.startUpload([file]);
  }

  /**
   * Clear all files.
   */
  public clearAll(): void {
    if (this.uploadService.clearAllFiles()) {
      this.files = [];
    }
  }

  /**
   * Submit all pending files for upload.
   */
  public submitUpload(): void {
    const pendingFiles = this.uploadService.getPendingFiles();
    if (pendingFiles.length > 0) {
      this.startUpload(pendingFiles);
    }
  }

  /**
   * Get formatted total size for display.
   */
  public get formattedTotalSize(): string {
    const state = this.uploadService.getStateSnapshot();
    return this.uploadService.formatFileSize(state.totalSize);
  }

  /**
   * Start upload process for given files.
   */
  private startUpload(files: UploadFile[]): void {
    this.uploadStart.emit(files);

    for (const file of files) {
      this.uploadService.setFileUploading(file.id);
      this.simulateUpload(file);
    }
  }

  /**
   * Simulate upload with progress tracking.
   * In production, this would make actual API calls.
   */
  private simulateUpload(file: UploadFile): void {
    const interval = setInterval(() => {
      const currentProgress = file.progress + Math.random() * 15;

      if (currentProgress >= 100) {
        this.uploadService.setFileSuccess(file.id);
        this.uploadProgress.emit({ file, progress: 100 });
        clearInterval(interval);

        // Check if all uploads are complete
        if (!this.uploadService.getStateSnapshot().hasUploading) {
          const completed = this.uploadService.getCompletedFiles();
          this.uploadComplete.emit(completed);
        }
      } else {
        this.uploadService.updateFileProgress(file.id, currentProgress);
        this.uploadProgress.emit({ file, progress: currentProgress });
      }
    }, 200);

    // Simulate occasional errors (10% chance)
    if (Math.random() < 0.1) {
      setTimeout(
        () => {
          clearInterval(interval);
          this.uploadService.setFileError(
            file.id,
            'Upload failed. Please try again.',
          );
          this.uploadError.emit({
            file,
            error: 'Upload failed. Please try again.',
          });
        },
        1000 + Math.random() * 2000,
      );
    }
  }

  /**
   * Track files by ID in ngFor.
   */
  public trackByFileId(_index: number, file: UploadFile): string {
    return file.id;
  }
}

/**
 * Re-export UploadFile for consumers of this component.
 */
export type { UploadFile };
