/**
 * Redis连接管理服务
 * 专门处理Railway生产环境Redis连接问题
 */

import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

/**
 * Provides redis connection functionality.
 */
@Injectable()
export class RedisConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(RedisConnectionService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redisClient: any = null;
  private connectionState:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval: NodeJS.Timeout | null = null;

  /**
   * Initializes a new instance of the Redis Connection Service.
   * @param configService - The config service.
   */
  constructor(private configService: ConfigService) {
    // Intentionally empty
  }

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  public async onModuleInit(): Promise<void> {
    await this.initializeConnection();
  }

  /**
   * Performs the on module destroy operation.
   * @returns The result of the operation.
   */
  public async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  /**
   * 初始化Redis连接
   */
  private async initializeConnection(): Promise<void> {
    const redisUrl = this.configService.get('REDIS_URL');
    const useRedis =
      this.configService.get('USE_REDIS_CACHE', 'true') === 'true';
    const disableRedis =
      this.configService.get('DISABLE_REDIS', 'false') === 'true';

    // 如果禁用Redis或没有URL
    if (!useRedis || disableRedis || !redisUrl) {
      this.logger.log('🧠 Redis已禁用，使用内存缓存模式');
      return;
    }

    // 检查Redis URL格式
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      this.logger.error('❌ Redis URL格式无效');
      return;
    }

    await this.connectToRedis(redisUrl);
  }

  /**
   * 连接到Redis
   */
  private async connectToRedis(redisUrl: string): Promise<void> {
    try {
      this.connectionState = 'connecting';
      this.logger.log(`🔗 正在连接Redis: ${this.maskRedisUrl(redisUrl)}`);

      // 动态导入Redis客户端
      const { createClient } = await import('redis');

      // 创建Redis客户端，增强错误处理
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: parseInt(
            this.configService.get('REDIS_CONNECTION_TIMEOUT', '10000'),
          ),
          reconnectStrategy: (retries) => {
            if (retries > this.maxReconnectAttempts) {
              this.logger.error('❌ Redis重连次数超过限制，停止重连');
              return false;
            }
            const delay = Math.min(retries * 50, 500);
            this.logger.warn(
              `🔄 Redis重连中... 第${retries}次，${delay}ms后重试`,
            );
            return delay;
          },
        },
        // 命令超时和其他配置
        commandsQueueMaxLength: 200,
        disableOfflineQueue: false,
      });

      // 设置事件监听器
      this.setupEventListeners();

      // 连接到Redis
      await this.redisClient.connect();

      // 测试连接
      await this.redisClient.ping();

      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.logger.log('✅ Redis连接成功建立');
    } catch (error: unknown) {
      this.connectionState = 'error';
      this.reconnectAttempts++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Redis连接失败: ${errorMessage}`);

      // 如果重连次数未超限，启动重连
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.scheduleReconnect(redisUrl);
      } else {
        this.logger.error('❌ Redis重连次数已达上限，切换到内存缓存模式');
      }
    }
  }

  /**
   * 设置Redis事件监听器
   */
  private setupEventListeners(): void {
    if (!this.redisClient) return;

    this.redisClient.on('connect', () => {
      this.connectionState = 'connected';
      this.logger.log('✅ Redis连接已建立');
    });

    this.redisClient.on('ready', () => {
      this.logger.log('✅ Redis客户端就绪');
    });

    this.redisClient.on('error', (err: Error) => {
      this.connectionState = 'error';
      this.logger.warn(`⚠️ Redis连接错误: ${err.message}`);

      // 记录常见错误的解决建议
      if (err.message.includes('ENOTFOUND')) {
        this.logger.warn('💡 DNS解析失败，请检查Redis URL是否正确');
      } else if (err.message.includes('ECONNREFUSED')) {
        this.logger.warn('💡 连接被拒绝，请检查Redis服务是否运行');
      } else if (err.message.includes('ETIMEDOUT')) {
        this.logger.warn('💡 连接超时，请检查网络连接和防火墙设置');
      }
    });

    this.redisClient.on('end', () => {
      this.connectionState = 'disconnected';
      this.logger.warn('⚠️ Redis连接已断开');
    });

    this.redisClient.on('reconnecting', () => {
      this.connectionState = 'connecting';
      this.logger.log('🔄 Redis正在重连...');
    });
  }

  /**
   * 计划重连
   */
  private scheduleReconnect(redisUrl: string): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
    }

    const delay = Math.min(this.reconnectAttempts * 1000, 30000); // 最多30秒
    this.logger.log(`🕐 ${delay}ms后尝试重连Redis...`);

    this.reconnectInterval = setTimeout(async () => {
      await this.connectToRedis(redisUrl);
    }, delay);
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): {
    state: string;
    connected: boolean;
    attempts: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any;
  } {
    return {
      state: this.connectionState,
      connected: this.connectionState === 'connected',
      attempts: this.reconnectAttempts,
      client: this.redisClient,
    };
  }

  /**
   * 手动重连
   */
  public async reconnect(): Promise<void> {
    const redisUrl = this.configService.get('REDIS_URL');
    if (redisUrl) {
      this.reconnectAttempts = 0; // 重置重连计数
      await this.connectToRedis(redisUrl);
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.redisClient) {
      try {
        await this.redisClient.quit();
        this.logger.log('🧹 Redis连接已清理');
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(`Redis清理失败: ${errorMessage}`);
      }
      this.redisClient = null;
    }
  }

  /**
   * 屏蔽Redis URL中的敏感信息
   */
  private maskRedisUrl(url: string): string {
    return url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  }

  /**
   * 检查Redis是否可用
   */
  public async isRedisAvailable(): Promise<boolean> {
    try {
      if (!this.redisClient || this.connectionState !== 'connected') {
        return false;
      }

      await this.redisClient.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取Redis客户端（如果可用）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getRedisClient(): any {
    if (this.connectionState === 'connected') {
      return this.redisClient;
    }
    return null;
  }
}
