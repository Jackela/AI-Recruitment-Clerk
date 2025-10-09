import { Controller, Get, Post, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../auth/decorators/public.decorator';
import { JobRepository } from '../repositories/job.repository';
import { NatsClientService } from '@ai-recruitment-clerk/shared-nats-client';
import { CacheService } from '../cache/cache.service';
import { CacheWarmupService } from '../cache/cache-warmup.service';

/**
 * Exposes endpoints for app.
 */
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  /**
   * Initializes a new instance of the App Controller.
   * @param appService - The app service.
   * @param jobRepository - The job repository.
   * @param natsClient - The nats client.
   * @param cacheService - The cache service.
   * @param cacheWarmupService - The cache warmup service.
   */
  constructor(
    private readonly appService: AppService,
    private readonly jobRepository: JobRepository,
    private readonly natsClient: NatsClientService,
    private readonly cacheService: CacheService,
    private readonly cacheWarmupService: CacheWarmupService,
  ) {}

  /**
   * Retrieves welcome.
   * @returns The result of the operation.
   */
  @Public()
  @Get('/')
  getWelcome() {
    return {
      message: 'Welcome to the AI Recruitment Clerk API Gateway!',
      status: 'ok',
      timestamp: new Date().toISOString(),
      documentation: '/api/docs',
    };
  }

  /**
   * Retrieves data.
   * @returns The result of the operation.
   */
  @Public()
  @Get('status')
  getData() {
    return this.appService.getData();
  }

  /**
   * Retrieves cache metrics.
   * @returns The result of the operation.
   */
  @Public()
  @Get('cache/metrics')
  async getCacheMetrics() {
    try {
      const cacheHealth = await this.cacheService.healthCheck();
      return {
        timestamp: new Date().toISOString(),
        cache: cacheHealth,
      };
    } catch (error) {
      this.logger.error('Cache metrics error', error.stack || error.message);
      return {
        timestamp: new Date().toISOString(),
        cache: {
          status: 'error',
          connected: false,
          metrics: this.cacheService.getMetrics(),
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Retrieves health.
   * @returns The result of the operation.
   */
  @Public()
  @Get('health')
  async getHealth() {
    try {
      // 测试缓存服务是否可用
      if (!this.cacheService) {
        this.logger.error('CacheService is not injected!');
        // 直接返回基本健康检查
        const dbHealth = await this.jobRepository.healthCheck();
        const natsHealth = this.natsClient.isConnected;

        return {
          status:
            dbHealth.status === 'healthy' && natsHealth ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          service: 'app-gateway',
          database: {
            status: dbHealth.status,
            jobCount: dbHealth.count,
          },
          messaging: {
            status: natsHealth ? 'connected' : 'disconnected',
            provider: 'NATS JetStream',
          },
          features: {
            authentication: 'enabled',
            authorization: 'enabled',
            cache: 'disabled - service injection failed',
          },
        };
      }

      const cacheKey = this.cacheService.getHealthCacheKey();
      this.logger.debug(`Using cache key: ${cacheKey}`);

      return this.cacheService.wrap(
        cacheKey,
        async () => {
          this.logger.debug('Cache MISS - generating new health data');
          const dbHealth = await this.jobRepository.healthCheck();
          const natsHealth = this.natsClient.isConnected;

          this.logger.log(
            `[HealthCheck] DB status: ${dbHealth.status}, NATS status: ${natsHealth ? 'connected' : 'disconnected'}`,
          );

          return {
            status:
              dbHealth.status === 'healthy' && natsHealth ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'app-gateway',
            database: {
              status: dbHealth.status,
              jobCount: dbHealth.count,
            },
            messaging: {
              status: natsHealth ? 'connected' : 'disconnected',
              provider: 'NATS JetStream',
            },
            features: {
              authentication: 'enabled',
              authorization: 'enabled',
              cache: 'enabled',
            },
            cache: {
              provider: 'Redis/Memory',
              status: 'connected',
            },
          };
        },
        { ttl: 30000 }, // 30秒缓存(30000毫秒)，健康检查不需要太长缓存
      );
    } catch (error) {
      this.logger.error('Health check cache error', error.stack || error.message);
      // 降级到无缓存模式
      const dbHealth = await this.jobRepository.healthCheck();
      const natsHealth = this.natsClient.isConnected;

      return {
        status: dbHealth.status === 'healthy' && natsHealth ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        service: 'app-gateway',
        database: {
          status: dbHealth.status,
          jobCount: dbHealth.count,
        },
        messaging: {
          status: natsHealth ? 'connected' : 'disconnected',
          provider: 'NATS JetStream',
        },
        features: {
          authentication: 'enabled',
          authorization: 'enabled',
          cache:
            'error - ' +
            (error instanceof Error ? error.message : String(error)),
        },
      };
    }
  }

  /**
   * Retrieves cache warmup status.
   * @returns The result of the operation.
   */
  @Public()
  @Get('cache/warmup/status')
  async getCacheWarmupStatus() {
    try {
      return {
        timestamp: new Date().toISOString(),
        warmupStatus: this.cacheWarmupService.getRefreshStatus(),
        cacheMetrics: this.cacheService.getMetrics(),
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        warmupStatus: {
          isActive: false,
          lastRefresh: null,
          nextDeepWarmup: null,
        },
        cacheMetrics: this.cacheService.getMetrics(),
      };
    }
  }

  /**
   * Performs the trigger cache warmup operation.
   * @returns The result of the operation.
   */
  @Public()
  @Post('cache/warmup/trigger')
  async triggerCacheWarmup() {
    try {
      const result = await this.cacheWarmupService.triggerWarmup();
      return {
        timestamp: new Date().toISOString(),
        warmupResult: result,
        message: 'Cache warmup triggered successfully',
      };
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        message: 'Cache warmup trigger failed',
      };
    }
  }
}
