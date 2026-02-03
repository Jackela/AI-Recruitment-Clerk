import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

/**
 * Defines the shape of the realtime stats.
 */
export interface RealtimeStats {
  totalAnalyses: number;
  activeAnalyses: number;
  completedToday: number;
  averageProcessingTime: number;
  systemLoad: number;
  queueLength: number;
  errorRate: number;
  uptime: number;
  lastUpdated: Date;
}

/**
 * Defines the shape of the analysis event.
 */
export interface AnalysisEvent {
  type: 'started' | 'progress' | 'completed' | 'failed';
  analysisId: string;
  progress?: number;
  stage?: string;
  timestamp: Date;
  metadata?: {
    fileSize?: number;
    fileType?: string;
    [key: string]: unknown;
  };
}

/**
 * Defines the shape of the system metrics.
 */
export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: number;
  timestamp: Date;
}

interface WebSocketMessage {
  type: 'stats' | 'event' | 'metrics' | 'error' | 'subscribe' | 'refresh';
  payload?: unknown;
  topics?: string[];
  target?: string;
}

interface WebSocketErrorPayload {
  message?: string;
  code?: string | number;
  details?: unknown;
}

/**
 * Provides web socket stats functionality.
 */
@Injectable({
  providedIn: 'root',
})
export class WebSocketStatsService {
  // WebSocket connection
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected$ = new BehaviorSubject<boolean>(false);

  // State management
  private destroy$ = new Subject<void>();
  private stats$ = new BehaviorSubject<RealtimeStats>({
    totalAnalyses: 0,
    activeAnalyses: 0,
    completedToday: 0,
    averageProcessingTime: 0,
    systemLoad: 0,
    queueLength: 0,
    errorRate: 0,
    uptime: 0,
    lastUpdated: new Date(),
  });

  private events$ = new Subject<AnalysisEvent>();
  private metrics$ = new BehaviorSubject<SystemMetrics>({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkTraffic: 0,
    timestamp: new Date(),
  });

  // Signals for reactive access
  public stats = signal<RealtimeStats>({
    totalAnalyses: 0,
    activeAnalyses: 0,
    completedToday: 0,
    averageProcessingTime: 0,
    systemLoad: 0,
    queueLength: 0,
    errorRate: 0,
    uptime: 0,
    lastUpdated: new Date(),
  });

  public isConnected = signal(false);
  public connectionStatus = signal<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  public lastError = signal<string>('');

  // Mock data for development
  private mockMode = false;
  private mockInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initializes a new instance of the Web Socket Stats Service.
   */
  constructor() {
    // Sync BehaviorSubjects with signals
    this.stats$.subscribe((stats) => this.stats.set(stats));
    this.isConnected$.subscribe((connected) => this.isConnected.set(connected));

    // Start connection
    this.connect();

    // Setup fallback to mock data if connection fails
    setTimeout(() => {
      if (!this.isConnected()) {
        console.warn('WebSocket connection failed, using mock data');
        this.enableMockMode();
      }
    }, 5000);
  }

  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connectionStatus.set('connecting');

    try {
      // Use environment-specific WebSocket URL
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onOpen();
      };

      this.ws.onmessage = (event) => {
        this.onMessage(event);
      };

      this.ws.onclose = (event) => {
        this.onClose(event);
      };

      this.ws.onerror = (error) => {
        this.onError(error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.connectionStatus.set('error');
      this.lastError.set('连接失败');
      this.scheduleReconnect();
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // Development vs Production URLs
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return `${protocol}//${host}/ws/stats`;
    } else {
      return `${protocol}//${host}/api/ws/stats`;
    }
  }

  private onOpen(): void {
    console.log('WebSocket connected');
    this.connectionStatus.set('connected');
    this.isConnected$.next(true);
    this.reconnectAttempts = 0;
    this.lastError.set('');

    // Request initial data
    this.send({
      type: 'subscribe',
      topics: ['stats', 'events', 'metrics'],
    });
  }

  private onMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private onClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    this.connectionStatus.set('disconnected');
    this.isConnected$.next(false);

    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private onError(error: Event): void {
    console.error('WebSocket error:', error);
    this.connectionStatus.set('error');
    this.lastError.set('连接错误');
  }

  private handleMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'stats':
        this.updateStats((data.payload as Partial<RealtimeStats>) || {});
        break;
      case 'event':
        this.handleAnalysisEvent(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.payload as any as Omit<AnalysisEvent, 'timestamp'> & {
            timestamp: string | Date;
          }) ||
            ({
              timestamp: new Date().toISOString(),
              type: 'progress',
              analysisId: '',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any),
        );
        break;
      case 'metrics':
        this.updateMetrics(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.payload as Omit<SystemMetrics, 'timestamp'>) || ({} as any),
        );
        break;
      case 'error':
        this.handleServerError((data.payload as WebSocketErrorPayload) || {});
        break;
      default:
        console.warn('Unknown message type:', data.type);
    }
  }

  private updateStats(payload: Partial<RealtimeStats>): void {
    const base = this.stats$.value;
    const newStats: RealtimeStats = {
      ...base,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(payload as any),
      lastUpdated: new Date(),
    };
    this.stats$.next(newStats);
  }

  private handleAnalysisEvent(
    payload: Omit<AnalysisEvent, 'timestamp'> & { timestamp: string | Date },
  ): void {
    const event: AnalysisEvent = {
      ...payload,
      timestamp: new Date(payload.timestamp),
    };
    this.events$.next(event);

    // Update relevant stats
    const currentStats = this.stats$.value;
    const updatedStats = { ...currentStats };

    switch (event.type) {
      case 'started':
        updatedStats.activeAnalyses++;
        break;
      case 'completed':
        updatedStats.activeAnalyses = Math.max(
          0,
          updatedStats.activeAnalyses - 1,
        );
        updatedStats.completedToday++;
        break;
      case 'failed':
        updatedStats.activeAnalyses = Math.max(
          0,
          updatedStats.activeAnalyses - 1,
        );
        break;
    }

    this.stats$.next(updatedStats);
  }

  private updateMetrics(payload: Omit<SystemMetrics, 'timestamp'>): void {
    const metrics: SystemMetrics = {
      ...payload,
      timestamp: new Date(),
    };
    this.metrics$.next(metrics);
  }

  private handleServerError(payload: WebSocketErrorPayload): void {
    console.error('Server error:', payload);
    this.lastError.set(payload.message || '服务器错误');
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect();
      } else {
        console.error('Max reconnection attempts reached, enabling mock mode');
        this.enableMockMode();
      }
    }, delay);
  }

  private send(data: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Mock data for development/fallback
  private enableMockMode(): void {
    if (this.mockMode) return;

    this.mockMode = true;
    console.log('Enabling mock data mode');

    // Generate initial mock data
    this.generateMockStats();

    // Update mock data periodically
    this.mockInterval = setInterval(() => {
      this.generateMockStats();
      this.generateMockEvent();
      this.generateMockMetrics();
    }, 3000);
  }

  private generateMockStats(): void {
    const baseTime = Date.now();
    const randomVariation = (): number => Math.random() * 0.2 - 0.1; // ±10% variation

    const mockStats: RealtimeStats = {
      totalAnalyses: 1247 + Math.floor(Math.random() * 10),
      activeAnalyses: Math.max(0, 8 + Math.floor(Math.random() * 6 - 3)),
      completedToday: 89 + Math.floor(Math.random() * 5),
      averageProcessingTime: 45 + Math.floor(Math.random() * 20),
      systemLoad: Math.max(0, Math.min(100, 65 + Math.random() * 20 - 10)),
      queueLength: Math.max(0, 3 + Math.floor(Math.random() * 4 - 2)),
      errorRate: Math.max(0, Math.min(100, 2.5 + randomVariation() * 5)),
      uptime: Math.floor((baseTime - (baseTime % 86400000)) / 1000), // Seconds since midnight
      lastUpdated: new Date(),
    };

    this.stats$.next(mockStats);
  }

  private generateMockEvent(): void {
    const eventTypes: AnalysisEvent['type'][] = [
      'started',
      'progress',
      'completed',
      'failed',
    ];
    const randomType =
      eventTypes[Math.floor(Math.random() * eventTypes.length)];

    const mockEvent: AnalysisEvent = {
      type: randomType,
      analysisId: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      progress:
        randomType === 'progress' ? Math.floor(Math.random() * 100) : undefined,
      stage:
        randomType === 'progress'
          ? ['解析简历', '技能分析', '经验匹配', '生成报告'][
              Math.floor(Math.random() * 4)
            ]
          : undefined,
      timestamp: new Date(),
      metadata: {
        fileSize: Math.floor(Math.random() * 5000000),
        fileType: ['pdf', 'docx', 'doc'][Math.floor(Math.random() * 3)],
      },
    };

    this.events$.next(mockEvent);
  }

  private generateMockMetrics(): void {
    const mockMetrics: SystemMetrics = {
      cpuUsage: Math.max(0, Math.min(100, 45 + Math.random() * 30 - 15)),
      memoryUsage: Math.max(0, Math.min(100, 60 + Math.random() * 20 - 10)),
      diskUsage: Math.max(0, Math.min(100, 35 + Math.random() * 10 - 5)),
      networkTraffic: Math.floor(Math.random() * 1000000),
      timestamp: new Date(),
    };

    this.metrics$.next(mockMetrics);
  }

  // Public API
  /**
   * Retrieves stats.
   * @returns The RealtimeStats.
   */
  public getStats(): RealtimeStats {
    return this.stats$.value;
  }

  /**
   * Retrieves metrics.
   * @returns The SystemMetrics.
   */
  public getMetrics(): SystemMetrics {
    return this.metrics$.value;
  }

  /**
   * Performs the subscribe to events operation.
   * @returns The result of the operation.
   */
  public subscribeToEvents(): ReturnType<typeof this.events$.asObservable> {
    return this.events$.asObservable();
  }

  /**
   * Performs the subscribe to stats operation.
   * @returns The result of the operation.
   */
  public subscribeToStats(): ReturnType<typeof this.stats$.asObservable> {
    return this.stats$.asObservable();
  }

  /**
   * Performs the subscribe to metrics operation.
   * @returns The result of the operation.
   */
  public subscribeToMetrics(): ReturnType<typeof this.metrics$.asObservable> {
    return this.metrics$.asObservable();
  }

  // Manual refresh for fallback
  /**
   * Performs the refresh stats operation.
   */
  public refreshStats(): void {
    if (this.isConnected()) {
      this.send({ type: 'refresh', target: 'stats' });
    } else {
      this.generateMockStats();
    }
  }

  // Connection management
  /**
   * Performs the reconnect operation.
   */
  public reconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  /**
   * Performs the disconnect operation.
   */
  public disconnect(): void {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected$.next(false);
    this.connectionStatus.set('disconnected');
  }

  // Cleanup
  /**
   * Performs the destroy operation.
   */
  public destroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }

  // Development helpers
  /**
   * Performs the is mock mode operation.
   * @returns The boolean value.
   */
  public isMockMode(): boolean {
    return this.mockMode;
  }

  /**
   * Retrieves connection info.
   * @returns The { status: string; attempts: number; lastError: string; mockMode: boolean; }.
   */
  public getConnectionInfo(): {
    status: string;
    attempts: number;
    lastError: string;
    mockMode: boolean;
  } {
    return {
      status: this.connectionStatus(),
      attempts: this.reconnectAttempts,
      lastError: this.lastError(),
      mockMode: this.mockMode,
    };
  }
}
