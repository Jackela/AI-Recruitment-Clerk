/**
 * Advanced Upload Queue Manager
 * Handles batch processing, pause/resume, parallel optimization, and error recovery
 */

import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, Subject, interval, timer, EMPTY } from 'rxjs';
import { 
  map, 
  filter, 
  takeUntil, 
  switchMap, 
  catchError, 
  retry, 
  delay,
  concatMap,
  mergeMap,
  scan,
  debounceTime
} from 'rxjs/operators';
import { 
  UploadFile, 
  UploadSession, 
  ProcessingStep, 
  PerformanceMetrics,
  UploadEvent,
  UploadStrategy,
  ResourceUsage
} from './upload-system-architecture';

export interface QueueConfig {
  maxConcurrentUploads: number;
  maxRetries: number;
  retryDelay: number; // milliseconds
  chunkSize: number; // bytes
  timeoutDuration: number; // milliseconds
  enableParallelProcessing: boolean;
  enableAutoResume: boolean;
  enableBandwidthThrottling: boolean;
  maxBandwidth?: number; // bytes per second
  priorityLevels: UploadPriority[];
}

export interface UploadPriority {
  level: 'urgent' | 'high' | 'normal' | 'low';
  weight: number;
  maxConcurrent: number;
}

export interface QueueItem {
  id: string;
  file: File;
  sessionId: string;
  priority: UploadPriority['level'];
  status: 'queued' | 'uploading' | 'processing' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes per second
  timeRemaining: number; // milliseconds
  retryCount: number;
  errors: QueueError[];
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
  strategy: UploadStrategy;
  chunks?: UploadChunk[];
  metadata?: Record<string, any>;
}

export interface UploadChunk {
  id: string;
  index: number;
  start: number;
  end: number;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  retryCount: number;
  uploadedAt?: Date;
  checksum?: string;
}

export interface QueueError {
  timestamp: Date;
  type: 'network' | 'server' | 'client' | 'validation' | 'timeout';
  message: string;
  code?: string;
  retryable: boolean;
  details?: any;
}

export interface QueueStatistics {
  totalItems: number;
  queuedItems: number;
  uploadingItems: number;
  processingItems: number;
  completedItems: number;
  failedItems: number;
  pausedItems: number;
  averageSpeed: number; // bytes per second
  totalUploaded: number; // bytes
  totalSize: number; // bytes
  overallProgress: number; // 0-100
  estimatedTimeRemaining: number; // milliseconds
  successRate: number; // 0-1
  errorRate: number; // 0-1
}

export interface BandwidthMonitor {
  currentSpeed: number; // bytes per second
  averageSpeed: number; // bytes per second
  peakSpeed: number; // bytes per second
  samples: SpeedSample[];
  throttled: boolean;
}

export interface SpeedSample {
  timestamp: Date;
  bytesTransferred: number;
  speed: number;
}

@Injectable({
  providedIn: 'root'
})
export class UploadQueueManagerService {
  private readonly config: QueueConfig = {
    maxConcurrentUploads: 3,
    maxRetries: 3,
    retryDelay: 1000,
    chunkSize: 1024 * 1024, // 1MB
    timeoutDuration: 30000, // 30 seconds
    enableParallelProcessing: true,
    enableAutoResume: true,
    enableBandwidthThrottling: false,
    priorityLevels: [
      { level: 'urgent', weight: 100, maxConcurrent: 2 },
      { level: 'high', weight: 75, maxConcurrent: 2 },
      { level: 'normal', weight: 50, maxConcurrent: 3 },
      { level: 'low', weight: 25, maxConcurrent: 1 }
    ]
  };
  
  // Queue state
  private queue = signal<QueueItem[]>([]);
  private activeUploads = signal<Map<string, QueueItem>>(new Map());
  private pausedItems = signal<Set<string>>(new Set());
  private globalPaused = signal<boolean>(false);
  
  // Performance monitoring
  private bandwidthMonitor = signal<BandwidthMonitor>({
    currentSpeed: 0,
    averageSpeed: 0,
    peakSpeed: 0,
    samples: [],
    throttled: false
  });
  
  private resourceUsage = signal<ResourceUsage>({
    cpuUsage: 0,
    memoryUsage: 0,
    networkBandwidth: 0,
    storageUsage: 0
  });
  
  // Event streams
  private queueEvents = new Subject<UploadEvent>();
  private progressUpdates = new Subject<{ itemId: string; progress: number; speed: number }>();
  private errorEvents = new Subject<{ itemId: string; error: QueueError }>();
  private completionEvents = new Subject<{ itemId: string; result: any }>();
  
  // Control signals
  private destroy$ = new Subject<void>();
  private processQueue$ = new BehaviorSubject<boolean>(true);
  
  // Computed properties
  statistics = computed<QueueStatistics>(() => {
    const items = this.queue();
    const total = items.length;
    
    const stats = items.reduce((acc, item) => {
      acc[item.status + 'Items'] = (acc[item.status + 'Items'] || 0) + 1;
      acc.totalUploaded += item.uploadedBytes;
      acc.totalSize += item.totalBytes;
      return acc;
    }, {
      queuedItems: 0,
      uploadingItems: 0,
      processingItems: 0,
      completedItems: 0,
      failedItems: 0,
      pausedItems: 0,
      totalUploaded: 0,
      totalSize: 0
    });
    
    const completed = stats.completedItems;
    const failed = stats.failedItems;
    const overallProgress = stats.totalSize > 0 ? (stats.totalUploaded / stats.totalSize) * 100 : 0;
    const successRate = total > 0 ? completed / total : 0;
    const errorRate = total > 0 ? failed / total : 0;
    
    const activeItems = Array.from(this.activeUploads().values());
    const averageSpeed = activeItems.length > 0 
      ? activeItems.reduce((sum, item) => sum + item.speed, 0) / activeItems.length 
      : 0;
    
    const remainingBytes = stats.totalSize - stats.totalUploaded;
    const estimatedTimeRemaining = averageSpeed > 0 ? remainingBytes / averageSpeed * 1000 : 0;
    
    return {
      totalItems: total,
      queuedItems: stats.queuedItems,
      uploadingItems: stats.uploadingItems,
      processingItems: stats.processingItems,
      completedItems: stats.completedItems,
      failedItems: stats.failedItems,
      pausedItems: stats.pausedItems,
      averageSpeed,
      totalUploaded: stats.totalUploaded,
      totalSize: stats.totalSize,
      overallProgress,
      estimatedTimeRemaining,
      successRate,
      errorRate
    };
  });
  
  constructor() {
    this.initializeQueueProcessor();
    this.initializeBandwidthMonitoring();
    this.initializeResourceMonitoring();
  }
  
  // Queue Management
  addToQueue(
    files: File[], 
    sessionId: string, 
    priority: UploadPriority['level'] = 'normal',
    strategy?: UploadStrategy
  ): string[] {
    const itemIds: string[] = [];
    
    files.forEach(file => {
      const item: QueueItem = {
        id: this.generateId(),
        file,
        sessionId,
        priority,
        status: 'queued',
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        speed: 0,
        timeRemaining: 0,
        retryCount: 0,
        errors: [],
        strategy: strategy || this.getDefaultStrategy(file),
        metadata: {
          addedAt: new Date(),
          filename: file.name,
          mimeType: file.type
        }
      };
      
      // Prepare chunks for chunked uploads
      if (item.strategy.type === 'chunked') {
        item.chunks = this.createChunks(file, this.config.chunkSize);
      }
      
      itemIds.push(item.id);
      
      this.queue.update(queue => [...queue, item]);
      
      this.emitEvent({
        type: 'file-added',
        sessionId,
        fileId: item.id,
        data: { filename: file.name, size: file.size },
        timestamp: new Date()
      });
    });
    
    this.processQueue$.next(true);
    return itemIds;
  }
  
  removeFromQueue(itemId: string): boolean {
    const item = this.findQueueItem(itemId);
    if (!item) return false;
    
    // Cancel if currently uploading
    if (item.status === 'uploading') {
      this.cancelUpload(itemId);
    }
    
    this.queue.update(queue => queue.filter(item => item.id !== itemId));
    
    this.emitEvent({
      type: 'cancelled',
      sessionId: item.sessionId,
      fileId: itemId,
      data: { reason: 'removed' },
      timestamp: new Date()
    });
    
    return true;
  }
  
  clearQueue(sessionId?: string): void {
    if (sessionId) {
      const itemsToRemove = this.queue().filter(item => item.sessionId === sessionId);
      itemsToRemove.forEach(item => this.removeFromQueue(item.id));
    } else {
      // Cancel all active uploads
      this.activeUploads().forEach((_, itemId) => this.cancelUpload(itemId));
      
      this.queue.set([]);
      this.activeUploads.set(new Map());
      this.pausedItems.set(new Set());
    }
  }
  
  // Upload Control
  pauseUpload(itemId: string): boolean {
    const item = this.findQueueItem(itemId);
    if (!item || item.status !== 'uploading') return false;
    
    this.pausedItems.update(paused => new Set([...paused, itemId]));
    this.updateItemStatus(itemId, 'paused');
    
    const queueItem = this.queue().find(i => i.id === itemId);
    if (queueItem) {
      queueItem.pausedAt = new Date();
    }
    
    this.emitEvent({
      type: 'paused',
      sessionId: item.sessionId,
      fileId: itemId,
      data: { pausedAt: new Date() },
      timestamp: new Date()
    });
    
    return true;
  }
  
  resumeUpload(itemId: string): boolean {
    const item = this.findQueueItem(itemId);
    if (!item || item.status !== 'paused') return false;
    
    this.pausedItems.update(paused => {
      const newPaused = new Set(paused);
      newPaused.delete(itemId);
      return newPaused;
    });
    
    this.updateItemStatus(itemId, 'queued');
    this.processQueue$.next(true);
    
    this.emitEvent({
      type: 'resumed',
      sessionId: item.sessionId,
      fileId: itemId,
      data: { resumedAt: new Date() },
      timestamp: new Date()
    });
    
    return true;
  }
  
  cancelUpload(itemId: string): boolean {
    const item = this.findQueueItem(itemId);
    if (!item) return false;
    
    // Remove from active uploads
    this.activeUploads.update(active => {
      const newActive = new Map(active);
      newActive.delete(itemId);
      return newActive;
    });
    
    // Remove from paused items
    this.pausedItems.update(paused => {
      const newPaused = new Set(paused);
      newPaused.delete(itemId);
      return newPaused;
    });
    
    this.updateItemStatus(itemId, 'cancelled');
    
    this.emitEvent({
      type: 'cancelled',
      sessionId: item.sessionId,
      fileId: itemId,
      data: { cancelledAt: new Date() },
      timestamp: new Date()
    });
    
    return true;
  }
  
  retryUpload(itemId: string): boolean {
    const item = this.findQueueItem(itemId);
    if (!item || item.status !== 'failed') return false;
    
    // Reset item state
    this.queue.update(queue => 
      queue.map(i => 
        i.id === itemId 
          ? {
            ...i,
            status: 'queued',
            progress: 0,
            uploadedBytes: 0,
            speed: 0,
            retryCount: i.retryCount + 1,
            startedAt: undefined,
            completedAt: undefined
          }
          : i
      )
    );
    
    this.processQueue$.next(true);
    
    this.emitEvent({
      type: 'failed',
      sessionId: item.sessionId,
      fileId: itemId,
      data: { retryCount: item.retryCount + 1 },
      timestamp: new Date()
    });
    
    return true;
  }
  
  // Global Controls
  pauseAll(): void {
    this.globalPaused.set(true);
    
    // Pause all active uploads
    this.activeUploads().forEach((_, itemId) => {
      this.pauseUpload(itemId);
    });
  }
  
  resumeAll(): void {
    this.globalPaused.set(false);
    
    // Resume all paused uploads
    this.pausedItems().forEach(itemId => {
      this.resumeUpload(itemId);
    });
  }
  
  // Priority Management
  changePriority(itemId: string, priority: UploadPriority['level']): boolean {
    const item = this.findQueueItem(itemId);
    if (!item) return false;
    
    this.queue.update(queue => 
      queue.map(i => 
        i.id === itemId ? { ...i, priority } : i
      )
    );
    
    // Reprocess queue to account for new priority
    this.processQueue$.next(true);
    
    return true;
  }
  
  // Queue Processing
  private initializeQueueProcessor(): void {
    this.processQueue$
      .pipe(
        debounceTime(100),
        filter(() => !this.globalPaused()),
        switchMap(() => this.processNextItems()),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
  
  private processNextItems(): Observable<any> {
    const availableSlots = this.getAvailableUploadSlots();
    if (availableSlots <= 0) return EMPTY;
    
    const queuedItems = this.queue()
      .filter(item => item.status === 'queued')
      .sort((a, b) => this.compareByPriority(a, b))
      .slice(0, availableSlots);
    
    if (queuedItems.length === 0) return EMPTY;
    
    return from(queuedItems).pipe(
      mergeMap(item => this.startUpload(item), this.config.maxConcurrentUploads)
    );
  }
  
  private getAvailableUploadSlots(): number {
    const activeCount = this.activeUploads().size;
    return Math.max(0, this.config.maxConcurrentUploads - activeCount);
  }
  
  private compareByPriority(a: QueueItem, b: QueueItem): number {
    const aPriority = this.config.priorityLevels.find(p => p.level === a.priority)?.weight || 0;
    const bPriority = this.config.priorityLevels.find(p => p.level === b.priority)?.weight || 0;
    
    // Higher weight = higher priority
    return bPriority - aPriority;
  }
  
  private startUpload(item: QueueItem): Observable<any> {
    // Add to active uploads
    this.activeUploads.update(active => new Map(active).set(item.id, item));
    
    // Update status
    this.updateItemStatus(item.id, 'uploading');
    
    const queueItem = this.queue().find(i => i.id === item.id);
    if (queueItem) {
      queueItem.startedAt = new Date();
    }
    
    this.emitEvent({
      type: 'upload-started',
      sessionId: item.sessionId,
      fileId: item.id,
      data: { startedAt: new Date() },
      timestamp: new Date()
    });
    
    // Choose upload strategy
    switch (item.strategy.type) {
      case 'chunked':
        return this.uploadChunked(item);
      case 'streaming':
        return this.uploadStreaming(item);
      case 'batch':
        return this.uploadBatch(item);
      default:
        return this.uploadSingle(item);
    }
  }
  
  private uploadSingle(item: QueueItem): Observable<any> {
    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('sessionId', item.sessionId);
    formData.append('metadata', JSON.stringify(item.metadata));
    
    const startTime = Date.now();
    let lastProgress = 0;
    
    return this.httpUpload(formData, (progress) => {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const uploadedBytes = Math.round((progress / 100) * item.totalBytes);
      const speed = elapsedTime > 0 ? (uploadedBytes - lastProgress) / (elapsedTime / 1000) : 0;
      
      this.updateProgress(item.id, progress, speed, uploadedBytes);
      lastProgress = uploadedBytes;
    }).pipe(
      retry(this.config.maxRetries),
      catchError(error => this.handleUploadError(item, error))
    );
  }
  
  private uploadChunked(item: QueueItem): Observable<any> {
    if (!item.chunks) {
      return throwError(new Error('Chunks not prepared for chunked upload'));
    }
    
    const totalChunks = item.chunks.length;
    let completedChunks = 0;
    
    return from(item.chunks).pipe(
      concatMap(chunk => this.uploadChunk(item, chunk).pipe(
        map(() => {
          completedChunks++;
          const progress = (completedChunks / totalChunks) * 100;
          const uploadedBytes = completedChunks * this.config.chunkSize;
          
          this.updateProgress(item.id, progress, 0, uploadedBytes);
          
          return { chunkId: chunk.id, completed: true };
        }),
        retry(this.config.maxRetries),
        catchError(error => {
          chunk.status = 'failed';
          chunk.retryCount++;
          return throwError(error);
        })
      )),
      scan((acc, chunk) => ({ ...acc, [chunk.chunkId]: chunk }), {}),
      map(() => this.finalizeChunkedUpload(item))
    );
  }
  
  private uploadChunk(item: QueueItem, chunk: UploadChunk): Observable<any> {
    const chunkData = item.file.slice(chunk.start, chunk.end);
    const formData = new FormData();
    
    formData.append('chunk', chunkData);
    formData.append('chunkIndex', chunk.index.toString());
    formData.append('chunkId', chunk.id);
    formData.append('fileId', item.id);
    formData.append('sessionId', item.sessionId);
    
    chunk.status = 'uploading';
    
    return this.httpUpload(formData).pipe(
      map(() => {
        chunk.status = 'completed';
        chunk.uploadedAt = new Date();
        return chunk;
      })
    );
  }
  
  private uploadStreaming(item: QueueItem): Observable<any> {
    // Implement streaming upload
    return this.uploadSingle(item);
  }
  
  private uploadBatch(item: QueueItem): Observable<any> {
    // Implement batch upload
    return this.uploadSingle(item);
  }
  
  private httpUpload(formData: FormData, progressCallback?: (progress: number) => void): Observable<any> {
    // This would integrate with your HTTP client
    // For now, we'll simulate the upload
    return new Observable(observer => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          observer.next({ success: true });
          observer.complete();
        }
        
        if (progressCallback) {
          progressCallback(progress);
        }
      }, 100);
      
      return () => clearInterval(interval);
    }).pipe(
      delay(Math.random() * 2000 + 1000) // Simulate network delay
    );
  }
  
  private finalizeChunkedUpload(item: QueueItem): Observable<any> {
    // Send finalize request to backend
    return this.httpUpload(new FormData()).pipe(
      map(() => {
        this.completeUpload(item.id, { success: true, uploadType: 'chunked' });
        return item;
      })
    );
  }
  
  private completeUpload(itemId: string, result: any): void {
    const item = this.findQueueItem(itemId);
    if (!item) return;
    
    // Remove from active uploads
    this.activeUploads.update(active => {
      const newActive = new Map(active);
      newActive.delete(itemId);
      return newActive;
    });
    
    // Update status
    this.updateItemStatus(itemId, 'completed');
    
    const queueItem = this.queue().find(i => i.id === itemId);
    if (queueItem) {
      queueItem.completedAt = new Date();
      queueItem.progress = 100;
    }
    
    this.emitEvent({
      type: 'completed',
      sessionId: item.sessionId,
      fileId: itemId,
      data: result,
      timestamp: new Date()
    });
    
    this.completionEvents.next({ itemId, result });
    
    // Process next items
    this.processQueue$.next(true);
  }
  
  private handleUploadError(item: QueueItem, error: any): Observable<never> {
    const queueError: QueueError = {
      timestamp: new Date(),
      type: this.classifyError(error),
      message: error.message || 'Upload failed',
      code: error.code,
      retryable: this.isRetryableError(error),
      details: error
    };
    
    // Add error to item
    this.queue.update(queue => 
      queue.map(i => 
        i.id === item.id 
          ? { ...i, errors: [...i.errors, queueError] }
          : i
      )
    );
    
    // Remove from active uploads
    this.activeUploads.update(active => {
      const newActive = new Map(active);
      newActive.delete(item.id);
      return newActive;
    });
    
    // Check if should retry
    if (queueError.retryable && item.retryCount < this.config.maxRetries) {
      // Schedule retry
      timer(this.config.retryDelay * Math.pow(2, item.retryCount)).subscribe(() => {
        this.retryUpload(item.id);
      });
    } else {
      // Mark as failed
      this.updateItemStatus(item.id, 'failed');
      
      this.emitEvent({
        type: 'failed',
        sessionId: item.sessionId,
        fileId: item.id,
        data: { error: queueError },
        timestamp: new Date()
      });
    }
    
    this.errorEvents.next({ itemId: item.id, error: queueError });
    
    // Process next items
    this.processQueue$.next(true);
    
    return EMPTY;
  }
  
  private classifyError(error: any): QueueError['type'] {
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return 'network';
    }
    if (error.status >= 500) {
      return 'server';
    }
    if (error.status >= 400) {
      return 'client';
    }
    if (error.name === 'TimeoutError') {
      return 'timeout';
    }
    return 'client';
  }
  
  private isRetryableError(error: any): boolean {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'];
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    return retryableCodes.includes(error.code) || 
           retryableStatuses.includes(error.status) ||
           error.name === 'NetworkError' ||
           error.name === 'TimeoutError';
  }
  
  // Bandwidth Monitoring
  private initializeBandwidthMonitoring(): void {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateBandwidthStats();
    });
  }
  
  private updateBandwidthStats(): void {
    const activeItems = Array.from(this.activeUploads().values());
    const currentSpeed = activeItems.reduce((sum, item) => sum + item.speed, 0);
    
    this.bandwidthMonitor.update(monitor => {
      const samples = [...monitor.samples, {
        timestamp: new Date(),
        bytesTransferred: currentSpeed,
        speed: currentSpeed
      }].slice(-60); // Keep last 60 samples (1 minute)
      
      const averageSpeed = samples.length > 0 
        ? samples.reduce((sum, sample) => sum + sample.speed, 0) / samples.length 
        : 0;
      
      const peakSpeed = Math.max(monitor.peakSpeed, currentSpeed);
      
      return {
        currentSpeed,
        averageSpeed,
        peakSpeed,
        samples,
        throttled: this.config.enableBandwidthThrottling && 
                  this.config.maxBandwidth ? 
                  currentSpeed > this.config.maxBandwidth : false
      };
    });
  }
  
  // Resource Monitoring
  private initializeResourceMonitoring(): void {
    if ('performance' in window && 'memory' in (performance as any)) {
      interval(5000).pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        this.updateResourceUsage();
      });
    }
  }
  
  private updateResourceUsage(): void {
    if ('memory' in (performance as any)) {
      const memory = (performance as any).memory;
      
      this.resourceUsage.set({
        cpuUsage: 0, // Would need additional API
        memoryUsage: memory.usedJSHeapSize,
        networkBandwidth: this.bandwidthMonitor().currentSpeed,
        storageUsage: 0 // Would need Storage API
      });
    }
  }
  
  // Utility Methods
  private createChunks(file: File, chunkSize: number): UploadChunk[] {
    const chunks: UploadChunk[] = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      
      chunks.push({
        id: `${this.generateId()}_chunk_${i}`,
        index: i,
        start,
        end,
        size: end - start,
        status: 'pending',
        retryCount: 0
      });
    }
    
    return chunks;
  }
  
  private getDefaultStrategy(file: File): UploadStrategy {
    const fileSize = file.size;
    
    if (fileSize > 10 * 1024 * 1024) { // > 10MB
      return {
        id: 'chunked-large',
        name: 'Chunked Upload for Large Files',
        type: 'chunked',
        config: {
          chunkSize: this.config.chunkSize,
          maxRetries: 3,
          retryDelay: 1000,
          parallelChunks: 3,
          checksumValidation: true,
          resumable: true
        }
      };
    }
    
    return {
      id: 'single-standard',
      name: 'Single File Upload',
      type: 'single',
      config: {
        maxRetries: 3,
        retryDelay: 1000,
        checksumValidation: false,
        resumable: false
      }
    };
  }
  
  private updateProgress(itemId: string, progress: number, speed: number, uploadedBytes: number): void {
    this.queue.update(queue => 
      queue.map(item => 
        item.id === itemId 
          ? {
            ...item,
            progress,
            speed,
            uploadedBytes,
            timeRemaining: speed > 0 ? (item.totalBytes - uploadedBytes) / speed * 1000 : 0
          }
          : item
      )
    );
    
    this.progressUpdates.next({ itemId, progress, speed });
    
    this.emitEvent({
      type: 'progress-updated',
      sessionId: this.findQueueItem(itemId)?.sessionId || '',
      fileId: itemId,
      data: { progress, speed, uploadedBytes },
      timestamp: new Date()
    });
  }
  
  private updateItemStatus(itemId: string, status: QueueItem['status']): void {
    this.queue.update(queue => 
      queue.map(item => 
        item.id === itemId ? { ...item, status } : item
      )
    );
  }
  
  private findQueueItem(itemId: string): QueueItem | undefined {
    return this.queue().find(item => item.id === itemId);
  }
  
  private emitEvent(event: UploadEvent): void {
    this.queueEvents.next(event);
  }
  
  private generateId(): string {
    return Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Public API
  getQueue(): QueueItem[] {
    return this.queue();
  }
  
  getQueueItem(itemId: string): QueueItem | undefined {
    return this.findQueueItem(itemId);
  }
  
  getStatistics(): QueueStatistics {
    return this.statistics();
  }
  
  getBandwidthMonitor(): BandwidthMonitor {
    return this.bandwidthMonitor();
  }
  
  getResourceUsage(): ResourceUsage {
    return this.resourceUsage();
  }
  
  // Event Streams
  onQueueEvents(): Observable<UploadEvent> {
    return this.queueEvents.asObservable();
  }
  
  onProgressUpdates(): Observable<{ itemId: string; progress: number; speed: number }> {
    return this.progressUpdates.asObservable();
  }
  
  onErrors(): Observable<{ itemId: string; error: QueueError }> {
    return this.errorEvents.asObservable();
  }
  
  onCompletions(): Observable<{ itemId: string; result: any }> {
    return this.completionEvents.asObservable();
  }
  
  // Configuration
  updateConfig(config: Partial<QueueConfig>): void {
    Object.assign(this.config, config);
  }
  
  getConfig(): QueueConfig {
    return { ...this.config };
  }
  
  // Cleanup
  destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Cancel all active uploads
    this.activeUploads().forEach((_, itemId) => this.cancelUpload(itemId));
    
    // Clear all state
    this.queue.set([]);
    this.activeUploads.set(new Map());
    this.pausedItems.set(new Set());
  }
}
