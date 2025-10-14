import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, takeUntil, map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { ToastService } from './toast.service';

/**
 * Defines the shape of the web socket message data.
 */
export interface WebSocketMessageData {
  [key: string]: unknown;
}

/**
 * Defines the shape of the web socket message.
 */
export interface WebSocketMessage {
  type: 'progress' | 'step_change' | 'completed' | 'error' | 'status_update';
  sessionId: string;
  data: WebSocketMessageData;
  timestamp: Date;
}

/**
 * Defines the shape of the progress update.
 */
export interface ProgressUpdate {
  progress: number;
  currentStep: string;
  message?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Defines the shape of the analysis result.
 */
export interface AnalysisResult {
  analysisId: string;
  score: number;
  summary: string;
  skills: string[];
  experience: {
    totalYears: number;
    positions: Array<{
      title: string;
      company: string;
      duration: string;
    }>;
  };
  strengths: string[];
  recommendations: string[];
  generatedAt: string;
}

/**
 * Defines the shape of the completion data.
 */
export interface CompletionData {
  analysisId: string;
  result: AnalysisResult;
  processingTime: number;
}

/**
 * Defines the shape of the error data.
 */
export interface ErrorData {
  error: string;
  code?: string;
}

/**
 * Defines the shape of job update events.
 */
export interface JobUpdateEvent {
  jobId: string;
  title: string;
  status: 'processing' | 'completed' | 'failed' | 'active' | 'draft' | 'closed';
  timestamp: Date;
  updatedBy?: string;
  organizationId?: string;
  metadata?: {
    confidence?: number;
    extractedKeywords?: string[];
    processingTime?: number;
    errorMessage?: string;
  };
}

/**
 * Defines the shape of job progress events.
 */
export interface JobProgressEvent {
  jobId: string;
  step: string;
  progress: number;
  message?: string;
  estimatedTimeRemaining?: number;
  timestamp: Date;
}

/**
 * Provides web socket functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  // private reconnectAttempts = 0; // Reserved for reconnection logic
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private connectionStatus$ = new BehaviorSubject<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  private messages$ = new Subject<WebSocketMessage>();
  private jobUpdates$ = new Subject<JobUpdateEvent>();
  private jobProgress$ = new Subject<JobProgressEvent>();
  private destroy$ = new Subject<void>();

  private toastService = inject(ToastService);

  /**
   * 连接到WebSocket服务器
   */
  connect(sessionId: string): Observable<WebSocketMessage> {
    this.disconnect(); // 确保没有现有连接

    this.connectionStatus$.next('connecting');

    try {
      this.socket = io(this.getSocketUrl(), {
        query: { sessionId },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectInterval,
      });

      this.setupSocketHandlers(sessionId);
    } catch (error) {
      this.toastService.error('网络连接失败，请检查您的网络');
      this.connectionStatus$.next('error');
    }

    return this.messages$.asObservable().pipe(
      filter((msg) => msg.sessionId === sessionId),
      takeUntil(this.destroy$),
    );
  }

  /**
   * 监听特定类型的消息
   */
  onMessage(
    type: WebSocketMessage['type'],
    sessionId: string,
  ): Observable<WebSocketMessage> {
    return this.messages$.asObservable().pipe(
      filter((msg) => msg.type === type && msg.sessionId === sessionId),
      takeUntil(this.destroy$),
    );
  }

  /**
   * 监听进度更新
   */
  onProgress(sessionId: string): Observable<ProgressUpdate> {
    return this.onMessage('progress', sessionId).pipe(
      filter((msg) => !!msg.data),
      map((msg: any) => msg.data as ProgressUpdate),
      takeUntil(this.destroy$),
    ) as Observable<ProgressUpdate>;
  }

  /**
   * 监听完成事件
   */
  onCompletion(sessionId: string): Observable<CompletionData> {
    return this.onMessage('completed', sessionId).pipe(
      filter((msg) => !!msg.data),
      map((msg: any) => msg.data as CompletionData),
      takeUntil(this.destroy$),
    ) as Observable<CompletionData>;
  }

  /**
   * 监听错误事件
   */
  onError(sessionId: string): Observable<ErrorData> {
    return this.onMessage('error', sessionId).pipe(
      filter((msg) => !!msg.data),
      map((msg: any) => msg.data as ErrorData),
      takeUntil(this.destroy$),
    ) as Observable<ErrorData>;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): Observable<
    'connecting' | 'connected' | 'disconnected' | 'error'
  > {
    return this.connectionStatus$.asObservable();
  }

  /**
   * 发送消息到服务器
   */
  sendMessage(event: string, data: WebSocketMessageData): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      // Socket not connected, skip sending
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatus$.next('disconnected');
    // this.reconnectAttempts = 0; // Property commented out
  }

  /**
   * 设置Socket事件处理器
   */
  private setupSocketHandlers(sessionId: string): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      // Socket connected
      this.connectionStatus$.next('connected');
      // this.reconnectAttempts = 0; // Property commented out

      // 订阅会话更新
      this.socket?.emit('subscribe_session', { sessionId });
    });

    this.socket.on('message', (message: WebSocketMessage) => {
      try {
        message.timestamp = new Date(message.timestamp);
        this.messages$.next(message);
      } catch (error) {
        // Silent fail - message parsing error
      }
    });

    // Listen for job-specific events
    this.socket.on(
      'job_updated',
      (eventData: { type: string; data: JobUpdateEvent; timestamp: Date }) => {
        try {
          const jobUpdate: JobUpdateEvent = {
            ...eventData.data,
            timestamp: new Date(eventData.data.timestamp),
          };
          this.jobUpdates$.next(jobUpdate);
        } catch (error) {
          console.warn('Failed to parse job_updated event:', error);
        }
      },
    );

    this.socket.on(
      'job_progress',
      (eventData: {
        type: string;
        data: JobProgressEvent;
        timestamp: Date;
      }) => {
        try {
          const jobProgress: JobProgressEvent = {
            ...eventData.data,
            timestamp: new Date(eventData.data.timestamp),
          };
          this.jobProgress$.next(jobProgress);
        } catch (error) {
          console.warn('Failed to parse job_progress event:', error);
        }
      },
    );

    this.socket.on(
      'job_subscription_confirmed',
      (data: { jobId: string; message: string; timestamp: Date }) => {
        console.log(`✅ Job subscription confirmed for job ${data.jobId}`);
      },
    );

    this.socket.on(
      'job_subscription_error',
      (data: { jobId: string; error: string; timestamp: Date }) => {
        console.error(
          `❌ Job subscription error for job ${data.jobId}: ${data.error}`,
        );
        this.toastService.error(
          `Failed to subscribe to job updates: ${data.error}`,
        );
      },
    );

    this.socket.on('disconnect', (_reason) => {
      // Socket disconnected
      this.connectionStatus$.next('disconnected');
    });

    this.socket.on('connect_error', (_error) => {
      // Connection error
      this.connectionStatus$.next('error');
    });

    this.socket.on('reconnect', (_attemptNumber) => {
      this.toastService.success('网络连接已恢复');
      this.connectionStatus$.next('connected');
    });

    this.socket.on('reconnect_error', (_error) => {
      // Reconnection error
      this.connectionStatus$.next('error');
    });
  }

  /**
   * 获取Socket.IO URL
   */
  private getSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    // Use port 8080 for app-gateway WebSocket connection
    const port = window.location.hostname === 'localhost' ? ':8080' : '';

    return `${protocol}//${host}${port}/ws`;
  }

  // Job-specific methods

  /**
   * Subscribe to updates for a specific job.
   * @param jobId - The job ID to subscribe to
   * @param organizationId - The organization ID for multi-tenant security
   */
  subscribeToJob(jobId: string, organizationId?: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('subscribe_job', { jobId, organizationId });
    } else {
      console.warn(`Cannot subscribe to job ${jobId}: WebSocket not connected`);
    }
  }

  /**
   * Unsubscribe from updates for a specific job.
   * @param jobId - The job ID to unsubscribe from
   */
  unsubscribeFromJob(jobId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unsubscribe_job', { jobId });
    }
  }

  /**
   * Listen for job status updates.
   * @param jobId - Optional job ID to filter by specific job
   * @returns Observable of job update events
   */
  onJobUpdated(jobId?: string): Observable<JobUpdateEvent> {
    return this.jobUpdates$.asObservable().pipe(
      filter((update) => (jobId ? update.jobId === jobId : true)),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Listen for job progress updates.
   * @param jobId - Optional job ID to filter by specific job
   * @returns Observable of job progress events
   */
  onJobProgress(jobId?: string): Observable<JobProgressEvent> {
    return this.jobProgress$.asObservable().pipe(
      filter((progress) => (jobId ? progress.jobId === jobId : true)),
      takeUntil(this.destroy$),
    );
  }

  /**
   * Connect to WebSocket and automatically subscribe to job updates.
   * @param sessionId - Session ID for connection
   * @param jobId - Optional job ID to automatically subscribe to
   * @param organizationId - Organization ID for multi-tenant security
   * @returns Observable of WebSocket messages
   */
  connectWithJobSubscription(
    sessionId: string,
    jobId?: string,
    organizationId?: string,
  ): Observable<WebSocketMessage> {
    const connection$ = this.connect(sessionId);

    // Auto-subscribe to job updates once connected
    if (jobId) {
      this.getConnectionStatus()
        .pipe(
          filter((status) => status === 'connected'),
          takeUntil(this.destroy$),
        )
        .subscribe(() => {
          this.subscribeToJob(jobId, organizationId);
        });
    }

    return connection$;
  }

  /**
   * Performs the ng on destroy operation.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
