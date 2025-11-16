import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { getConfig } from '@ai-recruitment-clerk/configuration';

interface UsageRecord {
  count: number;
  questionnaires: number;
  payments: number;
  lastReset: string;
}

type RequestWithUsage = Request & {
  usageInfo?: {
    ip: string;
    currentUsage: number;
    totalLimit: number;
    remaining: number;
  };
};

/**
 * Represents the rate limit middleware.
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis | null;

  /**
   * Initializes a new instance of the Rate Limit Middleware.
   */
  constructor() {
    const config = getConfig();
    const redisSettings = config.cache.redis;

    if (
      redisSettings.disabled ||
      !redisSettings.enabled ||
      (!redisSettings.url && !redisSettings.host)
    ) {
      this.logger.log('🔒 Redis已禁用或未配置，限流使用内存存储');
      this.redis = null;
      return;
    }

    try {
      // 优先使用完整的 REDIS_URL；仅当没有 URL 但提供了 Host/Port 时才使用分离配置
      if (redisSettings.url) {
        this.redis = new Redis(redisSettings.url, {
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          enableOfflineQueue: true,
          connectTimeout: 10000,
        });
      } else {
        const host = redisSettings.host;
        if (!host) {
          this.logger.warn(
            'Redis host not configured; disabling rate-limit redis integration',
          );
          this.redis = null;
          return;
        }
        this.redis = new Redis({
          host,
          port: redisSettings.port ?? 6379,
          password: redisSettings.password,
          maxRetriesPerRequest: 3,
          lazyConnect: false,
          enableOfflineQueue: true,
          connectTimeout: 10000,
        });
      }
    } catch (error) {
      this.logger.warn(`Redis初始化失败，限流降级到内存存储: ${error.message}`);
      this.redis = null;
    }
  }

  /**
   * Performs the use operation.
   * @param req - The req.
   * @param res - The res.
   * @param next - The next.
   * @returns The result of the operation.
   */
  async use(req: Request, res: Response, next: NextFunction) {
    // 如果Redis不可用，跳过限流检查
    const redis = this.redis;
    if (!redis) {
      return next();
    }

    const ip = this.getClientIP(req);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `rate_limit:${ip}:${today}`;

    try {
      // 获取当前IP的使用记录
      const recordStr = await redis.get(key);
      let record: UsageRecord = recordStr
        ? JSON.parse(recordStr)
        : { count: 0, questionnaires: 0, payments: 0, lastReset: today };

      // 检查是否需要重置（跨天）
      if (record.lastReset !== today) {
        record = { count: 0, questionnaires: 0, payments: 0, lastReset: today };
      }

      // 计算当前可用次数
      const baseLimit = 5; // 基础免费5次
      const questionnaireBonus = record.questionnaires * 5; // 每个问卷+5次
      const paymentBonus = record.payments * 5; // 每次支付+5次
      const totalLimit = baseLimit + questionnaireBonus + paymentBonus;

      // 检查限制
      if (record.count >= totalLimit) {
        // 返回限制信息而不是直接拒绝
        res.setHeader('X-RateLimit-Limit', totalLimit.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader(
          'X-RateLimit-Reset',
          this.getTomorrowTimestamp().toString(),
        );

        throw new HttpException(
          {
            message: '今日使用次数已用完',
            currentUsage: record.count,
            totalLimit: totalLimit,
            resetTime: this.getTomorrowTimestamp(),
            upgradeOptions: [
              {
                type: 'questionnaire',
                description: '完成问卷调研可获得5次额外使用',
                available: true,
              },
              {
                type: 'payment',
                description: '支付5元红包可获得5次额外使用',
                available: true,
              },
            ],
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 记录本次使用
      record.count += 1;
      await redis.setex(key, 86400, JSON.stringify(record)); // 24小时过期

      // 设置响应头
      res.setHeader('X-RateLimit-Limit', totalLimit.toString());
      res.setHeader(
        'X-RateLimit-Remaining',
        (totalLimit - record.count).toString(),
      );
      res.setHeader(
        'X-RateLimit-Reset',
        this.getTomorrowTimestamp().toString(),
      );

      // 添加使用信息到请求对象
      const requestWithUsage = req as RequestWithUsage;
      requestWithUsage.usageInfo = {
        ip,
        currentUsage: record.count,
        totalLimit,
        remaining: totalLimit - record.count,
      };

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Rate limit error', error.stack || error.message);
      next(); // 出错时不阻塞请求
    }
  }

  // 问卷完成后增加使用次数
  /**
   * Performs the complete questionnaire operation.
   * @param ip - The ip.
   * @returns The Promise<{ success: boolean; newLimit: number; remaining: number; }>.
   */
  async completeQuestionnaire(ip: string): Promise<{
    success: boolean;
    newLimit: number;
    remaining: number;
  }> {
    // 如果Redis不可用，返回默认值
    const redis = this.redis;
    if (!redis) {
      return { success: true, newLimit: 10, remaining: 10 };
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${ip}:${today}`;

    try {
      const recordStr = await redis.get(key);
      const record: UsageRecord = recordStr
        ? JSON.parse(recordStr)
        : { count: 0, questionnaires: 0, payments: 0, lastReset: today };

      record.questionnaires += 1;
      await redis.setex(key, 86400, JSON.stringify(record));

      const newLimit = 5 + record.questionnaires * 5 + record.payments * 5;
      const remaining = newLimit - record.count;

      return {
        success: true,
        newLimit,
        remaining: Math.max(0, remaining),
      };
    } catch (error) {
      this.logger.error(
        'Complete questionnaire error',
        error.stack || error.message,
      );
      return { success: false, newLimit: 5, remaining: 0 };
    }
  }

  // 支付完成后增加使用次数
  /**
   * Performs the complete payment operation.
   * @param ip - The ip.
   * @param paymentId - The payment id.
   * @returns The Promise<{ success: boolean; newLimit: number; remaining: number; }>.
   */
  async completePayment(
    ip: string,
    paymentId: string,
  ): Promise<{
    success: boolean;
    newLimit: number;
    remaining: number;
  }> {
    const redis = this.redis;
    if (!redis) {
      return { success: true, newLimit: 10, remaining: 10 };
    }
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${ip}:${today}`;
    const paymentKey = `payment:${paymentId}:${ip}:${today}`;

    try {
      // 检查支付是否已经使用过
      const paymentUsed = await redis.get(paymentKey);
      if (paymentUsed) {
        return { success: false, newLimit: 5, remaining: 0 };
      }

      const recordStr = await redis.get(key);
      const record: UsageRecord = recordStr
        ? JSON.parse(recordStr)
        : { count: 0, questionnaires: 0, payments: 0, lastReset: today };

      record.payments += 1;
      await redis.setex(key, 86400, JSON.stringify(record));
      await redis.setex(paymentKey, 86400, 'used'); // 标记支付已使用

      const newLimit = 5 + record.questionnaires * 5 + record.payments * 5;
      const remaining = newLimit - record.count;

      return {
        success: true,
        newLimit,
        remaining: Math.max(0, remaining),
      };
    } catch (error) {
      this.logger.error('Complete payment error', error.stack || error.message);
      return { success: false, newLimit: 5, remaining: 0 };
    }
  }

  // 获取当前使用状态
  /**
   * Retrieves usage status.
   * @param ip - The ip.
   * @returns The Promise<{ currentUsage: number; totalLimit: number; remaining: number; resetTime: number; upgrades: { questionnaires: number; payments: number; }; }>.
   */
  async getUsageStatus(ip: string): Promise<{
    currentUsage: number;
    totalLimit: number;
    remaining: number;
    resetTime: number;
    upgrades: {
      questionnaires: number;
      payments: number;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const key = `rate_limit:${ip}:${today}`;
    const redis = this.redis;

    if (!redis) {
      const totalLimit = 5;
      return {
        currentUsage: 0,
        totalLimit,
        remaining: totalLimit,
        resetTime: this.getTomorrowTimestamp(),
        upgrades: { questionnaires: 0, payments: 0 },
      };
    }

    try {
      const recordStr = await redis.get(key);
      const record: UsageRecord = recordStr
        ? JSON.parse(recordStr)
        : { count: 0, questionnaires: 0, payments: 0, lastReset: today };

      const totalLimit = 5 + record.questionnaires * 5 + record.payments * 5;

      return {
        currentUsage: record.count,
        totalLimit,
        remaining: Math.max(0, totalLimit - record.count),
        resetTime: this.getTomorrowTimestamp(),
        upgrades: {
          questionnaires: record.questionnaires,
          payments: record.payments,
        },
      };
    } catch (error) {
      this.logger.error('Get usage status error', error.stack || error.message);
      return {
        currentUsage: 0,
        totalLimit: 5,
        remaining: 5,
        resetTime: this.getTomorrowTimestamp(),
        upgrades: { questionnaires: 0, payments: 0 },
      };
    }
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  private getTomorrowTimestamp(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  // 获取统计数据（管理用）
  /**
   * Retrieves daily stats.
   * @param date - The date.
   * @returns The Promise<{ date: string; totalIPs: number; totalRequests: number; questionnairesCompleted: number; paymentsCompleted: number; averageUsagePerIP: number; }>.
   */
  async getDailyStats(date?: string): Promise<{
    date: string;
    totalIPs: number;
    totalRequests: number;
    questionnairesCompleted: number;
    paymentsCompleted: number;
    averageUsagePerIP: number;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const pattern = `rate_limit:*:${targetDate}`;
    const redis = this.redis;

    if (!redis) {
      return {
        date: targetDate,
        totalIPs: 0,
        totalRequests: 0,
        questionnairesCompleted: 0,
        paymentsCompleted: 0,
        averageUsagePerIP: 0,
      };
    }

    try {
      const keys = await redis.keys(pattern);
      let totalRequests = 0;
      let totalQuestionnaires = 0;
      let totalPayments = 0;

      for (const key of keys) {
        const recordStr = await redis.get(key);
        if (recordStr) {
          const record: UsageRecord = JSON.parse(recordStr);
          totalRequests += record.count;
          totalQuestionnaires += record.questionnaires;
          totalPayments += record.payments;
        }
      }

      return {
        date: targetDate,
        totalIPs: keys.length,
        totalRequests,
        questionnairesCompleted: totalQuestionnaires,
        paymentsCompleted: totalPayments,
        averageUsagePerIP:
          keys.length > 0
            ? Math.round((totalRequests / keys.length) * 100) / 100
            : 0,
      };
    } catch (error) {
      this.logger.error('Get daily stats error', error.stack || error.message);
      return {
        date: targetDate,
        totalIPs: 0,
        totalRequests: 0,
        questionnairesCompleted: 0,
        paymentsCompleted: 0,
        averageUsagePerIP: 0,
      };
    }
  }
}
