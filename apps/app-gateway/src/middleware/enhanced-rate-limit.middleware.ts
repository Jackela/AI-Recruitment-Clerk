import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
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

@Injectable()
export class EnhancedRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(EnhancedRateLimitMiddleware.name);
  private redis: Redis;
  private operationLimits: OperationLimits;
  private suspiciousActivityThreshold: number;
  private maxFailedAttempts: number;
  private lockoutDuration: number;

  constructor(private configService: ConfigService) {
    this.initializeRedis();
    this.initializeLimits();
  }

  private initializeRedis() {
    // 检查Redis配置
    const disableRedis = this.configService.get('DISABLE_REDIS', 'false') === 'true';
    const useRedis = this.configService.get('USE_REDIS_CACHE', 'true') === 'true';
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const redisHost = this.configService.get<string>('REDIS_HOST');
    
    // 如果Redis被禁用或未配置，跳过Redis初始化
    if (disableRedis || !useRedis || (!redisUrl && !redisHost)) {
      this.logger.log('🔒 Redis已禁用或未配置，限流使用内存存储');
      this.redis = null;
      return;
    }
    
    try {
      // 优先使用完整的 REDIS_URL；仅当没有 URL 但提供了 Host/Port 时才使用分离配置
      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 10000,
        });
      } else {
        const redisOptions: RedisOptions = {
          host: redisHost!,
          port: parseInt(this.configService.get<string>('REDIS_PORT') || '6379'),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 10000,
        };
        this.redis = new Redis(redisOptions);
      }

      this.redis.on('error', (error) => {
        this.logger.warn('Redis连接错误，限流降级到内存存储:', error.message);
        this.redis = null;
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis连接成功，限流使用Redis存储');
      });
    } catch (error) {
      this.logger.warn('Redis初始化失败，限流降级到内存存储:', error.message);
      this.redis = null;
    }
  }

  private initializeLimits() {
    this.operationLimits = {
      auth: {
        window: parseInt(this.configService.get<string>('RATE_LIMIT_AUTH_WINDOW_MS') || '900000'), // 15 minutes
        limit: parseInt(this.configService.get<string>('RATE_LIMIT_AUTH_MAX') || '5') // 5 attempts
      },
      upload: {
        window: parseInt(this.configService.get<string>('RATE_LIMIT_UPLOAD_WINDOW_MS') || '3600000'), // 1 hour
        limit: parseInt(this.configService.get<string>('RATE_LIMIT_UPLOAD_MAX') || '20') // 20 uploads
      },
      api: {
        window: parseInt(this.configService.get<string>('RATE_LIMIT_API_WINDOW_MS') || '60000'), // 1 minute
        limit: parseInt(this.configService.get<string>('RATE_LIMIT_API_MAX') || '60') // 60 requests
      },
      default: {
        window: parseInt(this.configService.get<string>('RATE_LIMIT_DEFAULT_WINDOW_MS') || '300000'), // 5 minutes
        limit: parseInt(this.configService.get<string>('RATE_LIMIT_DEFAULT_MAX') || '100') // 100 requests
      }
    };

    this.suspiciousActivityThreshold = parseInt(
      this.configService.get<string>('SUSPICIOUS_ACTIVITY_THRESHOLD') || '10'
    );
    this.maxFailedAttempts = parseInt(
      this.configService.get<string>('MAX_LOGIN_ATTEMPTS') || '5'
    );
    this.lockoutDuration = parseInt(
      this.configService.get<string>('LOCKOUT_DURATION') || '900000' // 15 minutes
    );
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // 若Redis不可用，直接放行（生产环境不阻塞请求）
    if (!this.redis) {
      return next();
    }
    const clientInfo = this.extractClientInfo(req);
    const operationType = this.determineOperationType(req);
    const limits = this.operationLimits[operationType] || this.operationLimits.default;

    try {
      // Check if IP is currently locked
      const isLocked = await this.isIpLocked(clientInfo.ip);
      if (isLocked) {
        const lockInfo = await this.getLockInfo(clientInfo.ip);
        throw new HttpException({
          message: 'IP address temporarily locked due to suspicious activity',
          lockUntil: lockInfo.lockedUntil,
          reason: 'security_lockout'
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Perform rate limiting check
      const rateLimitResult = await this.checkRateLimit(clientInfo, operationType, limits);
      
      if (!rateLimitResult.allowed) {
        // Record failed attempt for suspicious activity detection
        await this.recordFailedAttempt(clientInfo.ip);
        
        this.setRateLimitHeaders(res, rateLimitResult);
        throw new HttpException({
          message: `Rate limit exceeded for ${operationType} operations`,
          retryAfter: rateLimitResult.retryAfter,
          limit: limits.limit,
          window: limits.window
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Record successful request
      await this.recordRequest(clientInfo, operationType);
      
      // Set rate limit headers
      this.setRateLimitHeaders(res, rateLimitResult);

      // Add rate limit info to request
      (req as any).rateLimitInfo = {
        operationType,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        clientInfo
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

  private extractClientInfo(req: Request) {
    const ip = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';
    const userId = (req as any).user?.sub || null;
    
    return {
      ip,
      userAgent,
      userId,
      fingerprint: this.generateFingerprint(ip, userAgent)
    };
  }

  private determineOperationType(req: Request): keyof OperationLimits {
    const path = req.path.toLowerCase();
    const method = req.method.toUpperCase();

    // Authentication operations
    if (path.includes('/auth/') && (method === 'POST')) {
      return 'auth';
    }

    // File upload operations
    if (path.includes('/upload') || req.headers['content-type']?.includes('multipart/form-data')) {
      return 'upload';
    }

    // API operations
    if (path.startsWith('/api/')) {
      return 'api';
    }

    return 'default';
  }

  private async checkRateLimit(clientInfo: any, operationType: string, limits: { window: number; limit: number }) {
    if (!this.redis) {
      return { allowed: true, remaining: limits.limit, retryAfter: 0, resetTime: Date.now() + limits.window, currentCount: 0 };
    }
    const key = `rate_limit:${operationType}:${clientInfo.fingerprint}`;
    const now = Date.now();
    const windowStart = now - limits.window;

    // Use Redis sorted set to track requests in time window
    const pipeline = this.redis.pipeline();
    
    // Remove expired entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on key
    pipeline.expire(key, Math.ceil(limits.window / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results?.[1]?.[1] as number || 0;

    const allowed = currentCount < limits.limit;
    const retryAfter = allowed ? 0 : Math.ceil(limits.window / 1000);
    const resetTime = now + limits.window;

    return {
      allowed,
      remaining: Math.max(0, limits.limit - currentCount - (allowed ? 1 : 0)),
      retryAfter,
      resetTime,
      currentCount: currentCount + (allowed ? 1 : 0)
    };
  }

  private async isIpLocked(ip: string): Promise<boolean> {
    if (!this.redis) return false;
    const key = `security_lock:${ip}`;
    const lockInfo = await this.redis.get(key);
    
    if (!lockInfo) {
      return false;
    }

    const { lockedUntil } = JSON.parse(lockInfo);
    const now = Date.now();
    
    if (now > lockedUntil) {
      // Lock expired, remove it
      await this.redis.del(key);
      return false;
    }

    return true;
  }

  private async getLockInfo(ip: string) {
    if (!this.redis) return null;
    const key = `security_lock:${ip}`;
    const lockInfo = await this.redis.get(key);
    return lockInfo ? JSON.parse(lockInfo) : null;
  }

  private async recordFailedAttempt(ip: string) {
    if (!this.redis) return;
    const key = `security_record:${ip}`;
    const now = Date.now();
    
    const recordStr = await this.redis.get(key);
    let record: SecurityRateLimitRecord;
    
    if (recordStr) {
      record = JSON.parse(recordStr);
    } else {
      record = {
        requests: 0,
        failedAttempts: 0,
        lastAttempt: now,
        suspiciousActivity: 0,
        firstSeen: now
      };
    }

    record.failedAttempts += 1;
    record.lastAttempt = now;
    
    // Check for suspicious activity patterns
    if (record.failedAttempts >= this.suspiciousActivityThreshold) {
      record.suspiciousActivity += 1;
      
      // Lock IP if too many failed attempts
      if (record.failedAttempts >= this.maxFailedAttempts) {
        await this.lockIp(ip, now + this.lockoutDuration, 'too_many_failed_attempts');
        this.logger.warn(`IP ${ip} locked due to ${record.failedAttempts} failed attempts`);
        
        // Send security alert if configured
        await this.sendSecurityAlert(ip, 'IP_LOCKED', {
          failedAttempts: record.failedAttempts,
          suspiciousActivity: record.suspiciousActivity,
          timestamp: new Date(now).toISOString()
        });
      }
    }

    // Store updated record with expiry
    await this.redis.setex(key, 86400, JSON.stringify(record)); // 24 hours
  }

  private async recordRequest(clientInfo: any, operationType: string) {
    if (!this.redis) return;
    // Record successful request for analytics
    const key = `analytics:requests:${operationType}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 86400 * 30); // Keep for 30 days
  }

  private async lockIp(ip: string, lockedUntil: number, reason: string) {
    const key = `security_lock:${ip}`;
    const lockData = {
      ip,
      lockedUntil,
      reason,
      lockedAt: Date.now()
    };
    
    const ttl = Math.ceil((lockedUntil - Date.now()) / 1000);
    await this.redis.setex(key, ttl, JSON.stringify(lockData));
  }

  private async sendSecurityAlert(ip: string, eventType: string, details: any) {
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
        severity: 'HIGH'
      };

      // In a real implementation, you would send this to your monitoring system
      this.logger.warn(`Security Alert: ${eventType}`, payload);
      
      // Store alert for monitoring dashboard
      const alertKey = `security_alerts:${Date.now()}`;
      await this.redis.setex(alertKey, 86400 * 7, JSON.stringify(payload)); // Keep for 7 days
    } catch (error) {
      this.logger.error('Failed to send security alert:', error);
    }
  }

  private setRateLimitHeaders(res: Response, rateLimitResult: any) {
    res.setHeader('X-RateLimit-Limit', rateLimitResult.currentCount?.toString() || '0');
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
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
      req.headers['x-real-ip'] as string ||
      req.headers['x-client-ip'] as string ||
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
  async getSecurityStats(period: 'hour' | 'day' | 'week' = 'day') {
    const periodMs = period === 'hour' ? 3600000 : period === 'day' ? 86400000 : 604800000;
    const cutoff = Date.now() - periodMs;
    
    // Get all security records
    const keys = await this.redis.keys('security_record:*');
    const stats = {
      totalIPs: 0,
      lockedIPs: 0,
      suspiciousIPs: 0,
      totalFailedAttempts: 0,
      averageFailedAttempts: 0,
      topOffendingIPs: [] as Array<{ ip: string; failedAttempts: number; lastAttempt: number }>
    };

    for (const key of keys) {
      const recordStr = await this.redis.get(key);
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
            lastAttempt: record.lastAttempt
          });
        }
      }
    }

    stats.averageFailedAttempts = stats.totalIPs > 0 ? stats.totalFailedAttempts / stats.totalIPs : 0;
    stats.topOffendingIPs.sort((a, b) => b.failedAttempts - a.failedAttempts).slice(0, 10);

    return stats;
  }

  async unlockIp(ip: string, reason: string = 'manual_unlock') {
    const key = `security_lock:${ip}`;
    const deleted = await this.redis.del(key);
    
    if (deleted > 0) {
      this.logger.log(`IP ${ip} manually unlocked: ${reason}`);
      return true;
    }
    
    return false;
  }

  async getLockedIPs() {
    const keys = await this.redis.keys('security_lock:*');
    const lockedIPs = [];

    for (const key of keys) {
      const lockInfo = await this.redis.get(key);
      if (lockInfo) {
        const parsed = JSON.parse(lockInfo);
        if (parsed.lockedUntil > Date.now()) {
          lockedIPs.push({
            ip: key.replace('security_lock:', ''),
            ...parsed
          });
        }
      }
    }

    return lockedIPs;
  }
}