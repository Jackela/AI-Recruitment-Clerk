import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  connect, 
  NatsConnection, 
  JetStreamClient, 
  ConsumerConfig,
  StreamConfig,
  PubAck,
  StringCodec,
  RetentionPolicy,
  DiscardPolicy,
  DeliverPolicy,
  AckPolicy 
} from 'nats';

/**
 * 智能NATS路由器 - 优化代理间通信和消息路由
 * 实现智能消息去重、合并和高效状态同步
 */

export interface MessageRoute {
  pattern: string;
  priority: number;
  routingStrategy: 'round_robin' | 'load_balanced' | 'broadcast' | 'conditional';
  conditions?: {
    agentLoad?: number;
    messageType?: string[];
    urgency?: string[];
  };
  endpoints: string[];
  retryPolicy: {
    maxRetries: number;
    backoffMs: number[];
    deadLetterQueue?: string;
  };
}

export interface MessageDeduplication {
  window: number; // 去重时间窗口(ms)
  keyExtractor: (message: any) => string;
  mergeStrategy?: 'latest' | 'aggregate' | 'ignore';
}

export interface StateSync {
  key: string;
  version: number;
  data: any;
  timestamp: Date;
  checksum: string;
  agentId: string;
}

export interface RoutingMetrics {
  messagesSent: number;
  messagesDelivered: number;
  messagesDropped: number;
  averageLatency: number;
  routeHealth: Map<string, number>;
  deduplicationSavings: number;
}

@Injectable()
export class SmartNatsRouter {
  private readonly logger = new Logger(SmartNatsRouter.name);
  private connections = new Map<string, NatsConnection>();
  private jetstreams = new Map<string, JetStreamClient>();
  private routes = new Map<string, MessageRoute>();
  private deduplicationCache = new Map<string, { timestamp: number; merged: any }>();
  private stateSync = new Map<string, StateSync>();
  private metrics: RoutingMetrics = {
    messagesSent: 0,
    messagesDelivered: 0,
    messagesDropped: 0,
    averageLatency: 0,
    routeHealth: new Map(),
    deduplicationSavings: 0
  };
  
  private readonly codec = StringCodec();
  private circuitBreakers = new Map<string, {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half_open';
    threshold: number;
    timeout: number;
  }>();

  constructor(private readonly configService: ConfigService) {
    this.logger.log('🚀 SmartNatsRouter initialized');
    this.initializeDefaultRoutes();
  }

  /**
   * 初始化多连接池
   */
  async initializeConnections(): Promise<void> {
    const natsUrls = this.configService.get<string>('NATS_URLS', 'nats://localhost:4222').split(',');
    
    for (let i = 0; i < natsUrls.length; i++) {
      const url = natsUrls[i].trim();
      const connectionId = `nats_${i}`;
      
      try {
        const connection = await this.createOptimizedConnection(url, connectionId);
        this.connections.set(connectionId, connection);
        this.jetstreams.set(connectionId, connection.jetstream());
        
        this.metrics.routeHealth.set(connectionId, 1.0);
        this.logger.log(`✅ Connected to NATS: ${connectionId} (${url})`);
        
        // 设置连接监控
        this.setupConnectionMonitoring(connectionId, connection);
        
      } catch (error) {
        this.logger.error(`❌ Failed to connect to NATS: ${connectionId} (${url})`, error);
        this.metrics.routeHealth.set(connectionId, 0.0);
      }
    }

    // 初始化流和消费者
    await this.setupOptimizedStreams();
  }

  /**
   * 创建优化的连接
   */
  private async createOptimizedConnection(url: string, connectionId: string): Promise<NatsConnection> {
    return await connect({
      servers: url,
      name: connectionId,
      
      // 连接优化
      maxReconnectAttempts: 15,
      reconnectTimeWait: 1000,
      timeout: 8000,
      
      // 性能优化
      pingInterval: 20000,
      maxPingOut: 3,
      noRandomize: false, // 启用负载均衡
      
      // 缓冲优化
      maxPayload: 1024 * 1024, // 1MB
      
      // 调试
      debug: this.configService.get('NODE_ENV') === 'development',
      verbose: false,
      
      // TLS配置(如果需要)
      tls: this.configService.get('NATS_TLS_ENABLED') === 'true' ? {
        caFile: this.configService.get('NATS_TLS_CA'),
        keyFile: this.configService.get('NATS_TLS_KEY'),
        certFile: this.configService.get('NATS_TLS_CERT'),
      } : undefined,
    });
  }

  /**
   * 设置优化的流
   */
  private async setupOptimizedStreams(): Promise<void> {
    const primaryConnection = Array.from(this.connections.values())[0];
    if (!primaryConnection) return;

    const jsm = await primaryConnection.jetstreamManager();

    const streams: StreamConfig[] = [
      {
        name: 'AGENT_COORDINATION',
        subjects: ['agent.*', 'coordination.*', 'heartbeat.*'],
        retention: RetentionPolicy.Limits,
        max_age: 60 * 60 * 1000 * 1000000, // 1小时
        max_msgs: 50000,
        max_bytes: 100 * 1024 * 1024, // 100MB
        discard: DiscardPolicy.Old,
        duplicate_window: 30 * 1000 * 1000000, // 30秒去重
        
        // 性能优化
        max_consumers: 20,
        max_msg_size: 256 * 1024, // 256KB
        storage: 'memory', // 高性能内存存储
      },
      {
        name: 'TASK_PROCESSING',
        subjects: ['job.*', 'resume.*', 'scoring.*', 'report.*'],
        retention: RetentionPolicy.WorkQueue,
        max_age: 24 * 60 * 60 * 1000 * 1000000, // 24小时
        max_msgs: 100000,
        max_bytes: 500 * 1024 * 1024, // 500MB
        discard: DiscardPolicy.Old,
        duplicate_window: 5 * 60 * 1000 * 1000000, // 5分钟去重
        
        // 可靠性优化
        replicas: Math.min(3, this.connections.size),
        storage: 'file', // 持久化存储
      },
      {
        name: 'REAL_TIME_EVENTS',
        subjects: ['websocket.*', 'notification.*', 'status.*'],
        retention: RetentionPolicy.Limits,
        max_age: 5 * 60 * 1000 * 1000000, // 5分钟
        max_msgs: 10000,
        discard: DiscardPolicy.New, // 丢弃新消息
        duplicate_window: 1 * 1000 * 1000000, // 1秒去重
        
        // 实时性优化
        storage: 'memory',
        max_msg_size: 64 * 1024, // 64KB
      }
    ];

    for (const streamConfig of streams) {
      try {
        await jsm.streams.add(streamConfig);
        this.logger.log(`✅ Stream created/updated: ${streamConfig.name}`);
      } catch (error) {
        this.logger.warn(`⚠️ Stream setup warning for ${streamConfig.name}:`, error.message);
      }
    }
  }

  /**
   * 智能消息路由
   */
  async routeMessage(subject: string, payload: any, options?: {
    priority?: number;
    deduplicate?: boolean;
    merge?: boolean;
    timeout?: number;
  }): Promise<PubAck[]> {
    const startTime = Date.now();
    
    try {
      // 1. 检查去重
      if (options?.deduplicate) {
        const dedupResult = await this.handleDeduplication(subject, payload);
        if (dedupResult.skip) {
          this.metrics.deduplicationSavings++;
          this.logger.debug(`💾 Message deduplicated: ${subject}`);
          return [];
        }
        payload = dedupResult.payload;
      }

      // 2. 选择路由策略
      const route = this.selectRoute(subject, payload);
      if (!route) {
        this.logger.warn(`⚠️ No route found for subject: ${subject}`);
        this.metrics.messagesDropped++;
        return [];
      }

      // 3. 选择健康的连接
      const connection = await this.selectHealthyConnection(route);
      if (!connection) {
        this.logger.error(`❌ No healthy connections available for route: ${route.pattern}`);
        this.metrics.messagesDropped++;
        return [];
      }

      // 4. 执行路由
      const results = await this.executeRouting(connection, route, subject, payload, options);
      
      // 5. 更新指标
      this.updateMetrics(startTime, results.length > 0);
      
      return results;
      
    } catch (error) {
      this.logger.error(`❌ Routing failed for ${subject}:`, error);
      this.metrics.messagesDropped++;
      return [];
    }
  }

  /**
   * 处理消息去重
   */
  private async handleDeduplication(subject: string, payload: any): Promise<{ skip: boolean; payload: any }> {
    const deduplicationKey = this.generateDeduplicationKey(subject, payload);
    const now = Date.now();
    
    const existing = this.deduplicationCache.get(deduplicationKey);
    if (existing && (now - existing.timestamp) < 30000) { // 30秒窗口
      // 检查是否可以合并
      if (this.canMergeMessages(existing.merged, payload)) {
        const merged = this.mergeMessages(existing.merged, payload);
        this.deduplicationCache.set(deduplicationKey, {
          timestamp: now,
          merged
        });
        return { skip: false, payload: merged };
      } else {
        return { skip: true, payload };
      }
    }
    
    // 新消息，记录到缓存
    this.deduplicationCache.set(deduplicationKey, {
      timestamp: now,
      merged: payload
    });
    
    return { skip: false, payload };
  }

  /**
   * 生成去重键
   */
  private generateDeduplicationKey(subject: string, payload: any): string {
    // 根据消息类型生成不同的去重键
    if (subject.startsWith('job.')) {
      return `job_${payload.jobId}_${payload.eventType}`;
    } else if (subject.startsWith('agent.')) {
      return `agent_${payload.agentId}_${payload.eventType}`;
    } else if (subject.startsWith('heartbeat.')) {
      return `heartbeat_${payload.agentId}`;
    }
    
    // 默认键
    return `${subject}_${JSON.stringify(payload).slice(0, 100)}`;
  }

  /**
   * 检查是否可以合并消息
   */
  private canMergeMessages(existing: any, incoming: any): boolean {
    // 心跳消息可以合并
    if (existing.eventType === 'heartbeat' && incoming.eventType === 'heartbeat') {
      return existing.agentId === incoming.agentId;
    }
    
    // 状态更新可以合并
    if (existing.eventType === 'status_update' && incoming.eventType === 'status_update') {
      return existing.resourceId === incoming.resourceId;
    }
    
    // 指标数据可以合并
    if (existing.eventType === 'metrics' && incoming.eventType === 'metrics') {
      return existing.source === incoming.source;
    }
    
    return false;
  }

  /**
   * 合并消息
   */
  private mergeMessages(existing: any, incoming: any): any {
    if (existing.eventType === 'heartbeat') {
      return {
        ...incoming,
        mergedCount: (existing.mergedCount || 1) + 1,
        firstTimestamp: existing.timestamp || existing.firstTimestamp,
      };
    }
    
    if (existing.eventType === 'status_update') {
      return {
        ...incoming, // 使用最新状态
        previousStatus: existing.status,
        changeCount: (existing.changeCount || 1) + 1,
      };
    }
    
    if (existing.eventType === 'metrics') {
      return {
        ...incoming,
        aggregated: true,
        samples: (existing.samples || 1) + 1,
        previous: existing.metrics,
      };
    }
    
    return incoming; // 默认使用最新消息
  }

  /**
   * 选择路由
   */
  private selectRoute(subject: string, payload: any): MessageRoute | null {
    for (const [pattern, route] of this.routes) {
      if (this.matchesPattern(subject, pattern)) {
        if (this.meetsConditions(route, payload)) {
          return route;
        }
      }
    }
    
    return null;
  }

  /**
   * 模式匹配
   */
  private matchesPattern(subject: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(subject);
  }

  /**
   * 检查路由条件
   */
  private meetsConditions(route: MessageRoute, payload: any): boolean {
    if (!route.conditions) return true;
    
    const conditions = route.conditions;
    
    // 检查消息类型
    if (conditions.messageType && !conditions.messageType.includes(payload.eventType)) {
      return false;
    }
    
    // 检查紧急度
    if (conditions.urgency && !conditions.urgency.includes(payload.urgency || 'normal')) {
      return false;
    }
    
    // 检查代理负载
    if (conditions.agentLoad && payload.agentLoad > conditions.agentLoad) {
      return false;
    }
    
    return true;
  }

  /**
   * 选择健康连接
   */
  private async selectHealthyConnection(route: MessageRoute): Promise<{ connection: NatsConnection; jetstream: JetStreamClient } | null> {
    const healthyConnections = Array.from(this.connections.entries())
      .filter(([id, _]) => {
        const health = this.metrics.routeHealth.get(id) || 0;
        const circuit = this.circuitBreakers.get(id);
        return health > 0.5 && (!circuit || circuit.state !== 'open');
      });
    
    if (healthyConnections.length === 0) return null;
    
    // 负载均衡选择
    const [selectedId] = healthyConnections.sort((a, b) => {
      const healthA = this.metrics.routeHealth.get(a[0]) || 0;
      const healthB = this.metrics.routeHealth.get(b[0]) || 0;
      return healthB - healthA; // 选择健康度最高的
    })[0];
    
    return {
      connection: this.connections.get(selectedId)!,
      jetstream: this.jetstreams.get(selectedId)!
    };
  }

  /**
   * 执行路由
   */
  private async executeRouting(
    { connection, jetstream }: { connection: NatsConnection; jetstream: JetStreamClient },
    route: MessageRoute,
    subject: string,
    payload: any,
    options?: any
  ): Promise<PubAck[]> {
    const results: PubAck[] = [];
    
    switch (route.routingStrategy) {
      case 'broadcast':
        for (const endpoint of route.endpoints) {
          const result = await this.publishWithRetry(jetstream, `${endpoint}.${subject}`, payload, route.retryPolicy);
          if (result) results.push(result);
        }
        break;
        
      case 'load_balanced':
        const selectedEndpoint = this.selectEndpointByLoad(route.endpoints);
        const result = await this.publishWithRetry(jetstream, `${selectedEndpoint}.${subject}`, payload, route.retryPolicy);
        if (result) results.push(result);
        break;
        
      case 'conditional':
        const conditionalEndpoint = this.selectConditionalEndpoint(route.endpoints, payload);
        if (conditionalEndpoint) {
          const result = await this.publishWithRetry(jetstream, `${conditionalEndpoint}.${subject}`, payload, route.retryPolicy);
          if (result) results.push(result);
        }
        break;
        
      case 'round_robin':
      default:
        const rrEndpoint = this.selectRoundRobinEndpoint(route.endpoints);
        const rrResult = await this.publishWithRetry(jetstream, `${rrEndpoint}.${subject}`, payload, route.retryPolicy);
        if (rrResult) results.push(rrResult);
        break;
    }
    
    return results;
  }

  /**
   * 带重试的发布
   */
  private async publishWithRetry(
    jetstream: JetStreamClient,
    subject: string,
    payload: any,
    retryPolicy: MessageRoute['retryPolicy'],
    attempt: number = 0
  ): Promise<PubAck | null> {
    try {
      const data = JSON.stringify({
        ...payload,
        routedAt: new Date().toISOString(),
        attempt: attempt + 1
      });
      
      const result = await jetstream.publish(subject, this.codec.encode(data), {
        timeout: 5000,
        msgID: this.generateMessageId(subject, payload)
      });
      
      this.metrics.messagesDelivered++;
      return result;
      
    } catch (error) {
      this.logger.warn(`⚠️ Publish failed for ${subject} (attempt ${attempt + 1}):`, error.message);
      
      if (attempt < retryPolicy.maxRetries) {
        const delay = retryPolicy.backoffMs[Math.min(attempt, retryPolicy.backoffMs.length - 1)];
        await this.sleep(delay);
        return this.publishWithRetry(jetstream, subject, payload, retryPolicy, attempt + 1);
      } else {
        // 发送到死信队列
        if (retryPolicy.deadLetterQueue) {
          await this.sendToDeadLetterQueue(retryPolicy.deadLetterQueue, subject, payload, error);
        }
        this.metrics.messagesDropped++;
        return null;
      }
    }
  }

  /**
   * 端点选择算法
   */
  private selectEndpointByLoad(endpoints: string[]): string {
    // 简化的负载选择 - 实际应用中可以基于真实负载指标
    const loadMap = new Map<string, number>();
    endpoints.forEach(ep => {
      loadMap.set(ep, Math.random()); // 模拟负载
    });
    
    return endpoints.sort((a, b) => (loadMap.get(a) || 0) - (loadMap.get(b) || 0))[0];
  }

  private selectConditionalEndpoint(endpoints: string[], payload: any): string | null {
    // 基于负载条件选择
    if (payload.priority === 'high') {
      return endpoints.find(ep => ep.includes('priority')) || endpoints[0];
    }
    
    if (payload.size && payload.size > 1024 * 1024) { // 大消息
      return endpoints.find(ep => ep.includes('bulk')) || endpoints[0];
    }
    
    return endpoints[0];
  }

  private selectRoundRobinEndpoint(endpoints: string[]): string {
    const key = `rr_${endpoints.join('_')}`;
    let index = (this as any)[key] || 0;
    (this as any)[key] = (index + 1) % endpoints.length;
    return endpoints[index];
  }

  /**
   * 状态同步
   */
  async syncState(key: string, data: any, agentId: string): Promise<void> {
    const checksum = this.calculateChecksum(data);
    const existing = this.stateSync.get(key);
    
    if (existing && existing.checksum === checksum) {
      return; // 状态未变化
    }
    
    const stateUpdate: StateSync = {
      key,
      version: (existing?.version || 0) + 1,
      data,
      timestamp: new Date(),
      checksum,
      agentId
    };
    
    this.stateSync.set(key, stateUpdate);
    
    // 广播状态变更
    await this.routeMessage('coordination.state_sync', {
      eventType: 'state_update',
      stateKey: key,
      state: stateUpdate,
      agentId
    }, { deduplicate: true });
  }

  /**
   * 设置连接监控
   */
  private setupConnectionMonitoring(connectionId: string, connection: NatsConnection): void {
    // 监控连接状态
    (async () => {
      for await (const status of connection.status()) {
        const health = status.type === 'reconnect' ? 0.5 : 
                      status.type === 'disconnect' ? 0.0 : 1.0;
        
        this.metrics.routeHealth.set(connectionId, health);
        
        if (status.type === 'error') {
          this.handleConnectionError(connectionId, status.data);
        }
      }
    })().catch(err => {
      this.logger.error(`Connection monitoring error for ${connectionId}:`, err);
    });
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(connectionId: string, error: any): void {
    const circuit = this.circuitBreakers.get(connectionId) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed',
      threshold: 5,
      timeout: 60000
    };
    
    circuit.failures++;
    circuit.lastFailure = Date.now();
    
    if (circuit.failures >= circuit.threshold) {
      circuit.state = 'open';
      this.logger.warn(`🚨 Circuit breaker opened for connection: ${connectionId}`);
      
      // 设置恢复定时器
      setTimeout(() => {
        circuit.state = 'half_open';
        circuit.failures = 0;
        this.logger.log(`🔄 Circuit breaker half-open for connection: ${connectionId}`);
      }, circuit.timeout);
    }
    
    this.circuitBreakers.set(connectionId, circuit);
  }

  /**
   * 初始化默认路由
   */
  private initializeDefaultRoutes(): void {
    const defaultRoutes: Array<[string, MessageRoute]> = [
      ['agent\\..*', {
        pattern: 'agent\\..*',
        priority: 5,
        routingStrategy: 'broadcast',
        endpoints: ['coordination', 'monitoring'],
        retryPolicy: {
          maxRetries: 3,
          backoffMs: [1000, 2000, 4000],
          deadLetterQueue: 'agent.dlq'
        }
      }],
      ['job\\..*', {
        pattern: 'job\\..*',
        priority: 8,
        routingStrategy: 'load_balanced',
        endpoints: ['parser', 'extractor', 'scorer', 'reporter'],
        retryPolicy: {
          maxRetries: 5,
          backoffMs: [500, 1000, 2000, 4000, 8000],
          deadLetterQueue: 'job.dlq'
        }
      }],
      ['websocket\\..*', {
        pattern: 'websocket\\..*',
        priority: 6,
        routingStrategy: 'conditional',
        conditions: {
          urgency: ['high', 'critical']
        },
        endpoints: ['websocket-primary', 'websocket-backup'],
        retryPolicy: {
          maxRetries: 2,
          backoffMs: [100, 500],
          deadLetterQueue: 'websocket.dlq'
        }
      }],
      ['heartbeat\\..*', {
        pattern: 'heartbeat\\..*',
        priority: 3,
        routingStrategy: 'round_robin',
        endpoints: ['monitoring'],
        retryPolicy: {
          maxRetries: 1,
          backoffMs: [1000]
        }
      }]
    ];
    
    defaultRoutes.forEach(([pattern, route]) => {
      this.routes.set(pattern, route);
    });
  }

  // 辅助方法
  private generateMessageId(subject: string, payload: any): string {
    return `${subject}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(data: any): string {
    // 简化的校验和计算
    return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async sendToDeadLetterQueue(dlq: string, subject: string, payload: any, error: any): Promise<void> {
    try {
      const dlqPayload = {
        originalSubject: subject,
        originalPayload: payload,
        error: error.message,
        timestamp: new Date().toISOString(),
        routingFailure: true
      };
      
      const primaryJetStream = Array.from(this.jetstreams.values())[0];
      if (primaryJetStream) {
        await primaryJetStream.publish(dlq, this.codec.encode(JSON.stringify(dlqPayload)));
        this.logger.log(`📮 Message sent to DLQ: ${dlq}`);
      }
    } catch (dlqError) {
      this.logger.error(`❌ Failed to send to DLQ: ${dlq}`, dlqError);
    }
  }

  private updateMetrics(startTime: number, success: boolean): void {
    this.metrics.messagesSent++;
    
    if (success) {
      const latency = Date.now() - startTime;
      this.metrics.averageLatency = (this.metrics.averageLatency * 0.9) + (latency * 0.1);
    }
  }

  /**
   * 获取路由状态
   */
  getRoutingStatus(): any {
    return {
      connections: this.connections.size,
      routes: this.routes.size,
      metrics: this.metrics,
      circuitBreakers: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([id, circuit]) => [
          id, 
          { state: circuit.state, failures: circuit.failures }
        ])
      ),
      stateSyncEntries: this.stateSync.size,
      deduplicationCacheSize: this.deduplicationCache.size
    };
  }

  /**
   * 清理过期缓存
   */
  async cleanupCaches(): Promise<void> {
    const now = Date.now();
    
    // 清理去重缓存
    for (const [key, entry] of this.deduplicationCache) {
      if (now - entry.timestamp > 60000) { // 1分钟过期
        this.deduplicationCache.delete(key);
      }
    }
    
    // 清理状态同步缓存
    for (const [key, state] of this.stateSync) {
      if (now - state.timestamp.getTime() > 5 * 60 * 1000) { // 5分钟过期
        this.stateSync.delete(key);
      }
    }
  }

  /**
   * 关闭所有连接
   */
  async shutdown(): Promise<void> {
    this.logger.log('🔌 Shutting down SmartNatsRouter...');
    
    for (const [id, connection] of this.connections) {
      try {
        await connection.close();
        this.logger.log(`✅ Connection closed: ${id}`);
      } catch (error) {
        this.logger.error(`❌ Error closing connection ${id}:`, error);
      }
    }
    
    this.connections.clear();
    this.jetstreams.clear();
  }
}