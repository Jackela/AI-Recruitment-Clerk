import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Defines the shape of an upload file.
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
 * Result of file validation.
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Configuration for upload validation rules.
 */
export interface UploadValidationConfig {
  maxSizeMB: number;
  allowedTypes: string[];
}

/**
 * Upload progress event data.
 */
export interface UploadProgressEvent {
  file: UploadFile;
  progress: number;
}

/**
 * Upload error event data.
 */
export interface UploadErrorEvent {
  file: UploadFile;
  error: string;
}

/**
 * State of all files being managed for upload.
 */
export interface UploadState {
  files: UploadFile[];
  hasUploading: boolean;
  totalSize: number;
  overallProgress: number;
  canSubmit: boolean;
  canClearAll: boolean;
}

/**
 * Mobile upload service.
 * Handles file validation, upload simulation, and state management
 * for mobile file uploads. Extracted from MobileUploadComponent
 * for better separation of concerns and testability.
 *
 * @example
 * ```typescript
 * constructor(private uploadService: MobileUploadService) {}
 *
 * ngOnInit() {
 *   this.state$ = this.uploadService.state$;
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MobileUploadService {
  private readonly destroy$ = new Subject<void>();

  // State sources
  private readonly filesSource = new BehaviorSubject<UploadFile[]>([]);
  private readonly isUploadingSource = new BehaviorSubject<boolean>(false);

  // Public observables
  public readonly files$ = this.filesSource.asObservable();
  public readonly isUploading$ = this.isUploadingSource.asObservable();

  /**
   * Computed state observable for reactive consumption.
   */
  public readonly state$ = new BehaviorSubject<UploadState>({
    files: [],
    hasUploading: false,
    totalSize: 0,
    overallProgress: 0,
    canSubmit: false,
    canClearAll: false,
  });

  // Validation config
  private config: UploadValidationConfig = {
    maxSizeMB: 10,
    allowedTypes: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG'],
  };

  /**
   * Sets validation configuration for file uploads.
   * @param config - The validation configuration to use.
   */
  public setValidationConfig(config: UploadValidationConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current validation configuration.
   * @returns The current validation config.
   */
  public getValidationConfig(): UploadValidationConfig {
    return { ...this.config };
  }

  /**
   * Validates a single file against size and type constraints.
   * @param file - The file to validate.
   * @param config - Optional validation config to use instead of default.
   * @returns Validation result with valid flag and optional error message.
   */
  public validateFile(
    file: File,
    config?: UploadValidationConfig,
  ): FileValidationResult {
    const validationConfig = config || this.config;

    // Check file size
    const maxSizeBytes = validationConfig.maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size exceeds ${validationConfig.maxSizeMB}MB limit`,
      };
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toUpperCase();
    if (!fileExtension || !validationConfig.allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Accepted: ${validationConfig.allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Generates a unique ID for tracking upload files.
   * @returns A unique identifier string.
   */
  public generateFileId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Formats file size in bytes to human-readable string.
   * @param bytes - The file size in bytes.
   * @returns Formatted file size string (e.g., "1.5 MB").
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Gets the accepted MIME types string for file input element.
   * @param allowedTypes - Array of file type extensions.
   * @returns Comma-separated MIME types string.
   */
  public getAcceptedMimeTypes(allowedTypes: string[]): string {
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

    return allowedTypes
      .flatMap((type) => mimeMap[type.toUpperCase()] || [])
      .join(',');
  }

  /**
   * Adds new files to the upload queue.
   * @param files - Array of File objects to add.
   * @returns Array of created UploadFile objects.
   */
  public addFiles(files: File[]): UploadFile[] {
    const validFiles: UploadFile[] = [];

    for (const file of files) {
      const validation = this.validateFile(file);
      if (validation.valid) {
        const uploadFile: UploadFile = {
          id: this.generateFileId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'pending',
        };
        validFiles.push(uploadFile);
      } else {
        console.warn(`Invalid file ${file.name}: ${validation.error}`);
      }
    }

    if (validFiles.length > 0) {
      const currentFiles = this.filesSource.value;
      this.filesSource.next([...currentFiles, ...validFiles]);
      this.updateComputedState();
    }

    return validFiles;
  }

  /**
   * Removes a file from the upload queue.
   * @param fileId - The ID of the file to remove.
   * @returns True if file was found and removed.
   */
  public removeFile(fileId: string): boolean {
    const currentFiles = this.filesSource.value;
    const index = currentFiles.findIndex((f) => f.id === fileId);

    if (index !== -1) {
      const updatedFiles = [...currentFiles];
      updatedFiles.splice(index, 1);
      this.filesSource.next(updatedFiles);
      this.updateComputedState();
      return true;
    }

    return false;
  }

  /**
   * Clears all files from the upload queue.
   * @returns True if clear was performed.
   */
  public clearAllFiles(): boolean {
    const currentFiles = this.filesSource.value;
    if (currentFiles.length === 0 || this.isUploadingSource.value) {
      return false;
    }

    this.filesSource.next([]);
    this.updateComputedState();
    return true;
  }

  /**
   * Gets the current upload state snapshot.
   * @returns Current upload state.
   */
  public getStateSnapshot(): UploadState {
    return this.state$.value;
  }

  /**
   * Gets current files array.
   * @returns Array of upload files.
   */
  public getFiles(): UploadFile[] {
    return this.filesSource.value;
  }

  /**
   * Updates a file's status for retry.
   * @param fileId - The ID of the file to retry.
   * @returns True if file was found and updated.
   */
  public retryFile(fileId: string): boolean {
    const currentFiles = this.filesSource.value;
    const file = currentFiles.find((f) => f.id === fileId);

    if (file) {
      const updatedFiles = currentFiles.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending' as const, progress: 0, error: undefined }
          : f,
      );
      this.filesSource.next(updatedFiles);
      this.updateComputedState();
      return true;
    }

    return false;
  }

  /**
   * Sets file status to uploading.
   * @param fileId - The ID of the file to update.
   */
  public setFileUploading(fileId: string): void {
    const currentFiles = this.filesSource.value;
    const updatedFiles = currentFiles.map((f) =>
      f.id === fileId
        ? { ...f, status: 'uploading' as const, progress: 0 }
        : f,
    );
    this.filesSource.next(updatedFiles);
    this.isUploadingSource.next(true);
    this.updateComputedState();
  }

  /**
   * Updates file progress during upload.
   * @param fileId - The ID of the file being uploaded.
   * @param progress - The progress percentage (0-100).
   */
  public updateFileProgress(fileId: string, progress: number): void {
    const currentFiles = this.filesSource.value;
    const updatedFiles = currentFiles.map((f) =>
      f.id === fileId ? { ...f, progress } : f,
    );
    this.filesSource.next(updatedFiles);

    // Update overall progress in computed state
    this.updateComputedState();
  }

  /**
   * Marks a file as successfully uploaded.
   * @param fileId - The ID of the completed file.
   */
  public setFileSuccess(fileId: string): void {
    const currentFiles = this.filesSource.value;
    const updatedFiles = currentFiles.map((f) =>
      f.id === fileId
        ? { ...f, status: 'success' as const, progress: 100 }
        : f,
    );
    this.filesSource.next(updatedFiles);
    this.updateComputedState();

    // Check if all uploads are complete
    const stillUploading = updatedFiles.some((f) => f.status === 'uploading');
    if (!stillUploading) {
      this.isUploadingSource.next(false);
    }
  }

  /**
   * Marks a file as failed with error message.
   * @param fileId - The ID of the failed file.
   * @param error - The error message.
   */
  public setFileError(fileId: string, error: string): void {
    const currentFiles = this.filesSource.value;
    const updatedFiles = currentFiles.map((f) =>
      f.id === fileId ? { ...f, status: 'error' as const, error } : f,
    );
    this.filesSource.next(updatedFiles);
    this.updateComputedState();

    // Check if all uploads are complete (including errors)
    const stillUploading = updatedFiles.some((f) => f.status === 'uploading');
    if (!stillUploading) {
      this.isUploadingSource.next(false);
    }
  }

  /**
   * Gets files that are ready to upload (pending or error status).
   * @returns Array of files ready for upload.
   */
  public getPendingFiles(): UploadFile[] {
    return this.filesSource.value.filter(
      (f) => f.status === 'pending' || f.status === 'error',
    );
  }

  /**
   * Gets successfully uploaded files.
   * @returns Array of successfully uploaded files.
   */
  public getCompletedFiles(): UploadFile[] {
    return this.filesSource.value.filter((f) => f.status === 'success');
  }

  /**
   * Cleanup method for service destruction.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.filesSource.complete();
    this.isUploadingSource.complete();
  }

  /**
   * Updates computed state based on current files.
   */
  private updateComputedState(): void {
    const files = this.filesSource.value;
    const hasUploading = files.some((f) => f.status === 'uploading');
    const totalSize = files.reduce((total, file) => total + file.size, 0);

    let totalProgress = 0;
    if (files.length > 0) {
      totalProgress = files.reduce((sum, file) => {
        if (file.status === 'success') return sum + 100;
        if (file.status === 'uploading') return sum + file.progress;
        return sum;
      }, 0);
      totalProgress = Math.round(totalProgress / files.length);
    }

    const canSubmit =
      files.length > 0 &&
      files.some((file) => file.status === 'pending' || file.status === 'error');

    const canClearAll = files.length > 0 && !hasUploading;

    this.state$.next({
      files,
      hasUploading,
      totalSize,
      overallProgress: totalProgress,
      canSubmit,
      canClearAll,
    });
  }
}
