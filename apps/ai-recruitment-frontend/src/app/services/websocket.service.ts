import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { ToastService } from './toast.service';

export interface WebSocketMessageData {
  [key: string]: unknown;
}

export interface WebSocketMessage {
  type: 'progress' | 'step_change' | 'completed' | 'error' | 'status_update';
  sessionId: string;
  data: WebSocketMessageData;
  timestamp: Date;
}

export interface ProgressUpdate {
  progress: number;
  currentStep: string;
  message?: string;
  estimatedTimeRemaining?: number;
}

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

export interface CompletionData {
  analysisId: string;
  result: AnalysisResult;
  processingTime: number;
}

export interface ErrorData {
  error: string;
  code?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  // private reconnectAttempts = 0; // Reserved for reconnection logic
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private connectionStatus$ = new BehaviorSubject<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  private messages$ = new Subject<WebSocketMessage>();
  private destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

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
      filter(msg => msg.sessionId === sessionId),
      takeUntil(this.destroy$)
    );
  }

  /**
   * 监听特定类型的消息
   */
  onMessage(type: WebSocketMessage['type'], sessionId: string): Observable<WebSocketMessage> {
    return this.messages$.asObservable().pipe(
      filter(msg => msg.type === type && msg.sessionId === sessionId),
      takeUntil(this.destroy$)
    );
  }

  /**
   * 监听进度更新
   */
  onProgress(sessionId: string): Observable<ProgressUpdate> {
    return this.onMessage('progress', sessionId).pipe(
      filter(msg => msg.data),
      takeUntil(this.destroy$)
    ) as Observable<ProgressUpdate>;
  }

  /**
   * 监听完成事件
   */
  onCompletion(sessionId: string): Observable<CompletionData> {
    return this.onMessage('completed', sessionId).pipe(
      filter(msg => msg.data),
      takeUntil(this.destroy$)
    ) as Observable<CompletionData>;
  }

  /**
   * 监听错误事件
   */
  onError(sessionId: string): Observable<ErrorData> {
    return this.onMessage('error', sessionId).pipe(
      filter(msg => msg.data),
      takeUntil(this.destroy$)
    ) as Observable<ErrorData>;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): Observable<'connecting' | 'connected' | 'disconnected' | 'error'> {
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
    const port = window.location.hostname === 'localhost' ? ':3000' : '';
    
    return `${protocol}//${host}${port}/ws`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}