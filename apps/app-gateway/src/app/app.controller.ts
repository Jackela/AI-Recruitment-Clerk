import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../auth/decorators/public.decorator';
import { JobRepository } from '../repositories/job.repository';
import { NatsClient } from '../nats/nats.client';
import { CacheService } from '../cache/cache.service';
import { CacheWarmupService } from '../cache/cache-warmup.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly jobRepository: JobRepository,
    private readonly natsClient: NatsClient,
    private readonly cacheService: CacheService,
    private readonly cacheWarmupService: CacheWarmupService,
  ) {}

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

  @Public()
  @Get('status')
  getData() {
    return this.appService.getData();
  }

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
      console.error('Cache metrics error:', error);
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

  @Public()
  @Get('health')
  async getHealth() {
    try {
      // 测试缓存服务是否可用
      if (!this.cacheService) {
        console.error('CacheService is not injected!');
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
      console.log('Using cache key:', cacheKey);

      return this.cacheService.wrap(
        cacheKey,
        async () => {
          console.log('Cache MISS - generating new health data');
          const dbHealth = await this.jobRepository.healthCheck();
          const natsHealth = this.natsClient.isConnected;

          console.log(
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
      console.error('Health check cache error:', error);
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
