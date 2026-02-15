import type { OnInit, OnDestroy ,
  ElementRef} from '@angular/core';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { MobileUploadService } from '../../services/mobile/mobile-upload.service';

/**
 * Mobile upload zone component.
 * Handles drag-and-drop zone, file selection, and camera capture UI.
 * Extracted from MobileUploadComponent for separation of concerns.
 */
@Component({
  selector: 'arc-mobile-upload-zone',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="upload-zone"
      [class.dragover]="isDragOver"
      [class.disabled]="disabled"
      (click)="triggerFileSelect()"
      (keydown.enter)="triggerFileSelect()"
      (keydown.space)="triggerFileSelect()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
      tabindex="0"
      role="button"
      [attr.aria-label]="'Upload zone. Press enter or space to select files'"
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
          {{ isDragOver ? 'Drop files here' : placeholderText }}
        </h4>
        <p class="upload-hint">
          {{ allowedTypes.join(', ') }} files up to {{ maxSizeMB }}MB
        </p>

        <!-- Quick Actions -->
        <div class="upload-actions" *ngIf="showActions">
          <button
            class="upload-btn upload-btn--camera"
            (click)="openCamera($event)"
            [disabled]="disabled"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4Z"
              />
            </svg>
            Files
          </button>
        </div>
      </div>
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
  `,
  styles: [
    `
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
export class MobileUploadZoneComponent implements OnInit, OnDestroy {
  @Input() public placeholderText = 'Tap to upload or drag files';
  @Input() public multiple = true;
  @Input() public maxSizeMB = 10;
  @Input() public allowedTypes: string[] = ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'];
  @Input() public disabled = false;
  @Input() public showActions = true;

  @Output() public filesSelected = new EventEmitter<File[]>();

  @ViewChild('fileInput') public fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') public cameraInput!: ElementRef<HTMLInputElement>;

  public isDragOver = false;
  private readonly destroy$ = new Subject<void>();

  private readonly uploadService = inject(MobileUploadService);

  /**
   * Accepted MIME types for file input.
   */
  public get acceptedMimeTypes(): string {
    return this.uploadService.getAcceptedMimeTypes(this.allowedTypes);
  }

  /**
   * Initialize drag event prevention.
   */
  public ngOnInit(): void {
    document.addEventListener('dragover', this.preventDefault);
    document.addEventListener('drop', this.preventDefault);
  }

  /**
   * Clean up event listeners.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('dragover', this.preventDefault);
    document.removeEventListener('drop', this.preventDefault);
  }

  private preventDefault = (e: Event): void => {
    e.preventDefault();
  };

  /**
   * Handle drag over event.
   */
  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event.
   */
  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      this.isDragOver = false;
    }
  }

  /**
   * Handle drop event.
   */
  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (this.disabled) return;

    const files = Array.from(event.dataTransfer?.files || []);
    this.emitFiles(files);
  }

  /**
   * Trigger file input click.
   */
  public triggerFileSelect(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.disabled) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Open camera input.
   */
  public openCamera(event: Event): void {
    event.stopPropagation();
    if (!this.disabled) {
      this.cameraInput.nativeElement.click();
    }
  }

  /**
   * Handle file selection from input.
   */
  public onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.emitFiles(files);
      input.value = '';
    }
  }

  /**
   * Handle camera capture.
   */
  public onCameraCapture(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      this.emitFiles(files);
      input.value = '';
    }
  }

  /**
   * Emit selected files to parent component.
   */
  private emitFiles(files: File[]): void {
    this.filesSelected.emit(files);
  }
}
