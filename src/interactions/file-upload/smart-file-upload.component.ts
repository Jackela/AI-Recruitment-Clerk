import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { InteractionService } from '../core/interaction.service';

export interface FileUploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  category: 'resume' | 'job_description' | 'document' | 'image' | 'unknown';
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  preview?: string;
  metadata?: any;
  error?: string;
}

export interface UploadConfig {
  maxFiles: number;
  maxFileSize: number;
  acceptedTypes: string[];
  autoProcess: boolean;
  intelligentCategorization: boolean;
  batchProcessing: boolean;
}

@Component({
  selector: 'app-smart-file-upload',
  templateUrl: './smart-file-upload.component.html',
  styleUrls: ['./smart-file-upload.component.scss'],
  animations: [
    trigger('dragEnter', [
      state('inactive', style({ 
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--background-secondary)',
        transform: 'scale(1)'
      })),
      state('active', style({ 
        borderColor: 'var(--primary-500)',
        backgroundColor: 'var(--primary-50)',
        transform: 'scale(1.02)'
      })),
      transition('inactive <=> active', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),

    trigger('fileEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.9)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        )
      ]),
      transition(':leave', [
        animate('200ms ease-in-out', 
          style({ opacity: 0, transform: 'translateX(100px) scale(0.9)' })
        )
      ])
    ]),

    trigger('progressFill', [
      transition('* => *', [
        animate('300ms ease-out')
      ])
    ]),

    trigger('pulse', [
      transition('* => processing', [
        animate('1s ease-in-out', keyframes([
          style({ transform: 'scale(1)', opacity: 1, offset: 0 }),
          style({ transform: 'scale(1.05)', opacity: 0.8, offset: 0.5 }),
          style({ transform: 'scale(1)', opacity: 1, offset: 1 })
        ]))
      ])
    ])
  ]
})
export class SmartFileUploadComponent implements OnInit, OnDestroy {
  @Input() config: UploadConfig = {
    maxFiles: 10,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    acceptedTypes: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png'],
    autoProcess: true,
    intelligentCategorization: true,
    batchProcessing: true
  };

  @Input() disabled = false;
  @Input() showPreview = true;
  @Input() allowDragDrop = true;

  @Output() filesSelected = new EventEmitter<FileUploadItem[]>();
  @Output() fileProcessed = new EventEmitter<FileUploadItem>();
  @Output() batchCompleted = new EventEmitter<FileUploadItem[]>();
  @Output() error = new EventEmitter<{ file?: FileUploadItem; message: string }>();

  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dropZone', { static: true }) dropZone!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();
  private fileQueue = new BehaviorSubject<FileUploadItem[]>([]);
  private processingQueue: FileUploadItem[] = [];

  // Component state
  dragState = 'inactive';
  isDragOver = false;
  isProcessing = false;
  totalProgress = 0;

  // Intelligent suggestions
  suggestedActions: Array<{ action: string; confidence: number }> = [];
  smartCategories: string[] = [];

  constructor(private interactionService: InteractionService) {}

  ngOnInit(): void {
    this.setupDragAndDrop();
    this.setupIntelligentFeatures();
    this.monitorUploadQueue();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDragAndDrop(): void {
    if (!this.allowDragDrop || this.disabled) return;

    const dropZone = this.dropZone.nativeElement;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // Visual feedback for drag enter/leave
    dropZone.addEventListener('dragenter', () => {
      this.dragState = 'active';
      this.isDragOver = true;
    });

    dropZone.addEventListener('dragleave', (e) => {
      if (!dropZone.contains(e.relatedTarget as Node)) {
        this.dragState = 'inactive';
        this.isDragOver = false;
      }
    });

    // Handle file drop
    dropZone.addEventListener('drop', (e) => {
      this.dragState = 'inactive';
      this.isDragOver = false;
      
      const files = Array.from(e.dataTransfer?.files || []);
      this.handleFileSelection(files);
    });
  }

  private setupIntelligentFeatures(): void {
    // Set up predictive suggestions based on context
    this.interactionService.getPredictiveActions('file_upload')
      .pipe(takeUntil(this.destroy$))
      .subscribe(actions => {
        this.suggestedActions = actions.map(action => ({
          action: action.suggestion,
          confidence: action.confidence
        }));
      });

    // Update interaction context
    this.interactionService.updateInteractionState({
      currentTask: 'file_upload',
      workflowStage: 'preparation'
    });
  }

  private monitorUploadQueue(): void {
    this.fileQueue.pipe(
      takeUntil(this.destroy$),
      debounceTime(100),
      distinctUntilChanged()
    ).subscribe(files => {
      this.calculateTotalProgress(files);
      this.updateProcessingStatus(files);
    });
  }

  // Public methods
  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    this.handleFileSelection(files);
    
    // Reset input for future selections
    input.value = '';
  }

  private handleFileSelection(files: File[]): void {
    if (this.disabled) return;

    // Validate file count
    const currentFiles = this.fileQueue.value;
    const totalFiles = currentFiles.length + files.length;

    if (totalFiles > this.config.maxFiles) {
      this.error.emit({
        message: `Maximum ${this.config.maxFiles} files allowed. You selected ${files.length} additional files.`
      });
      return;
    }

    // Process each file
    const newFiles: FileUploadItem[] = [];

    files.forEach(file => {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        this.error.emit({ message: validation.error! });
        return;
      }

      const fileItem: FileUploadItem = {
        id: this.generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        category: this.categorizeFile(file),
        status: 'pending',
        progress: 0
      };

      // Generate preview if applicable
      if (this.showPreview && this.isImageFile(file)) {
        this.generatePreview(file, fileItem);
      }

      newFiles.push(fileItem);
    });

    // Add to queue
    const updatedFiles = [...currentFiles, ...newFiles];
    this.fileQueue.next(updatedFiles);
    this.filesSelected.emit(newFiles);

    // Auto-process if enabled
    if (this.config.autoProcess) {
      this.startBatchProcessing();
    }

    // Record interaction
    this.interactionService.recordInteraction('file_select', 'file_upload', true);
  }

  private validateFile(file: File): { isValid: boolean; error?: string } {
    // Size validation
    if (file.size > this.config.maxFileSize) {
      return {
        isValid: false,
        error: `File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.config.maxFileSize)}.`
      };
    }

    // Type validation
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.config.acceptedTypes.includes(fileExtension)) {
      return {
        isValid: false,
        error: `File type "${fileExtension}" is not supported. Accepted types: ${this.config.acceptedTypes.join(', ')}`
      };
    }

    return { isValid: true };
  }

  private categorizeFile(file: File): FileUploadItem['category'] {
    if (!this.config.intelligentCategorization) return 'document';

    const extension = file.name.split('.').pop()?.toLowerCase();
    const fileName = file.name.toLowerCase();

    // Intelligent categorization based on file name patterns
    if (fileName.includes('resume') || fileName.includes('cv')) {
      return 'resume';
    }

    if (fileName.includes('job') && (fileName.includes('description') || fileName.includes('posting'))) {
      return 'job_description';
    }

    // Extension-based categorization
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return fileName.includes('resume') || fileName.includes('cv') ? 'resume' : 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'unknown';
    }
  }

  private generatePreview(file: File, fileItem: FileUploadItem): void {
    if (this.isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        fileItem.preview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  private isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startBatchProcessing(): void {
    if (this.isProcessing) return;

    const files = this.fileQueue.value.filter(f => f.status === 'pending');
    if (files.length === 0) return;

    this.isProcessing = true;
    this.processingQueue = [...files];

    this.interactionService.updateInteractionState({
      workflowStage: 'processing'
    });

    if (this.config.batchProcessing) {
      this.processBatch();
    } else {
      this.processSequentially();
    }
  }

  private async processBatch(): Promise<void> {
    const batchPromises = this.processingQueue.map(file => this.processFile(file));
    
    try {
      await Promise.all(batchPromises);
      this.completeBatchProcessing();
    } catch (error) {
      this.handleProcessingError(error);
    }
  }

  private async processSequentially(): Promise<void> {
    for (const file of this.processingQueue) {
      try {
        await this.processFile(file);
      } catch (error) {
        this.handleFileError(file, error);
      }
    }
    this.completeBatchProcessing();
  }

  private async processFile(fileItem: FileUploadItem): Promise<void> {
    return new Promise((resolve, reject) => {
      // Update status
      this.updateFileStatus(fileItem.id, 'uploading');

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 95) {
          clearInterval(interval);
          this.updateFileProgress(fileItem.id, 95);
          
          // Switch to processing
          this.updateFileStatus(fileItem.id, 'processing');
          
          // Simulate processing time
          setTimeout(() => {
            this.updateFileStatus(fileItem.id, 'completed');
            this.updateFileProgress(fileItem.id, 100);
            this.fileProcessed.emit(fileItem);
            resolve();
          }, 1000 + Math.random() * 2000);
        } else {
          this.updateFileProgress(fileItem.id, progress);
        }
      }, 200);
    });
  }

  private completeBatchProcessing(): void {
    this.isProcessing = false;
    const completedFiles = this.fileQueue.value.filter(f => f.status === 'completed');
    this.batchCompleted.emit(completedFiles);

    this.interactionService.updateInteractionState({
      workflowStage: 'completed'
    });

    this.interactionService.recordInteraction('batch_complete', 'file_upload', true);
  }

  private handleProcessingError(error: any): void {
    this.isProcessing = false;
    this.error.emit({ message: 'Batch processing failed: ' + error.message });
  }

  private handleFileError(fileItem: FileUploadItem, error: any): void {
    this.updateFileStatus(fileItem.id, 'error');
    fileItem.error = error.message;
    this.error.emit({ file: fileItem, message: error.message });
  }

  private updateFileStatus(fileId: string, status: FileUploadItem['status']): void {
    const files = this.fileQueue.value;
    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      files[fileIndex].status = status;
      this.fileQueue.next([...files]);
    }
  }

  private updateFileProgress(fileId: string, progress: number): void {
    const files = this.fileQueue.value;
    const fileIndex = files.findIndex(f => f.id === fileId);
    if (fileIndex !== -1) {
      files[fileIndex].progress = Math.min(100, Math.max(0, progress));
      this.fileQueue.next([...files]);
    }
  }

  private calculateTotalProgress(files: FileUploadItem[]): void {
    if (files.length === 0) {
      this.totalProgress = 0;
      return;
    }

    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    this.totalProgress = totalProgress / files.length;
  }

  private updateProcessingStatus(files: FileUploadItem[]): void {
    const processingFiles = files.filter(f => 
      f.status === 'uploading' || f.status === 'processing'
    );
    this.isProcessing = processingFiles.length > 0;
  }

  // Public utility methods
  removeFile(fileId: string): void {
    const files = this.fileQueue.value.filter(f => f.id !== fileId);
    this.fileQueue.next(files);
    
    this.interactionService.recordInteraction('file_remove', 'file_upload', true);
  }

  retryFile(fileId: string): void {
    this.updateFileStatus(fileId, 'pending');
    this.updateFileProgress(fileId, 0);
    
    if (this.config.autoProcess) {
      this.startBatchProcessing();
    }
  }

  clearAll(): void {
    this.fileQueue.next([]);
    this.processingQueue = [];
    this.isProcessing = false;
    this.totalProgress = 0;
  }

  triggerFileSelect(): void {
    if (!this.disabled) {
      this.fileInput.nativeElement.click();
    }
  }

  // Utility functions
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(category: FileUploadItem['category']): string {
    const icons = {
      resume: 'description',
      job_description: 'work',
      document: 'insert_drive_file',
      image: 'image',
      unknown: 'help_outline'
    };
    return icons[category];
  }

  get files(): Observable<FileUploadItem[]> {
    return this.fileQueue.asObservable();
  }

  get hasFiles(): boolean {
    return this.fileQueue.value.length > 0;
  }

  get completedFiles(): FileUploadItem[] {
    return this.fileQueue.value.filter(f => f.status === 'completed');
  }

  get failedFiles(): FileUploadItem[] {
    return this.fileQueue.value.filter(f => f.status === 'error');
  }
}