/**
 * 统一NATS客户端模式 - 消除重复代码
 * Unified NATS Client Pattern - Eliminate Code Duplication
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  connect,
  NatsConnection,
  JetStreamManager,
  JetStreamClient,
  RetentionPolicy,
  headers as natsHeaders,
} from 'nats';

/**
 * Defines the shape of the nats config.
 */
export interface NatsConfig {
  servers: string[];
  serviceName: string;
  retryAttempts?: number;
  retryDelay?: number;
  connectionTimeout?: number;
}

/**
 * Defines the shape of the message pattern.
 */
export interface MessagePattern {
  subject: string;
  data: any;
  headers?: Record<string, string>;
}

/**
 * Defines the shape of the consumer config.
 */
export interface ConsumerConfig {
  stream: string;
  consumer: string;
  subject: string;
  handler: (data: any) => Promise<void>;
}

/**
 * Represents the base nats client.
 */
@Injectable()
export abstract class BaseNatsClient implements OnModuleDestroy {
  protected readonly logger: Logger;
  protected connection: NatsConnection | null = null;
  protected jetstream: JetStreamClient | null = null;
  protected jsm: JetStreamManager | null = null;

  /**
   * Initializes a new instance of the Base NATS Client.
   * @param config - The config.
   */
  constructor(protected readonly config: NatsConfig) {
    this.logger = new Logger(`${config.serviceName}NatsClient`);
  }

  /**
   * 建立NATS连接
   */
  async connect(): Promise<void> {
    try {
      this.logger.log('Connecting to NATS servers...');

      this.connection = await connect({
        servers: this.config.servers,
        timeout: this.config.connectionTimeout || 5000,
        reconnect: true,
        maxReconnectAttempts: this.config.retryAttempts || 10,
        reconnectTimeWait: this.config.retryDelay || 2000,
      });

      this.jetstream = this.connection.jetstream();
      this.jsm = await this.connection.jetstreamManager();

      this.logger.log('Successfully connected to NATS');

      // 设置连接事件监听
      this.setupConnectionHandlers();

      // 初始化子类特定配置
      await this.onConnected();
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      throw error;
    }
  }

  /**
   * 发布消息到JetStream
   */
  async publish(pattern: MessagePattern): Promise<void> {
    if (!this.jetstream) {
      throw new Error('NATS JetStream not initialized');
    }

    try {
      const hdrs = natsHeaders();
      // set provided headers first
      const provided = pattern.headers || {};
      for (const [k, v] of Object.entries(provided)) {
        hdrs.set(k, v);
      }
      // add standard headers
      hdrs.set('source', this.config.serviceName);
      hdrs.set('timestamp', new Date().toISOString());

      await this.jetstream.publish(
        pattern.subject,
        JSON.stringify(pattern.data),
        { headers: hdrs },
      );

      this.logger.debug(`Published message to ${pattern.subject}`);
    } catch (error) {
      this.logger.error(`Failed to publish to ${pattern.subject}`, error);
      throw error;
    }
  }

  /**
   * 创建消费者
   */
  async createConsumer(config: ConsumerConfig): Promise<void> {
    if (!this.jetstream || !this.jsm) {
      throw new Error('NATS JetStream not initialized');
    }

    try {
      // 确保流存在
      await this.ensureStream(config.stream, [config.subject]);

      // 创建或获取消费者
      const consumer = await this.jetstream.consumers.get(
        config.stream,
        config.consumer,
      );

      // 开始消费消息
      const messages = await consumer.consume();

      this.logger.log(
        `Created consumer ${config.consumer} for stream ${config.stream}`,
      );

      // 处理消息
      for await (const message of messages) {
        try {
          const data = JSON.parse(message.data.toString());
          await config.handler(data);
          message.ack();

          this.logger.debug(`Processed message from ${message.subject}`);
        } catch (error) {
          this.logger.error(
            `Failed to process message from ${message.subject}`,
            error,
          );
          message.nak();
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create consumer ${config.consumer}`, error);
      throw error;
    }
  }

  /**
   * 请求-响应模式
   */
  async request<T>(
    subject: string,
    data: any,
    timeout: number = 5000,
  ): Promise<T> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const response = await this.connection.request(
        subject,
        JSON.stringify(data),
        { timeout },
      );

      return JSON.parse(response.data.toString());
    } catch (error) {
      this.logger.error(`Request to ${subject} failed`, error);
      throw error;
    }
  }

  /**
   * 订阅主题
   */
  async subscribe(
    subject: string,
    handler: (data: any) => Promise<void>,
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('NATS connection not established');
    }

    try {
      const subscription = this.connection.subscribe(subject);

      this.logger.log(`Subscribed to ${subject}`);

      for await (const message of subscription) {
        try {
          const data = JSON.parse(message.data.toString());
          await handler(data);
        } catch (error) {
          this.logger.error(`Failed to handle message from ${subject}`, error);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${subject}`, error);
      throw error;
    }
  }

  /**
   * 确保JetStream流存在
   */
  private async ensureStream(
    streamName: string,
    subjects: string[],
  ): Promise<void> {
    if (!this.jsm) {
      throw new Error('JetStream Manager not initialized');
    }

    try {
      await this.jsm.streams.info(streamName);
      this.logger.debug(`Stream ${streamName} already exists`);
    } catch (error) {
      // 流不存在，创建它
      await this.jsm.streams.add({
        name: streamName,
        subjects: subjects,
        retention: RetentionPolicy.Limits,
        max_msgs: 10000,
        max_bytes: 100 * 1024 * 1024, // 100MB
      });

      this.logger.log(`Created stream ${streamName}`);
    }
  }

  /**
   * 设置连接事件处理
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.closed().then(() => {
      this.logger.warn('NATS connection closed');
    });

    // 处理重连事件
    (async () => {
      for await (const status of this.connection!.status()) {
        this.logger.log(`NATS connection status: ${status.type}`);

        if (status.type === 'reconnect') {
          this.logger.log('NATS reconnected successfully');
        } else if (status.type === 'disconnect') {
          this.logger.warn('NATS disconnected');
        }
      }
    })();
  }

  /**
   * 子类可重写的连接成功回调
   */
  protected async onConnected(): Promise<void> {
    // 子类可以重写此方法
  }

  /**
   * 关闭连接
   */
  async onModuleDestroy(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.logger.log('NATS connection closed');
    }
  }

  /**
   * 健康检查
   */
  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  /**
   * 获取连接统计信息
   */
  getStats(): any {
    if (!this.connection) {
      return { connected: false };
    }

    return {
      connected: true,
      servers: this.connection.getServer(),
      info: this.connection.info,
    };
  }
}

/**
 * 具体服务实现示例
 */
export abstract class ServiceNatsClient extends BaseNatsClient {
  protected abstract getStreamConfigs(): ConsumerConfig[];
  protected abstract getServiceSubjects(): string[];

  protected async onConnected(): Promise<void> {
    // 初始化服务特定的消费者
    const consumers = this.getStreamConfigs();
    for (const consumer of consumers) {
      await this.createConsumer(consumer);
    }

    // 订阅服务特定的主题
    const subjects = this.getServiceSubjects();
    for (const subject of subjects) {
      await this.subscribe(subject, this.handleMessage.bind(this));
    }
  }

  protected abstract handleMessage(data: any): Promise<void>;
}
