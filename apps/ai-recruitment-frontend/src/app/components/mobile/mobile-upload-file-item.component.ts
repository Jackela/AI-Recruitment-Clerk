import type { OnInit } from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { UploadFile } from '../../services/mobile/mobile-upload.service';
import { MobileUploadService } from '../../services/mobile/mobile-upload.service';

/**
 * Mobile upload file item component.
 * Displays a single file in the upload list with preview,
 * progress, status, and actions.
 */
@Component({
  selector: 'arc-mobile-upload-file-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="file-item"
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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
          <span class="file-size">{{ formattedSize }}</span>
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
          <div class="progress-fill" [style.width.%]="file.progress"></div>
        </div>
      </div>

      <!-- File Actions -->
      <div class="file-actions">
        <button
          class="file-action retry"
          *ngIf="file.status === 'error'"
          (click)="onRetry()"
          [attr.aria-label]="'Retry upload for ' + file.name"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          </svg>
        </button>

        <button
          class="file-action remove"
          (click)="onRemove()"
          [attr.aria-label]="'Remove ' + file.name"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12Z"
            />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
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
    `,
  ],
})
export class MobileUploadFileItemComponent implements OnInit {
  @Input() public file!: UploadFile;

  @Output() public retry = new EventEmitter<UploadFile>();
  @Output() public remove = new EventEmitter<UploadFile>();

  private readonly uploadService = inject(MobileUploadService);

  public ngOnInit(): void {
    // Generate preview for images if not already present
    if (!this.file.preview && this.file.type.startsWith('image/')) {
      this.generatePreview();
    }
  }

  /**
   * Formatted file size for display.
   */
  public get formattedSize(): string {
    return this.uploadService.formatFileSize(this.file.size);
  }

  /**
   * Generate preview image for image files.
   */
  private generatePreview(): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.file.preview = e.target?.result as string;
    };
    reader.readAsDataURL(this.file.file);
  }

  /**
   * Emit retry event.
   */
  public onRetry(): void {
    this.retry.emit(this.file);
  }

  /**
   * Emit remove event.
   */
  public onRemove(): void {
    this.remove.emit(this.file);
  }
}
