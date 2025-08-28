import { Injectable, signal, computed } from '@angular/core';
import { Observable, Subject, from, of } from 'rxjs';
import { 
  map, 
  catchError, 
  tap, 
  concatMap, 
  mergeMap,
  scan,
  finalize,
  takeUntil,
  retry,
  timeout
} from 'rxjs/operators';
import { ToastService } from '../toast.service';
import { ProgressFeedbackService } from '../feedback/progress-feedback.service';

export interface BatchOperation<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete' | 'process';
  items: T[];
  action: (item: T) => Observable<any>;
  config?: BatchConfig;
}

export interface BatchConfig {
  concurrent?: number;
  chunkSize?: number;
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;
  continueOnError?: boolean;
  showProgress?: boolean;
  progressMessage?: string;
}

export interface BatchResult<T = any> {
  successful: T[];
  failed: Array<{ item: T; error: any }>;
  total: number;
  successCount: number;
  failureCount: number;
  duration: number;
}

export interface BatchProgress {
  operationId: string;
  current: number;
  total: number;
  percentage: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  message?: string;
  startTime?: Date;
  estimatedTimeRemaining?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BatchOperationsService {
  private activeOperations = new Map<string, Subject<void>>();
  private operationProgress = new Map<string, BatchProgress>();
  
  // Reactive state
  currentOperations = signal<BatchProgress[]>([]);
  isProcessing = signal(false);
  
  // Computed values
  activeOperationCount = computed(() => this.currentOperations().filter(op => op.status === 'processing').length);
  completedOperationCount = computed(() => this.currentOperations().filter(op => op.status === 'completed').length);
  failedOperationCount = computed(() => this.currentOperations().filter(op => op.status === 'failed').length);
  
  constructor(
    private toastService: ToastService,
    private progressFeedback: ProgressFeedbackService
  ) {}
  
  // Main batch operation execution
  executeBatch<T>(operation: BatchOperation<T>): Observable<BatchResult<T>> {
    const config: BatchConfig = {
      concurrent: 3,
      chunkSize: 10,
      retryCount: 2,
      retryDelay: 1000,
      timeout: 30000,
      continueOnError: true,
      showProgress: true,
      progressMessage: '正在处理批量操作',
      ...operation.config
    };
    
    const startTime = Date.now();
    const cancelSignal = new Subject<void>();
    this.activeOperations.set(operation.id, cancelSignal);
    
    // Initialize progress
    const progress: BatchProgress = {
      operationId: operation.id,
      current: 0,
      total: operation.items.length,
      percentage: 0,
      status: 'processing',
      message: config.progressMessage,
      startTime: new Date()
    };
    
    this.updateProgress(progress);
    
    if (config.showProgress) {
      this.progressFeedback.startLoading(operation.id, config.progressMessage || '处理中...');
    }
    
    // Create result accumulator
    const result: BatchResult<T> = {
      successful: [],
      failed: [],
      total: operation.items.length,
      successCount: 0,
      failureCount: 0,
      duration: 0
    };
    
    // Process items based on concurrency strategy
    const processing$ = (config.concurrent || 1) > 1
      ? this.processConcurrent(operation, config, result, progress, cancelSignal)
      : this.processSequential(operation, config, result, progress, cancelSignal);
    
    return processing$.pipe(
      finalize(() => {
        // Calculate duration
        result.duration = Date.now() - startTime;
        
        // Update final progress
        progress.status = result.failureCount === 0 ? 'completed' : 
                         result.successCount === 0 ? 'failed' : 'completed';
        progress.percentage = 100;
        this.updateProgress(progress);
        
        // Clean up
        this.activeOperations.delete(operation.id);
        
        if (config.showProgress) {
          this.progressFeedback.stopLoading(operation.id);
          
          // Show result notification
          if (result.failureCount === 0) {
            this.toastService.success(`批量操作成功：${result.successCount}/${result.total} 项已处理`);
          } else if (result.successCount === 0) {
            this.toastService.error(`批量操作失败：所有项目处理失败`);
          } else {
            this.toastService.warning(`批量操作部分成功：${result.successCount}/${result.total} 项已处理`);
          }
        }
        
        // Remove from current operations after a delay
        setTimeout(() => {
          this.removeOperation(operation.id);
        }, 5000);
      }),
      map(() => result)
    );
  }
  
  // Process items concurrently
  private processConcurrent<T>(
    operation: BatchOperation<T>,
    config: BatchConfig,
    result: BatchResult<T>,
    progress: BatchProgress,
    cancelSignal: Subject<void>
  ): Observable<BatchResult<T>> {
    const chunks = this.chunkArray(operation.items, config.chunkSize!);
    
    return from(chunks).pipe(
      mergeMap(chunk => 
        from(chunk).pipe(
          mergeMap(item => 
            this.processItem(item, operation.action, config).pipe(
              tap(processedItem => {
                if (processedItem.success) {
                  result.successful.push(processedItem.item);
                  result.successCount++;
                } else {
                  result.failed.push({ item: processedItem.item, error: processedItem.error });
                  result.failureCount++;
                }
                
                // Update progress
                progress.current++;
                progress.percentage = Math.round((progress.current / progress.total) * 100);
                progress.estimatedTimeRemaining = this.estimateTimeRemaining(progress);
                this.updateProgress(progress);
              })
            ),
            config.concurrent
          )
        )
      ),
      takeUntil(cancelSignal),
      scan((acc, _) => acc, result),
      map(() => result)
    );
  }
  
  // Process items sequentially
  private processSequential<T>(
    operation: BatchOperation<T>,
    config: BatchConfig,
    result: BatchResult<T>,
    progress: BatchProgress,
    cancelSignal: Subject<void>
  ): Observable<BatchResult<T>> {
    return from(operation.items).pipe(
      concatMap(item => 
        this.processItem(item, operation.action, config).pipe(
          tap(processedItem => {
            if (processedItem.success) {
              result.successful.push(processedItem.item);
              result.successCount++;
            } else {
              result.failed.push({ item: processedItem.item, error: processedItem.error });
              result.failureCount++;
              
              // Stop on error if configured
              if (!config.continueOnError) {
                cancelSignal.next();
              }
            }
            
            // Update progress
            progress.current++;
            progress.percentage = Math.round((progress.current / progress.total) * 100);
            progress.estimatedTimeRemaining = this.estimateTimeRemaining(progress);
            this.updateProgress(progress);
          })
        )
      ),
      takeUntil(cancelSignal),
      scan((acc, _) => acc, result),
      map(() => result)
    );
  }
  
  // Process individual item with retry logic
  private processItem<T>(
    item: T,
    action: (item: T) => Observable<any>,
    config: BatchConfig
  ): Observable<{ item: T; success: boolean; result?: any; error?: any }> {
    return action(item).pipe(
      timeout(config.timeout!),
      retry({
        count: config.retryCount!,
        delay: config.retryDelay!
      }),
      map(result => ({ item, success: true, result })),
      catchError(error => {
        console.error('Batch operation item failed:', error);
        return of({ item, success: false, error });
      })
    );
  }
  
  // Utility methods
  
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  private updateProgress(progress: BatchProgress): void {
    this.operationProgress.set(progress.operationId, progress);
    this.currentOperations.set(Array.from(this.operationProgress.values()));
    this.isProcessing.set(this.activeOperationCount() > 0);
  }
  
  private removeOperation(operationId: string): void {
    this.operationProgress.delete(operationId);
    this.currentOperations.set(Array.from(this.operationProgress.values()));
  }
  
  private estimateTimeRemaining(progress: BatchProgress): number {
    if (!progress.startTime || progress.current === 0) return 0;
    
    const elapsed = Date.now() - progress.startTime.getTime();
    const averageTimePerItem = elapsed / progress.current;
    const remainingItems = progress.total - progress.current;
    
    return Math.round(averageTimePerItem * remainingItems);
  }
  
  // Public API
  
  cancelOperation(operationId: string): void {
    const cancelSignal = this.activeOperations.get(operationId);
    if (cancelSignal) {
      cancelSignal.next();
      cancelSignal.complete();
      
      const progress = this.operationProgress.get(operationId);
      if (progress) {
        progress.status = 'cancelled';
        this.updateProgress(progress);
      }
      
      this.toastService.info('批量操作已取消');
    }
  }
  
  cancelAllOperations(): void {
    this.activeOperations.forEach((_, id) => this.cancelOperation(id));
  }
  
  getProgress(operationId: string): BatchProgress | undefined {
    return this.operationProgress.get(operationId);
  }
  
  // Batch operation helpers
  
  batchCreate<T>(
    items: T[],
    createFn: (item: T) => Observable<any>,
    config?: BatchConfig
  ): Observable<BatchResult<T>> {
    const operation: BatchOperation<T> = {
      id: `create-${Date.now()}`,
      type: 'create',
      items,
      action: createFn,
      config: {
        progressMessage: `正在创建 ${items.length} 项...`,
        ...config
      }
    };
    
    return this.executeBatch(operation);
  }
  
  batchUpdate<T>(
    items: T[],
    updateFn: (item: T) => Observable<any>,
    config?: BatchConfig
  ): Observable<BatchResult<T>> {
    const operation: BatchOperation<T> = {
      id: `update-${Date.now()}`,
      type: 'update',
      items,
      action: updateFn,
      config: {
        progressMessage: `正在更新 ${items.length} 项...`,
        ...config
      }
    };
    
    return this.executeBatch(operation);
  }
  
  batchDelete<T>(
    items: T[],
    deleteFn: (item: T) => Observable<any>,
    config?: BatchConfig
  ): Observable<BatchResult<T>> {
    const operation: BatchOperation<T> = {
      id: `delete-${Date.now()}`,
      type: 'delete',
      items,
      action: deleteFn,
      config: {
        progressMessage: `正在删除 ${items.length} 项...`,
        continueOnError: false,
        ...config
      }
    };
    
    return this.executeBatch(operation);
  }
  
  batchProcess<T>(
    items: T[],
    processFn: (item: T) => Observable<any>,
    config?: BatchConfig
  ): Observable<BatchResult<T>> {
    const operation: BatchOperation<T> = {
      id: `process-${Date.now()}`,
      type: 'process',
      items,
      action: processFn,
      config: {
        progressMessage: `正在处理 ${items.length} 项...`,
        ...config
      }
    };
    
    return this.executeBatch(operation);
  }
}