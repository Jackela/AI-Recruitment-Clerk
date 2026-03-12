import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpEvent,
  HttpEventType,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Represents a file being uploaded.
 */
export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';
  error?: string;
  chunks?: number;
  uploadedChunks?: number;
}

/**
 * Upload configuration options.
 */
export interface UploadConfig {
  maxFileSize?: number;
  maxFiles?: number;
  allowedTypes?: string[];
  chunkSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Upload state for tracking multiple files.
 */
export interface UploadState {
  files: UploadFile[];
  totalProgress: number;
  isUploading: boolean;
  completedCount: number;
  errorCount: number;
}

/**
 * Upload progress event.
 */
export interface UploadProgressEvent {
  fileId: string;
  progress: number;
  loaded: number;
  total: number;
}

/**
 * Upload result.
 */
export interface UploadResult {
  fileId: string;
  success: boolean;
  url?: string;
  error?: string;
  serverResponse?: unknown;
}

/**
 * Provides file upload functionality with support for:
 * - Progress tracking
 * - Chunked uploads
 * - Retry logic
 * - Cancel operations
 * - Multiple file uploads
 */
@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private baseUrl = environment.apiUrl;
  private uploadState = new BehaviorSubject<UploadState>({
    files: [],
    totalProgress: 0,
    isUploading: false,
    completedCount: 0,
    errorCount: 0,
  });

  private cancelSubjects = new Map<string, Subject<void>>();

  public readonly uploadState$ = this.uploadState.asObservable();

  private defaultConfig: UploadConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedTypes: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    chunkSize: 1024 * 1024, // 1MB chunks
    maxRetries: 3,
    retryDelay: 1000,
  };

  constructor(private http: HttpClient) {}

  /**
   * Upload a single file with progress tracking.
   * @param file - The file to upload
   * @param endpoint - API endpoint
   * @param additionalData - Additional form data
   * @returns Observable of upload events
   */
  public uploadFile(
    file: File,
    endpoint: string,
    additionalData?: Record<string, string>,
  ): Observable<HttpEvent<unknown>> {
    const uploadFile = this.createUploadFile(file);
    this.addFileToState(uploadFile);

    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    this.updateFileStatus(uploadFile.id, 'uploading');

    return this.http
      .post(`${this.baseUrl}${endpoint}`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progress = Math.round(
              (100 * event.loaded) / (event.total || 1),
            );
            this.updateFileProgress(uploadFile.id, progress);
          } else if (event.type === HttpEventType.Response) {
            this.updateFileStatus(uploadFile.id, 'success');
            this.updateUploadState();
          }
          return event;
        }),
        catchError((error: HttpErrorResponse) => {
          this.handleUploadError(uploadFile.id, error);
          throw error;
        }),
        finalize(() => {
          this.updateUploadState();
        }),
      );
  }

  /**
   * Upload a file in chunks for large files.
   * @param file - The file to upload
   * @param endpoint - API endpoint
   * @param config - Upload configuration
   * @returns Observable of upload results
   */
  public uploadFileChunked(
    file: File,
    endpoint: string,
    config?: UploadConfig,
  ): Observable<UploadResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const uploadFile = this.createUploadFile(file);
    uploadFile.chunks = Math.ceil(file.size / mergedConfig.chunkSize!);
    uploadFile.uploadedChunks = 0;
    this.addFileToState(uploadFile);

    const result$ = new Subject<UploadResult>();
    const cancel$ = new Subject<void>();
    this.cancelSubjects.set(uploadFile.id, cancel$);

    this.uploadChunk(uploadFile, 0, endpoint, mergedConfig, result$, cancel$);

    return result$.asObservable();
  }

  /**
   * Upload multiple files.
   * @param files - Array of files to upload
   * @param endpoint - API endpoint
   * @param additionalData - Additional form data
   * @returns Observable of upload events
   */
  public uploadMultiple(
    files: File[],
    endpoint: string,
    additionalData?: Record<string, string>,
  ): Observable<UploadResult>[] {
    return files.map((file) =>
      this.uploadFile(file, endpoint, additionalData).pipe(
        map((event) => {
          if (event.type === HttpEventType.Response) {
            return {
              fileId: file.name,
              success: true,
              serverResponse: event.body,
            };
          }
          return { fileId: file.name, success: false };
        }),
        catchError((error) => {
          return [{ fileId: file.name, success: false, error: error.message }];
        }),
      ),
    );
  }

  /**
   * Cancel an ongoing upload.
   * @param fileId - The ID of the file to cancel
   */
  public cancelUpload(fileId: string): void {
    const cancel$ = this.cancelSubjects.get(fileId);
    if (cancel$) {
      cancel$.next();
      cancel$.complete();
      this.cancelSubjects.delete(fileId);
      this.updateFileStatus(fileId, 'cancelled');
    }
  }

  /**
   * Cancel all uploads.
   */
  public cancelAllUploads(): void {
    this.cancelSubjects.forEach((cancel$, fileId) => {
      cancel$.next();
      cancel$.complete();
      this.updateFileStatus(fileId, 'cancelled');
    });
    this.cancelSubjects.clear();
  }

  /**
   * Retry a failed upload.
   * @param fileId - The ID of the file to retry
   * @param file - The file object
   * @param endpoint - API endpoint
   * @param additionalData - Additional form data
   * @returns Observable of upload events
   */
  public retryUpload(
    fileId: string,
    file: File,
    endpoint: string,
    additionalData?: Record<string, string>,
  ): Observable<HttpEvent<unknown>> {
    this.updateFileStatus(fileId, 'pending');
    this.updateFileProgress(fileId, 0);
    return this.uploadFile(file, endpoint, additionalData);
  }

  /**
   * Validate a file before upload.
   * @param file - The file to validate
   * @param config - Validation configuration
   * @returns Validation result
   */
  public validateFile(
    file: File,
    config?: UploadConfig,
  ): { valid: boolean; error?: string } {
    const mergedConfig = { ...this.defaultConfig, ...config };

    // Check file size
    if (file.size > mergedConfig.maxFileSize!) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${this.formatFileSize(mergedConfig.maxFileSize!)}`,
      };
    }

    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!mergedConfig.allowedTypes?.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${mergedConfig.allowedTypes?.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get current upload state.
   * @returns Current upload state
   */
  public getUploadState(): UploadState {
    return this.uploadState.value;
  }

  /**
   * Clear completed uploads from state.
   */
  public clearCompleted(): void {
    const currentState = this.uploadState.value;
    const activeFiles = currentState.files.filter(
      (f) => f.status === 'pending' || f.status === 'uploading',
    );
    this.uploadState.next({
      ...currentState,
      files: activeFiles,
      completedCount: 0,
    });
  }

  /**
   * Reset upload state.
   */
  public resetState(): void {
    this.cancelAllUploads();
    this.uploadState.next({
      files: [],
      totalProgress: 0,
      isUploading: false,
      completedCount: 0,
      errorCount: 0,
    });
  }

  /**
   * Create an upload file object.
   */
  private createUploadFile(file: File): UploadFile {
    return {
      id: this.generateFileId(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'pending',
    };
  }

  /**
   * Generate a unique file ID.
   */
  private generateFileId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add file to upload state.
   */
  private addFileToState(uploadFile: UploadFile): void {
    const currentState = this.uploadState.value;
    this.uploadState.next({
      ...currentState,
      files: [...currentState.files, uploadFile],
    });
  }

  /**
   * Update file progress.
   */
  private updateFileProgress(fileId: string, progress: number): void {
    const currentState = this.uploadState.value;
    const files = currentState.files.map((f) =>
      f.id === fileId ? { ...f, progress } : f,
    );
    this.uploadState.next({
      ...currentState,
      files,
    });
  }

  /**
   * Update file status.
   */
  private updateFileStatus(
    fileId: string,
    status: UploadFile['status'],
    error?: string,
  ): void {
    const currentState = this.uploadState.value;
    const files = currentState.files.map((f) =>
      f.id === fileId ? { ...f, status, error } : f,
    );
    this.uploadState.next({
      ...currentState,
      files,
    });
  }

  /**
   * Handle upload error.
   */
  private handleUploadError(fileId: string, error: HttpErrorResponse): void {
    let errorMessage = 'Upload failed';

    if (error.status === 413) {
      errorMessage = 'File too large';
    } else if (error.status === 415) {
      errorMessage = 'Unsupported file type';
    } else if (error.status === 0) {
      errorMessage = 'Network error';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    this.updateFileStatus(fileId, 'error', errorMessage);
  }

  /**
   * Update overall upload state.
   */
  private updateUploadState(): void {
    const currentState = this.uploadState.value;
    const uploadingFiles = currentState.files.filter(
      (f) => f.status === 'uploading',
    );
    const completedFiles = currentState.files.filter(
      (f) => f.status === 'success',
    );
    const errorFiles = currentState.files.filter((f) => f.status === 'error');

    let totalProgress = 0;
    if (currentState.files.length > 0) {
      totalProgress = Math.round(
        currentState.files.reduce((sum, f) => sum + f.progress, 0) /
          currentState.files.length,
      );
    }

    this.uploadState.next({
      ...currentState,
      totalProgress,
      isUploading: uploadingFiles.length > 0,
      completedCount: completedFiles.length,
      errorCount: errorFiles.length,
    });
  }

  /**
   * Upload a single chunk.
   */
  private uploadChunk(
    uploadFile: UploadFile,
    chunkIndex: number,
    endpoint: string,
    config: UploadConfig,
    result$: Subject<UploadResult>,
    cancel$: Subject<void>,
  ): void {
    if (!uploadFile.file || !uploadFile.chunks) {
      result$.error(new Error('Invalid upload file'));
      return;
    }

    const start = chunkIndex * config.chunkSize!;
    const end = Math.min(start + config.chunkSize!, uploadFile.file.size);
    const chunk = uploadFile.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('totalChunks', uploadFile.chunks.toString());
    formData.append('fileId', uploadFile.id);
    formData.append('fileName', uploadFile.name);

    this.http.post(`${this.baseUrl}${endpoint}/chunk`, formData).subscribe({
      next: (response) => {
        uploadFile.uploadedChunks = (uploadFile.uploadedChunks || 0) + 1;
        const progress = Math.round(
          (uploadFile.uploadedChunks / uploadFile.chunks!) * 100,
        );
        this.updateFileProgress(uploadFile.id, progress);

        if (uploadFile.uploadedChunks >= uploadFile.chunks!) {
          this.updateFileStatus(uploadFile.id, 'success');
          result$.next({
            fileId: uploadFile.id,
            success: true,
            serverResponse: response,
          });
          result$.complete();
        } else {
          // Upload next chunk
          this.uploadChunk(
            uploadFile,
            chunkIndex + 1,
            endpoint,
            config,
            result$,
            cancel$,
          );
        }
      },
      error: (error: HttpErrorResponse) => {
        this.handleChunkUploadError(
          uploadFile,
          chunkIndex,
          endpoint,
          config,
          result$,
          cancel$,
          error,
        );
      },
    });

    // Handle cancellation
    cancel$.subscribe(() => {
      result$.complete();
    });
  }

  /**
   * Handle chunk upload error with retry.
   */
  private handleChunkUploadError(
    uploadFile: UploadFile,
    chunkIndex: number,
    endpoint: string,
    config: UploadConfig,
    result$: Subject<UploadResult>,
    cancel$: Subject<void>,
    error: HttpErrorResponse,
    retryCount = 0,
  ): void {
    if (retryCount < config.maxRetries!) {
      setTimeout(() => {
        this.uploadChunk(
          uploadFile,
          chunkIndex,
          endpoint,
          config,
          result$,
          cancel$,
        );
      }, config.retryDelay);
    } else {
      this.handleUploadError(uploadFile.id, error);
      result$.next({
        fileId: uploadFile.id,
        success: false,
        error: error.message,
      });
      result$.complete();
    }
  }

  /**
   * Format file size to human readable string.
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
