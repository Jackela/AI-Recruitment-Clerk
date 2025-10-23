import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Defines the shape of the service health.
 */
export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  metadata?: any;
}

/**
 * Defines the shape of the system health.
 */
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
  uptime: number;
  version: string;
}

/**
 * Defines the shape of the health check config.
 */
export interface HealthCheckConfig {
  name: string;
  url?: string;
  timeout?: number;
  interval?: number;
  enabled?: boolean;
  healthCheck?: () => Promise<{ healthy: boolean; metadata?: any }>;
}

/**
 * Provides health check functionality.
 */
@Injectable()
export class HealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();
  private serviceHealths = new Map<string, ServiceHealth>();
  private healthCheckConfigs: HealthCheckConfig[] = [];

  /**
   * Performs the on module init operation.
   * @returns The result of the operation.
   */
  async onModuleInit() {
    this.logger.log('Initializing health check service');

    // Register default health checks
    this.registerDefaultHealthChecks();

    // Perform initial health checks
    await this.performAllHealthChecks();
  }

  /**
   * Performs the register health check operation.
   * @param config - The config.
   */
  registerHealthCheck(config: HealthCheckConfig): void {
    this.healthCheckConfigs.push({
      timeout: 5000,
      interval: 30000,
      enabled: true,
      ...config,
    });

    this.logger.debug(`Registered health check for ${config.name}`);
  }

  /**
   * Retrieves system health.
   * @returns A promise that resolves to SystemHealth.
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const services = Array.from(this.serviceHealths.values());
    const overall = this.calculateOverallHealth(services);

    return {
      overall,
      services,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Retrieves service health.
   * @param serviceName - The service name.
   * @returns A promise that resolves to ServiceHealth | null.
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
    return this.serviceHealths.get(serviceName) || null;
  }

  /**
   * Performs the check service health operation.
   * @param serviceName - The service name.
   * @returns A promise that resolves to ServiceHealth.
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const config = this.healthCheckConfigs.find((c) => c.name === serviceName);

    if (!config) {
      throw new Error(
        `Health check configuration not found for ${serviceName}`,
      );
    }

    return await this.performHealthCheck(config);
  }

  /**
   * Performs the perform scheduled health checks operation.
   * @returns A promise that resolves when the operation completes.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async performScheduledHealthChecks(): Promise<void> {
    try {
      await this.performAllHealthChecks();
    } catch (error) {
      this.logger.error('Error during scheduled health checks:', error);
    }
  }

  private async performAllHealthChecks(): Promise<void> {
    const enabledConfigs = this.healthCheckConfigs.filter((c) => c.enabled);

    const healthCheckPromises = enabledConfigs.map((config) =>
      this.performHealthCheck(config).catch((error) => {
        this.logger.error(`Health check failed for ${config.name}:`, error);
        return {
          name: config.name,
          status: 'unhealthy' as const,
          lastCheck: new Date(),
          error: error.message,
        };
      }),
    );

    const results = await Promise.all(healthCheckPromises);

    results.forEach((result) => {
      this.serviceHealths.set(result.name, result);
    });
  }

  private async performHealthCheck(
    config: HealthCheckConfig,
  ): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      let result: { healthy: boolean; metadata?: any };

      if (config.healthCheck) {
        // Custom health check function
        result = await Promise.race([
          config.healthCheck(),
          this.createTimeoutPromise(config.timeout!),
        ]);
      } else if (config.url) {
        // HTTP health check
        result = await this.performHttpHealthCheck(config.url, config.timeout!);
      } else {
        throw new Error('No health check method configured');
      }

      const responseTime = Date.now() - startTime;

      return {
        name: config.name,
        status: result.healthy ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        metadata: result.metadata,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        name: config.name,
        status: 'unhealthy',
        lastCheck: new Date(),
        responseTime,
        error: error.message,
      };
    }
  }

  private async performHttpHealthCheck(
    url: string,
    _timeout: number,
  ): Promise<{ healthy: boolean; metadata?: any }> {
    try {
      // Mock HTTP health check - replace with actual HTTP client
      // const response = await fetch(url, { timeout });
      // const healthy = response.ok;

      // Mock implementation
      const healthy = Math.random() > 0.1; // 90% success rate

      return {
        healthy,
        metadata: {
          url,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        metadata: {
          url,
          error: error.message,
        },
      };
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  private calculateOverallHealth(
    services: ServiceHealth[],
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (services.length === 0) {
      return 'healthy';
    }

    const degradedCount = services.filter(
      (s) => s.status === 'degraded',
    ).length;
    const unhealthyCount = services.filter(
      (s) => s.status === 'unhealthy',
    ).length;

    // If more than 50% are unhealthy, system is unhealthy
    if (unhealthyCount > services.length * 0.5) {
      return 'unhealthy';
    }

    // If any services are unhealthy or degraded, system is degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  private registerDefaultHealthChecks(): void {
    // Database health check
    this.registerHealthCheck({
      name: 'database',
      healthCheck: async () => {
        try {
          // Mock database health check
          const healthy = Math.random() > 0.05; // 95% success rate
          return {
            healthy,
            metadata: {
              connectionPool: healthy ? 'active' : 'degraded',
              queryTime: Math.random() * 100,
            },
          };
        } catch (error) {
          return { healthy: false };
        }
      },
    });

    // Redis cache health check - 真实检查
    this.registerHealthCheck({
      name: 'redis',
      healthCheck: async () => {
        try {
          // 如果没有Redis URL或被禁用，返回内存缓存模式
          const redisUrl = process.env.REDIS_URL;
          const useRedis = process.env.USE_REDIS_CACHE !== 'false';
          const disableRedis = process.env.DISABLE_REDIS === 'true';

          if (!useRedis || disableRedis || !redisUrl) {
            return {
              healthy: true,
              metadata: {
                mode: 'memory-cache',
                redis_enabled: false,
                reason: !redisUrl ? 'no_url' : 'disabled',
              },
            };
          }

          // 检查Redis URL格式
          if (
            !redisUrl.startsWith('redis://') &&
            !redisUrl.startsWith('rediss://')
          ) {
            return {
              healthy: false,
              metadata: {
                mode: 'memory-cache',
                error: 'invalid_redis_url',
                url_format: 'invalid',
              },
            };
          }

          // 尝试连接Redis
          const { createClient } = await import('redis');
          const client = createClient({
            url: redisUrl,
            socket: {
              connectTimeout: 5000,
            },
            commandsQueueMaxLength: 100,
          });

          // 设置错误处理器防止未处理的错误
          client.on('error', (error) => {
            this.logger.debug(
              'Redis connection error during health check:',
              error,
            );
          });

          await client.connect();
          const pong = await client.ping();
          await client.disconnect();

          return {
            healthy: pong === 'PONG',
            metadata: {
              mode: 'redis',
              ping: pong,
              connected: true,
              server_info: 'available',
            },
          };
        } catch (error) {
          return {
            healthy: false,
            metadata: {
              mode: 'memory-cache-fallback',
              error: error.message,
              fallback_active: true,
            },
          };
        }
      },
    });

    // NATS message queue health check
    this.registerHealthCheck({
      name: 'nats',
      healthCheck: async () => {
        try {
          // Mock NATS health check
          const healthy = Math.random() > 0.02; // 98% success rate
          return {
            healthy,
            metadata: {
              connectedServers: healthy ? 1 : 0,
              totalMessages: Math.floor(Math.random() * 1000),
            },
          };
        } catch (error) {
          return { healthy: false };
        }
      },
    });

    // External services health checks
    const externalServices = [
      'resume-parser-svc',
      'jd-extractor-svc',
      'scoring-engine-svc',
      'report-generator-svc',
    ];

    externalServices.forEach((service) => {
      this.registerHealthCheck({
        name: service,
        url: `http://${service}:3000/health`,
        timeout: 5000,
      });
    });
  }
}
