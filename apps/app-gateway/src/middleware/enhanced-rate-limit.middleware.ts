import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import Redis, { RedisOptions } from 'ioredis';

interface SecurityRateLimitRecord {
  requests: number;
  failedAttempts: number;
  lastAttempt: number;
  lockedUntil?: number;
  suspiciousActivity: number;
  firstSeen: number;
}

interface OperationLimits {
  auth: { window: number; limit: number };
  upload: { window: number; limit: number };
  api: { window: number; limit: number };
  default: { window: number; limit: number };
}

interface ClientInfo {
  ip: string;
  userAgent: string;
  userId: string | null;
  fingerprint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  resetTime: number;
  currentCount: number;
}

interface LockInfo {
  lockedUntil: number;
  reason?: string;
  [key: string]: unknown;
}

/**
 * Represents the enhanced rate limit middleware.
 */
@Injectable()
export class EnhancedRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnhancedRateLimitMiddleware.name);
  private redis: Redis | null = null;
  private operationLimits: OperationLimits = {
    auth: { window: 60000, limit: 10 },
    upload: { window: 60000, limit: 10 },
    api: { window: 60000, limit: 10 },
    default: { window: 60000, limit: 10 },
  };
  private suspiciousActivityThreshold = 0;
  private maxFailedAttempts = 0;
  private lockoutDuration = 0;

  /**
   * Initializes a new instance of the Enhanced Rate Limit Middleware.
   * @param configService - The config service.
   */
  constructor(private configService: ConfigService) {
    this.initializeRedis();
    this.initializeLimits();
  }

  private initializeRedis() {
    // 检查Redis配置
    const disableRedis =
      this.configService.get('DISABLE_REDIS', 'false') === 'true';
    const useRedis =
      this.configService.get('USE_REDIS_CACHE', 'true') === 'true';
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost =
      this.configService.get<string>('REDISHOST') ||
      this.configService.get<string>('REDIS_HOST');

    // 如果Redis被禁用或未配置，跳过Redis初始化
    if (disableRedis || !useRedis || (!redisUrl && !redisHost)) {
      this.logger.log('🔒 Redis已禁用或未配置，限流使用内存存储');
      this.redis = null;
      return;
    }

    try {
      // 优先使用完整的 REDIS_URL；仅当没有 URL 但提供了 Host/Port 时才使用分离配置
      if (redisUrl) {
        const urlWithFamily = (() => {
          try {
            const u = new URL(redisUrl);
            if (
              u.hostname.endsWith('.railway.internal') &&
              !u.searchParams.has('family')
            ) {
              u.searchParams.set('family', '0');
            }
            return u.toString();
          } catch {
            return redisUrl;
          }
        })();
        this.redis = new Redis(urlWithFamily, {
          maxRetriesPerRequest: 3,
          lazyConnect: false, // 改为立即连接
          enableOfflineQueue: true, // 启用离线队列
          connectTimeout: 10000,
        });
      } else {
        const resolvedHost = redisHost;
        if (!resolvedHost) {
          throw new Error('REDISHOST is required when REDIS_URL is not set');
        }
        const redisOptions: RedisOptions = {
          host: resolvedHost,
          port: parseInt(
            this.configService.get<string>('REDISPORT') ||
              this.configService.get<string>('REDIS_PORT') ||
              (() => {
                throw new Error(
                  'Redis configuration incomplete: REDISHOST found but REDISPORT/REDIS_PORT is missing',
                );
              })(),
          ),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: false, // 改为立即连接
          enableOfflineQueue: true, // 启用离线队列
          connectTimeout: 10000,
        };
        this.redis = new Redis(redisOptions);
      }

      if (this.redis) {
        this.redis.on('error', (error) => {
          this.logger.warn('Redis连接错误，限流降级到内存存储:', error.message);
          this.redis = null;
        });

        this.redis.on('connect', () => {
          this.logger.log('✅ Redis连接成功，限流使用Redis存储');
        });
      }
    } catch (error) {
      this.logger.warn('Redis初始化失败，限流降级到内存存储:', error.message);
      this.redis = null;
    }
  }

  private initializeLimits() {
    this.operationLimits = {
      auth: {
        window: parseInt(
          this.configService.get<string>('RATE_LIMIT_AUTH_WINDOW_MS') ||
            '900000',
        ), // 15 minutes
        limit: parseInt(
          this.configService.get<string>('RATE_LIMIT_AUTH_MAX') || '5',
        ), // 5 attempts
      },
      upload: {
        window: parseInt(
          this.configService.get<string>('RATE_LIMIT_UPLOAD_WINDOW_MS') ||
            '3600000',
        ), // 1 hour
        limit: parseInt(
          this.configService.get<string>('RATE_LIMIT_UPLOAD_MAX') || '20',
        ), // 20 uploads
      },
      api: {
        window: parseInt(
          this.configService.get<string>('RATE_LIMIT_API_WINDOW_MS') || '60000',
        ), // 1 minute
        limit: parseInt(
          this.configService.get<string>('RATE_LIMIT_API_MAX') || '60',
        ), // 60 requests
      },
      default: {
        window: parseInt(
          this.configService.get<string>('RATE_LIMIT_DEFAULT_WINDOW_MS') ||
            '300000',
        ), // 5 minutes
        limit: parseInt(
          this.configService.get<string>('RATE_LIMIT_DEFAULT_MAX') || '100',
        ), // 100 requests
      },
    };

    this.suspiciousActivityThreshold = parseInt(
      this.configService.get<string>('SUSPICIOUS_ACTIVITY_THRESHOLD') || '10',
    );
    this.maxFailedAttempts = parseInt(
      this.configService.get<string>('MAX_LOGIN_ATTEMPTS') || '5',
    );
    this.lockoutDuration = parseInt(
      this.configService.get<string>('LOCKOUT_DURATION') || '900000', // 15 minutes
    );
  }

  /**
   * Performs the use operation.
   * @param req - The req.
   * @param res - The res.
   * @param next - The next.
   * @returns The result of the operation.
   */
  async use(req: Request, res: Response, next: NextFunction) {
    // 若Redis不可用，直接放行（生产环境不阻塞请求）
    if (!this.redis) {
      return next();
    }
    const clientInfo = this.extractClientInfo(req);
    const operationType = this.determineOperationType(req);
    const limits =
      this.operationLimits[operationType] || this.operationLimits.default;

    try {
      // Check if IP is currently locked
      const isLocked = await this.isIpLocked(clientInfo.ip);
      if (isLocked) {
        const lockInfo = await this.getLockInfo(clientInfo.ip);
        throw new HttpException(
          {
            message: 'IP address temporarily locked due to suspicious activity',
            lockUntil: lockInfo?.lockedUntil ?? null,
            reason: 'security_lockout',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Perform rate limiting check
      const rateLimitResult = await this.checkRateLimit(
        clientInfo,
        operationType,
        limits,
      );

      if (!rateLimitResult.allowed) {
        // Record failed attempt for suspicious activity detection
        await this.recordFailedAttempt(clientInfo.ip);

        this.setRateLimitHeaders(res, rateLimitResult);
        throw new HttpException(
          {
            message: `Rate limit exceeded for ${operationType} operations`,
            retryAfter: rateLimitResult.retryAfter,
            limit: limits.limit,
            window: limits.window,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Record successful request
      await this.recordRequest(clientInfo, operationType);

      // Set rate limit headers
      this.setRateLimitHeaders(res, rateLimitResult);

      // Add rate limit info to request
      const requestWithRateLimit = req as Request & {
        rateLimitInfo?: Record<string, unknown>;
      };
      requestWithRateLimit.rateLimitInfo = {
        operationType,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        clientInfo,
      };

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limiting error for ${clientInfo.ip}:`, error);
      // Don't block requests on rate limiting errors in production
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        throw error;
      }
      next();
    }
  }

  private extractClientInfo(req: Request): ClientInfo {
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const requestWithUser = req as Request & { user?: { sub?: string } };
    const userId =
      typeof requestWithUser.user?.sub === 'string'
        ? requestWithUser.user?.sub ?? null
        : null;

    return {
      ip,
      userAgent,
      userId,
      fingerprint: this.generateFingerprint(ip, userAgent),
    };
  }

  private determineOperationType(req: Request): keyof OperationLimits {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Authentication operations
    if (path.includes('/auth/') && method === 'POST') {
      return 'auth';
    }

    // File upload operations
    if (
      path.includes('/upload') ||
      req.headers['content-type']?.includes('multipart/form-data')
    ) {
      return 'upload';
    }

    // API operations
    if (path.startsWith('/api/')) {
      return 'api';
    }

    return 'default';
  }

  private async checkRateLimit(
    clientInfo: ClientInfo,
    operationType: keyof OperationLimits,
    limits: { window: number; limit: number },
  ): Promise<RateLimitResult> {
    const redis = this.redis;
    if (!redis) {
      return {
        allowed: true,
        remaining: limits.limit,
        retryAfter: 0,
        resetTime: Date.now() + limits.window,
        currentCount: 0,
      };
    }
    const key = `rate_limit:${operationType}:${clientInfo.fingerprint}`;
    const now = Date.now();
    const windowStart = now - limits.window;

    // Use Redis sorted set to track requests in time window
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry on key
    pipeline.expire(key, Math.ceil(limits.window / 1000));

    const results = await pipeline.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    const allowed = currentCount < limits.limit;
    const retryAfter = allowed ? 0 : Math.ceil(limits.window / 1000);
    const resetTime = now + limits.window;

    const adjustedCount = currentCount + (allowed ? 1 : 0);
    return {
      allowed,
      remaining: Math.max(0, limits.limit - adjustedCount),
      retryAfter,
      resetTime,
      currentCount: adjustedCount,
    };
  }

  private async isIpLocked(ip: string): Promise<boolean> {
    const redis = this.redis;
    if (!redis) return false;

    try {
      // 确保Redis连接正常
      if (redis.status !== 'ready') {
        await redis.connect();
      }

      const key = `security_lock:${ip}`;
      const lockInfo = await redis.get(key);

      if (!lockInfo) {
        return false;
      }

      const { lockedUntil } = JSON.parse(lockInfo);
      const now = Date.now();

      if (now > lockedUntil) {
        // Lock expired, remove it
        await redis.del(key);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.warn(`Redis错误，跳过IP锁定检查 ${ip}:`, error.message);
      return false; // 发生错误时不阻止请求
    }
  }

  private async getLockInfo(ip: string) {
    const redis = this.redis;
    if (!redis) return null;
    const key = `security_lock:${ip}`;
    const lockInfo = await redis.get(key);
    return lockInfo ? (JSON.parse(lockInfo) as LockInfo) : null;
  }

  private async recordFailedAttempt(ip: string) {
    const redis = this.redis;
    if (!redis) return;

    try {
      // 确保Redis连接正常
      if (redis.status !== 'ready') {
        await redis.connect();
      }

      const key = `security_record:${ip}`;
      const now = Date.now();

      const recordStr = await redis.get(key);
      let record: SecurityRateLimitRecord;

      if (recordStr) {
        record = JSON.parse(recordStr);
      } else {
        record = {
          requests: 0,
          failedAttempts: 0,
          lastAttempt: now,
          suspiciousActivity: 0,
          firstSeen: now,
        };
      }

      record.failedAttempts += 1;
      record.lastAttempt = now;

      // Check for suspicious activity patterns
      if (record.failedAttempts >= this.suspiciousActivityThreshold) {
        record.suspiciousActivity += 1;

        // Lock IP if too many failed attempts
        if (record.failedAttempts >= this.maxFailedAttempts) {
          await this.lockIp(
            ip,
            now + this.lockoutDuration,
            'too_many_failed_attempts',
          );
          this.logger.warn(
            `IP ${ip} locked due to ${record.failedAttempts} failed attempts`,
          );

          // Send security alert if configured
          await this.sendSecurityAlert(ip, 'IP_LOCKED', {
            failedAttempts: record.failedAttempts,
            suspiciousActivity: record.suspiciousActivity,
            timestamp: new Date(now).toISOString(),
          });
        }
      }

      // Store updated record with expiry
      await redis.setex(key, 86400, JSON.stringify(record)); // 24 hours
    } catch (error) {
      this.logger.warn(`Redis错误，无法记录失败尝试 ${ip}:`, error.message);
    }
  }

  private async recordRequest(
    _clientInfo: ClientInfo,
    operationType: keyof OperationLimits,
  ) {
    const redis = this.redis;
    if (!redis) return;
    // Record successful request for analytics
    const key = `analytics:requests:${operationType}:${new Date().toISOString().split('T')[0]}`;
    await redis.incr(key);
    await redis.expire(key, 86400 * 30); // Keep for 30 days
  }

  private async lockIp(ip: string, lockedUntil: number, reason: string) {
    const redis = this.redis;
    if (!redis) {
      return;
    }
    const key = `security_lock:${ip}`;
    const lockData = {
      ip,
      lockedUntil,
      reason,
      lockedAt: Date.now(),
    };

    const ttl = Math.ceil((lockedUntil - Date.now()) / 1000);
    await redis.setex(key, ttl, JSON.stringify(lockData));
  }

  private async sendSecurityAlert(
    ip: string,
    eventType: string,
    details: Record<string, unknown>,
  ) {
    const webhookUrl = this.configService.get<string>('SECURITY_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.debug('Security webhook not configured, skipping alert');
      return;
    }

    try {
      const payload = {
        event: eventType,
        ip,
        timestamp: new Date().toISOString(),
        details,
        severity: 'HIGH',
      };

      // In a real implementation, you would send this to your monitoring system
      this.logger.warn(`Security Alert: ${eventType}`, payload);

      // Store alert for monitoring dashboard
      const redis = this.redis;
      if (redis) {
        const alertKey = `security_alerts:${Date.now()}`;
        await redis.setex(alertKey, 86400 * 7, JSON.stringify(payload)); // Keep for 7 days
      }
    } catch (error) {
      this.logger.error('Failed to send security alert:', error);
    }
  }

  private setRateLimitHeaders(
    res: Response,
    rateLimitResult: RateLimitResult,
  ) {
    res.setHeader(
      'X-RateLimit-Limit',
      rateLimitResult.currentCount.toString(),
    );
    res.setHeader(
      'X-RateLimit-Remaining',
      rateLimitResult.remaining.toString(),
    );
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetTime.toString());

    if (rateLimitResult.retryAfter > 0) {
      res.setHeader('Retry-After', rateLimitResult.retryAfter.toString());
    }
  }

  private getClientIP(req: Request): string {
    // Handle various proxy headers
    const forwarded = req.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return (
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-client-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  private generateFingerprint(ip: string, userAgent: string): string {
    // Simple fingerprinting - in production, you might want more sophisticated methods
    const combined = `${ip}:${userAgent}`;
    return Buffer.from(combined).toString('base64').slice(0, 32);
  }

  // Admin methods for monitoring and management
  /**
   * Retrieves security stats.
   * @param period - The period.
   * @returns The result of the operation.
   */
  async getSecurityStats(period: 'hour' | 'day' | 'week' = 'day') {
    const periodMs =
      period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
    const cutoff = Date.now() - periodMs;
    const redis = this.redis;
    if (!redis) {
      return {
        totalIPs: 0,
        lockedIPs: 0,
        suspiciousIPs: 0,
        totalFailedAttempts: 0,
        averageFailedAttempts: 0,
        topOffendingIPs: [] as Array<{
          ip: string;
          failedAttempts: number;
          lastAttempt: number;
        }>,
      };
    }

    // Get all security records
    const keys = await redis.keys('security_record:*');
    const stats = {
      totalIPs: 0,
      lockedIPs: 0,
      suspiciousIPs: 0,
      totalFailedAttempts: 0,
      averageFailedAttempts: 0,
      topOffendingIPs: [] as Array<{
        ip: string;
        failedAttempts: number;
        lastAttempt: number;
      }>,
    };

    for (const key of keys) {
      const recordStr = await redis.get(key);
      if (recordStr) {
        const record: SecurityRateLimitRecord = JSON.parse(recordStr);

        if (record.lastAttempt > cutoff) {
          stats.totalIPs += 1;
          stats.totalFailedAttempts += record.failedAttempts;

          if (record.suspiciousActivity > 0) {
            stats.suspiciousIPs += 1;
          }

          const ip = key.replace('security_record:', '');
          if (await this.isIpLocked(ip)) {
            stats.lockedIPs += 1;
          }

          stats.topOffendingIPs.push({
            ip,
            failedAttempts: record.failedAttempts,
            lastAttempt: record.lastAttempt,
          });
        }
      }
    }

    stats.averageFailedAttempts =
      stats.totalIPs > 0 ? stats.totalFailedAttempts / stats.totalIPs : 0;
    stats.topOffendingIPs
      .sort((a, b) => b.failedAttempts - a.failedAttempts)
      .slice(0, 10);

    return stats;
  }

  /**
   * Performs the unlock ip operation.
   * @param ip - The ip.
   * @param reason - The reason.
   * @returns The result of the operation.
   */
  async unlockIp(ip: string, reason = 'manual_unlock') {
    const redis = this.redis;
    if (!redis) {
      return false;
    }
    const key = `security_lock:${ip}`;
    const deleted = await redis.del(key);

    if (deleted > 0) {
      this.logger.log(`IP ${ip} manually unlocked: ${reason}`);
      return true;
    }

    return false;
  }

  /**
   * Retrieves locked i ps.
   * @returns The result of the operation.
   */
  async getLockedIPs() {
    const redis = this.redis;
    if (!redis) {
      return [] as Array<{
        ip: string;
        lockedUntil?: number;
        reason?: string;
        lockedAt?: number;
      }>;
    }
    const keys = await redis.keys('security_lock:*');
    const lockedIPs: Array<{
      ip: string;
      lockedUntil?: number;
      reason?: string;
      lockedAt?: number;
    }> = [];

    for (const key of keys) {
      const lockInfo = await redis.get(key);
      if (lockInfo) {
        const parsed = JSON.parse(lockInfo) as LockInfo & {
          lockedAt?: number;
        };
        if (parsed.lockedUntil > Date.now()) {
          lockedIPs.push({
            ip: key.replace('security_lock:', ''),
            ...parsed,
          });
        }
      }
    }

    return lockedIPs;
  }
}
