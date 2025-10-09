import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
// import { takeUntil } from 'rxjs'; // Reserved for future use

/**
 * Defines the shape of the upload file.
 */
export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  preview?: string;
  error?: string;
}

/**
 * Represents the mobile upload component.
 */
@Component({
  selector: 'arc-mobile-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mobile-upload-container">
      <!-- Upload Header -->
      <div class="upload-header">
        <h3 class="upload-title">{{ title }}</h3>
        <p class="upload-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>

      <!-- Upload Zone -->
      <div
        class="upload-zone"
        [class.dragover]="isDragOver"
        [class.disabled]="disabled"
        (click)="triggerFileSelect()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
      >
        <div class="upload-content">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
              />
            </svg>
          </div>

          <h4 class="upload-text">
            {{ isDragOver ? 'Drop files here' : 'Tap to upload or drag files' }}
          </h4>
          <p class="upload-hint">
            {{ allowedTypes.join(', ') }} files up to {{ maxSizeMB }}MB
          </p>

          <!-- Quick Actions -->
          <div class="upload-actions">
            <button
              class="upload-btn upload-btn--camera"
              (click)="openCamera($event)"
              [disabled]="disabled"
              type="button"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z"
                />
              </svg>
              Camera
            </button>

            <button
              class="upload-btn upload-btn--files"
              (click)="triggerFileSelect($event)"
              [disabled]="disabled"
              type="button"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4Z"
                />
              </svg>
              Files
            </button>
          </div>
        </div>
      </div>

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
          <div
            class="file-item"
            *ngFor="let file of files; trackBy: trackByFileId"
            [class.uploading]="file.status === 'uploading'"
            [class.success]="file.status === 'success'"
            [class.error]="file.status === 'error'"
          >
            <!-- File Preview -->
            <div class="file-preview">
              <img
                *ngIf="file.preview"
                [src]="file.preview"
                [alt]="file.name"
                class="preview-image"
              />
              <div *ngIf="!file.preview" class="preview-placeholder">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
                  />
                </svg>
              </div>
            </div>

            <!-- File Info -->
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-details">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-status" [ngSwitch]="file.status">
                  <span *ngSwitchCase="'pending'" class="status pending"
                    >Pending</span
                  >
                  <span *ngSwitchCase="'uploading'" class="status uploading">
                    Uploading {{ file.progress }}%
                  </span>
                  <span *ngSwitchCase="'success'" class="status success"
                    >Complete</span
                  >
                  <span *ngSwitchCase="'error'" class="status error">{{
                    file.error || 'Error'
                  }}</span>
                </span>
              </div>

              <!-- Progress Bar -->
              <div class="progress-bar" *ngIf="file.status === 'uploading'">
                <div
                  class="progress-fill"
                  [style.width.%]="file.progress"
                ></div>
              </div>
            </div>

            <!-- File Actions -->
            <div class="file-actions">
              <button
                class="file-action retry"
                *ngIf="file.status === 'error'"
                (click)="retryUpload(file)"
                [attr.aria-label]="'Retry upload for ' + file.name"
                type="button"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
                </svg>
              </button>

              <button
                class="file-action remove"
                (click)="removeFile(file)"
                [attr.aria-label]="'Remove ' + file.name"
                type="button"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12Z"
                  />
                </svg>
              </button>
            </div>
          </div>
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
            <span class="stat-value">{{ formatFileSize(totalSize) }}</span>
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
          {{ hasUploading ? 'Uploading...' : 'Upload All' }}
        </button>
      </div>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        [multiple]="multiple"
        [accept]="acceptedMimeTypes"
        (change)="onFileSelect($event)"
        style="display: none;"
      />

      <!-- Hidden Camera Input -->
      <input
        #cameraInput
        type="file"
        accept="image/*"
        capture="environment"
        (change)="onCameraCapture($event)"
        style="display: none;"
      />
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

      .upload-zone {
        border: 2px dashed #dee2e6;
        border-radius: 12px;
        padding: 32px 20px;
        text-align: center;
        background: #f8f9fa;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-bottom: 24px;

        &:active {
          transform: scale(0.98);
        }

        &.dragover {
          border-color: #3498db;
          background: rgba(52, 152, 219, 0.05);

          .upload-icon {
            color: #3498db;
            transform: scale(1.1);
          }
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          pointer-events: none;
        }

        .upload-content {
          .upload-icon {
            color: #95a5a6;
            margin-bottom: 16px;
            transition: all 0.3s ease;
          }

          .upload-text {
            font-size: 16px;
            font-weight: 500;
            color: #2c3e50;
            margin: 0 0 8px 0;
          }

          .upload-hint {
            font-size: 12px;
            color: #6c757d;
            margin: 0 0 20px 0;
            line-height: 1.4;
          }

          .upload-actions {
            display: flex;
            gap: 12px;
            justify-content: center;

            .upload-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 16px;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              background: white;
              color: #495057;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;

              &:active {
                transform: scale(0.96);
              }

              &--camera {
                border-color: #28a745;
                color: #28a745;

                &:active {
                  background: rgba(40, 167, 69, 0.05);
                }
              }

              &--files {
                border-color: #3498db;
                color: #3498db;

                &:active {
                  background: rgba(52, 152, 219, 0.05);
                }
              }

              &:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
              }
            }
          }
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

          .file-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            transition: all 0.2s ease;

            &.uploading {
              border-color: #3498db;
              box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
            }

            &.success {
              border-color: #28a745;
              background: rgba(40, 167, 69, 0.02);
            }

            &.error {
              border-color: #e74c3c;
              background: rgba(231, 76, 60, 0.02);
            }

            .file-preview {
              width: 48px;
              height: 48px;
              border-radius: 6px;
              overflow: hidden;
              flex-shrink: 0;
              background: #f1f3f4;
              display: flex;
              align-items: center;
              justify-content: center;

              .preview-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .preview-placeholder {
                color: #95a5a6;
              }
            }

            .file-info {
              flex: 1;
              min-width: 0;

              .file-name {
                font-size: 14px;
                font-weight: 500;
                color: #2c3e50;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }

              .file-details {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;

                .file-size {
                  color: #6c757d;
                }

                .file-status {
                  .status {
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 500;
                    font-size: 10px;

                    &.pending {
                      background: #f8f9fa;
                      color: #6c757d;
                    }

                    &.uploading {
                      background: rgba(52, 152, 219, 0.1);
                      color: #3498db;
                    }

                    &.success {
                      background: rgba(40, 167, 69, 0.1);
                      color: #28a745;
                    }

                    &.error {
                      background: rgba(231, 76, 60, 0.1);
                      color: #e74c3c;
                    }
                  }
                }
              }

              .progress-bar {
                height: 3px;
                background: #e9ecef;
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;

                .progress-fill {
                  height: 100%;
                  background: #3498db;
                  border-radius: 2px;
                  transition: width 0.3s ease;
                }
              }
            }

            .file-actions {
              display: flex;
              gap: 4px;
              flex-shrink: 0;

              .file-action {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: none;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                transition: background-color 0.2s ease;

                &.retry {
                  color: #3498db;

                  &:active {
                    background: rgba(52, 152, 219, 0.1);
                  }
                }

                &.remove {
                  color: #e74c3c;

                  &:active {
                    background: rgba(231, 76, 60, 0.1);
                  }
                }
              }
            }
          }
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

      @media (min-width: 768px) {
        .upload-zone {
          padding: 48px 32px;
        }

        .upload-actions {
          justify-content: center !important;
        }
      }
    `,
  ],
})
export class MobileUploadComponent implements OnInit, OnDestroy {
  @Input() title = 'Upload Documents';
  @Input() subtitle = 'Select or drag files to upload';
  @Input() multiple = true;
  @Input() maxSizeMB = 10;
  @Input() allowedTypes: string[] = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'];
  @Input() disabled = false;
  @Input() autoUpload = false;

  @Output() filesAdded = new EventEmitter<UploadFile[]>();
  @Output() fileRemoved = new EventEmitter<UploadFile>();
  @Output() uploadStart = new EventEmitter<UploadFile[]>();
  @Output() uploadProgress = new EventEmitter<{
    file: UploadFile;
    progress: number;
  }>();
  @Output() uploadComplete = new EventEmitter<UploadFile[]>();
  @Output() uploadError = new EventEmitter<{
    file: UploadFile;
    error: string;
  }>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInput!: ElementRef<HTMLInputElement>;

  files: UploadFile[] = [];
  isDragOver = false;
  private destroy$ = new Subject<void>();

  /**
   * Performs the accepted mime types operation.
   * @returns The string value.
   */
  get acceptedMimeTypes(): string {
    const mimeMap: { [key: string]: string[] } = {
      PDF: ['application/pdf'],
      DOC: ['application/msword'],
      DOCX: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      JPG: ['image/jpeg'],
      JPEG: ['image/jpeg'],
      PNG: ['image/png'],
      GIF: ['image/gif'],
      WEBP: ['image/webp'],
    };

    return this.allowedTypes
      .flatMap((type) => mimeMap[type.toUpperCase()] || [])
      .join(',');
  }

  /**
   * Performs the total size operation.
   * @returns The number value.
   */
  get totalSize(): number {
    return this.files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Performs the has uploading operation.
   * @returns The boolean value.
   */
  get hasUploading(): boolean {
    return this.files.some((file) => file.status === 'uploading');
  }

  /**
   * Performs the can submit operation.
   * @returns The boolean value.
   */
  get canSubmit(): boolean {
    return (
      this.files.length > 0 &&
      this.files.some(
        (file) => file.status === 'pending' || file.status === 'error',
      )
    );
  }

  /**
   * Performs the can clear all operation.
   * @returns The boolean value.
   */
  get canClearAll(): boolean {
    return this.files.length > 0 && !this.hasUploading;
  }

  /**
   * Performs the overall progress operation.
   * @returns The number value.
   */
  get overallProgress(): number {
    if (this.files.length === 0) return 0;

    const totalProgress = this.files.reduce((sum, file) => {
      if (file.status === 'success') return sum + 100;
      if (file.status === 'uploading') return sum + file.progress;
      return sum;
    }, 0);

    return Math.round(totalProgress / this.files.length);
  }

  /**
   * Performs the ng on init operation.
   * @returns The result of the operation.
   */
  ngOnInit() {
    // Handle drag events on document to prevent default browser behavior
    document.addEventListener('dragover', this.preventDefault);
    document.addEventListener('drop', this.preventDefault);
  }

  /**
   * Performs the ng on destroy operation.
   * @returns The result of the operation.
   */
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('dragover', this.preventDefault);
    document.removeEventListener('drop', this.preventDefault);
  }

  private preventDefault = (e: Event) => {
    e.preventDefault();
  };

  /**
   * Performs the on drag over operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Performs the on drag leave operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    // Only set to false if leaving the upload zone completely
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = false;
    }
  }

  /**
   * Performs the on drop operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.disabled) return;

    const files = Array.from(event.dataTransfer?.files || []);
    this.processFiles(files);
  }

  /**
   * Performs the trigger file select operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  triggerFileSelect(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (!this.disabled) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Performs the open camera operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  openCamera(event: Event) {
    event.stopPropagation();
    if (!this.disabled) {
      this.cameraInput.nativeElement.click();
    }
  }

  /**
   * Performs the on file select operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.processFiles(files);
      input.value = ''; // Reset input
    }
  }

  /**
   * Performs the on camera capture operation.
   * @param event - The event.
   * @returns The result of the operation.
   */
  onCameraCapture(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.processFiles(files);
      input.value = ''; // Reset input
    }
  }

  private processFiles(files: File[]) {
    const validFiles: UploadFile[] = [];

    for (const file of files) {
      const validation = this.validateFile(file);
      if (validation.valid) {
        const uploadFile: UploadFile = {
          id: this.generateId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'pending',
        };

        // Generate preview for images
        if (file.type.startsWith('image/')) {
          this.generatePreview(file, uploadFile);
        }

        validFiles.push(uploadFile);
      } else {
        // Show error for invalid files
        console.warn(`Invalid file ${file.name}: ${validation.error}`);
      }
    }

    if (validFiles.length > 0) {
      this.files.push(...validFiles);
      this.filesAdded.emit(validFiles);

      if (this.autoUpload) {
        this.uploadFiles(validFiles);
      }
    }
  }

  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    const maxSizeBytes = this.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${this.maxSizeMB}MB limit`,
      };
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toUpperCase();
    if (!fileExtension || !this.allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Accepted: ${this.allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  private generatePreview(file: File, uploadFile: UploadFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadFile.preview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Removes file.
   * @param file - The file.
   * @returns The result of the operation.
   */
  removeFile(file: UploadFile) {
    const index = this.files.findIndex((f) => f.id === file.id);
    if (index !== -1) {
      this.files.splice(index, 1);
      this.fileRemoved.emit(file);
    }
  }

  /**
   * Performs the clear all operation.
   * @returns The result of the operation.
   */
  clearAll() {
    if (this.canClearAll) {
      this.files = [];
    }
  }

  /**
   * Performs the retry upload operation.
   * @param file - The file.
   * @returns The result of the operation.
   */
  retryUpload(file: UploadFile) {
    file.status = 'pending';
    file.progress = 0;
    file.error = undefined;
    this.uploadFiles([file]);
  }

  /**
   * Performs the submit upload operation.
   * @returns The result of the operation.
   */
  submitUpload() {
    const pendingFiles = this.files.filter(
      (f) => f.status === 'pending' || f.status === 'error',
    );
    if (pendingFiles.length > 0) {
      this.uploadFiles(pendingFiles);
    }
  }

  private uploadFiles(files: UploadFile[]) {
    this.uploadStart.emit(files);

    files.forEach((file) => {
      file.status = 'uploading';
      file.progress = 0;

      // Simulate upload progress (replace with actual upload logic)
      this.simulateUpload(file);
    });
  }

  private simulateUpload(file: UploadFile) {
    const interval = setInterval(() => {
      file.progress += Math.random() * 15;

      if (file.progress >= 100) {
        file.progress = 100;
        file.status = 'success';
        clearInterval(interval);
        this.uploadProgress.emit({ file, progress: 100 });

        // Check if all uploads are complete
        const uploading = this.files.filter((f) => f.status === 'uploading');
        if (uploading.length === 0) {
          const completed = this.files.filter((f) => f.status === 'success');
          this.uploadComplete.emit(completed);
        }
      } else {
        this.uploadProgress.emit({ file, progress: file.progress });
      }
    }, 200);

    // Simulate occasional errors
    if (Math.random() < 0.1) {
      // 10% chance of error
      setTimeout(
        () => {
          clearInterval(interval);
          file.status = 'error';
          file.error = 'Upload failed. Please try again.';
          this.uploadError.emit({ file, error: file.error });
        },
        1000 + Math.random() * 2000,
      );
    }
  }

  /**
   * Performs the format file size operation.
   * @param bytes - The bytes.
   * @returns The string value.
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Performs the track by file id operation.
   * @param _index - The index.
   * @param file - The file.
   * @returns The string value.
   */
  trackByFileId(_index: number, file: UploadFile): string {
    return file.id;
  }
}
