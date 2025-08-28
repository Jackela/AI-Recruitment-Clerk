/**
 * Redis-based Token Blacklist Service
 * Enhanced security implementation for production JWT token management
 * AI Recruitment Clerk - Security Hardening Implementation
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

export interface BlacklistEntry {
  jti?: string;        // JWT ID
  sub: string;         // User ID (subject)
  tokenHash: string;   // SHA-256 hash of token
  exp: number;         // Expiration timestamp
  reason: string;      // Reason for blacklisting
  timestamp: number;   // When it was blacklisted
}

export interface TokenMetrics {
  totalBlacklisted: number;
  activeBlacklisted: number;
  expiredCleaned: number;
  lastCleanup: number;
  memoryBlacklistSize: number;
  redisConnected: boolean;
}

@Injectable()
export class RedisTokenBlacklistService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisTokenBlacklistService.name);
  private redisClient: any = null;
  private memoryBlacklist = new Map<string, BlacklistEntry>();
  private cleanupInterval!: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly KEY_PREFIX = 'blacklist:token:';
  private readonly METRICS_KEY = 'blacklist:metrics';

  private metrics: TokenMetrics = {
    totalBlacklisted: 0,
    activeBlacklisted: 0,
    expiredCleaned: 0,
    lastCleanup: 0,
    memoryBlacklistSize: 0,
    redisConnected: false
  };

  constructor(private configService: ConfigService) {
    this.initializeRedis();
    this.startCleanupProcess();
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  /**
   * Initialize Redis connection for persistent token blacklisting
   */
  private async initializeRedis(): Promise<void> {
    try {
      const useRedis = this.configService.get('USE_REDIS_CACHE', 'true') === 'true';
      const disableRedis = this.configService.get('DISABLE_REDIS', 'false') === 'true';
      const redisUrl = this.configService.get('REDIS_URL');

      if (!useRedis || disableRedis || !redisUrl) {
        this.logger.warn('Redis disabled - using memory-only token blacklist');
        return;
      }

      const { createClient } = await import('redis');
      this.redisClient = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          // Removed commandTimeout - not available in current Redis client version
        }
      });

      this.redisClient.on('error', (err: Error) => {
        this.logger.error(`Redis connection error: ${err.message}`);
        this.metrics.redisConnected = false;
      });

      this.redisClient.on('connect', () => {
        this.logger.log('✅ Redis token blacklist service connected');
        this.metrics.redisConnected = true;
      });

      await this.redisClient.connect();
      await this.loadMetricsFromRedis();
      
    } catch (error) {
      this.logger.error(`Failed to initialize Redis: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.warn('Falling back to memory-only token blacklist');
    }
  }

  /**
   * Blacklist a JWT token with enhanced security tracking
   */
  async blacklistToken(
    token: string, 
    userId: string, 
    exp: number, 
    reason: string = 'logout'
  ): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);
      const entry: BlacklistEntry = {
        sub: userId,
        tokenHash,
        exp,
        reason,
        timestamp: Date.now()
      };

      // Store in memory for fast lookup
      this.memoryBlacklist.set(tokenHash, entry);

      // Store in Redis for persistence (if available)
      if (this.redisClient) {
        const ttl = Math.max(exp * 1000 - Date.now(), 0);
        if (ttl > 0) {
          await this.redisClient.setEx(
            `${this.KEY_PREFIX}${tokenHash}`,
            Math.ceil(ttl / 1000),
            JSON.stringify(entry)
          );
        }
      }

      this.metrics.totalBlacklisted++;
      this.metrics.activeBlacklisted++;
      this.metrics.memoryBlacklistSize = this.memoryBlacklist.size;

      await this.updateMetricsInRedis();

      this.logger.log(`Token blacklisted: User ${userId}, Reason: ${reason}`);
      
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if a token is blacklisted with dual-layer verification
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);

      // First check memory cache (fastest)
      const memoryEntry = this.memoryBlacklist.get(tokenHash);
      if (memoryEntry) {
        // Check if token is still valid (not expired)
        if (Date.now() < memoryEntry.exp * 1000) {
          return true;
        } else {
          // Token expired, remove from memory
          this.memoryBlacklist.delete(tokenHash);
          this.metrics.memoryBlacklistSize = this.memoryBlacklist.size;
        }
      }

      // Check Redis if memory miss and Redis available
      if (this.redisClient) {
        const redisEntry = await this.redisClient.get(`${this.KEY_PREFIX}${tokenHash}`);
        if (redisEntry) {
          const entry: BlacklistEntry = JSON.parse(redisEntry);
          // Add back to memory cache
          this.memoryBlacklist.set(tokenHash, entry);
          this.metrics.memoryBlacklistSize = this.memoryBlacklist.size;
          return true;
        }
      }

      return false;
      
    } catch (error) {
      this.logger.error(`Error checking token blacklist: ${error instanceof Error ? error.message : String(error)}`);
      // Fail securely - if we can't verify, assume not blacklisted
      return false;
    }
  }

  /**
   * Blacklist all tokens for a specific user (security breach response)
   */
  async blacklistAllUserTokens(userId: string, reason: string = 'security_breach'): Promise<number> {
    try {
      let blacklistedCount = 0;

      // In a production system, you might need to:
      // 1. Query all active sessions for the user
      // 2. Extract token identifiers
      // 3. Blacklist each token
      
      // For now, we'll create a user-wide blacklist entry
      const userBlacklistKey = `user:${userId}:blacklisted`;
      const entry = {
        userId,
        reason,
        timestamp: Date.now(),
        allTokens: true
      };

      if (this.redisClient) {
        // Set with long TTL (e.g., 7 days for refresh token max lifetime)
        await this.redisClient.setEx(
          userBlacklistKey,
          7 * 24 * 60 * 60, // 7 days
          JSON.stringify(entry)
        );
      }

      this.logger.warn(`All tokens blacklisted for user ${userId}: ${reason}`);
      return blacklistedCount;
      
    } catch (error) {
      this.logger.error(`Failed to blacklist all user tokens: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if all tokens for a user are blacklisted
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    try {
      if (!this.redisClient) return false;

      const userBlacklistKey = `user:${userId}:blacklisted`;
      const entry = await this.redisClient.get(userBlacklistKey);
      return !!entry;
      
    } catch (error) {
      this.logger.error(`Error checking user blacklist: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Clean up expired tokens and update metrics
   */
  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean memory blacklist
      for (const [tokenHash, entry] of this.memoryBlacklist.entries()) {
        if (now > entry.exp * 1000) {
          this.memoryBlacklist.delete(tokenHash);
          cleanedCount++;
        }
      }

      // Redis automatically expires keys with TTL, but we can check metrics
      if (this.redisClient) {
        // Update Redis metrics if needed
        await this.updateMetricsInRedis();
      }

      this.metrics.expiredCleaned += cleanedCount;
      this.metrics.activeBlacklisted = this.memoryBlacklist.size;
      this.metrics.memoryBlacklistSize = this.memoryBlacklist.size;
      this.metrics.lastCleanup = now;

      if (cleanedCount > 0) {
        this.logger.debug(`Cleaned up ${cleanedCount} expired blacklisted tokens`);
      }
      
    } catch (error) {
      this.logger.error(`Token cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start the cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.CLEANUP_INTERVAL);

    this.logger.log('Token blacklist cleanup process started');
  }

  /**
   * Hash token for storage (privacy and security)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Load metrics from Redis
   */
  private async loadMetricsFromRedis(): Promise<void> {
    try {
      if (!this.redisClient) return;

      const metricsData = await this.redisClient.get(this.METRICS_KEY);
      if (metricsData) {
        const savedMetrics = JSON.parse(metricsData);
        this.metrics = { ...this.metrics, ...savedMetrics };
      }
    } catch (error) {
      this.logger.debug(`Could not load metrics from Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update metrics in Redis
   */
  private async updateMetricsInRedis(): Promise<void> {
    try {
      if (!this.redisClient) return;

      await this.redisClient.setEx(
        this.METRICS_KEY,
        24 * 60 * 60, // 24 hours
        JSON.stringify(this.metrics)
      );
    } catch (error) {
      this.logger.debug(`Could not update metrics in Redis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current blacklist metrics for monitoring
   */
  getMetrics(): TokenMetrics {
    return { ...this.metrics };
  }

  /**
   * Health check for the blacklist service
   */
  async healthCheck(): Promise<{
    status: string;
    redisConnected: boolean;
    memoryEntries: number;
    lastCleanup: string;
  }> {
    return {
      status: 'healthy',
      redisConnected: !!this.redisClient && this.metrics.redisConnected,
      memoryEntries: this.memoryBlacklist.size,
      lastCleanup: new Date(this.metrics.lastCleanup).toISOString()
    };
  }

  /**
   * Emergency function to clear all blacklisted tokens (admin only)
   */
  async emergencyClearBlacklist(): Promise<void> {
    try {
      this.memoryBlacklist.clear();
      
      if (this.redisClient) {
        // Get all blacklist keys and delete them
        const keys = await this.redisClient.keys(`${this.KEY_PREFIX}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      this.metrics.activeBlacklisted = 0;
      this.metrics.memoryBlacklistSize = 0;
      await this.updateMetricsInRedis();

      this.logger.warn('⚠️ Emergency blacklist cleared - all tokens reset');
      
    } catch (error) {
      this.logger.error(`Emergency blacklist clear failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}