import { Injectable, Logger } from '@nestjs/common';

interface TokenRecord {
  token: string;
  userId: string;
  blacklistedAt: number;
  expiresAt: number;
  reason: string;
}

@Injectable()
export class RedisTokenBlacklistService {
  private readonly logger = new Logger(RedisTokenBlacklistService.name);
  private readonly blacklistedTokens = new Map<string, TokenRecord>();
  private readonly blacklistedUsers = new Set<string>();

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const record = this.blacklistedTokens.get(token);
    if (!record) {
      return false;
    }

    // Clean up expired token
    if (Date.now() > record.expiresAt) {
      this.blacklistedTokens.delete(token);
      return false;
    }

    return true;
  }

  async isUserBlacklisted(userId: string): Promise<boolean> {
    return this.blacklistedUsers.has(userId);
  }

  async blacklistToken(
    token: string,
    userId: string,
    exp: number,
    reason: string,
  ): Promise<void> {
    const expiresAt = exp * 1000; // Convert to milliseconds
    const record: TokenRecord = {
      token,
      userId,
      blacklistedAt: Date.now(),
      expiresAt,
      reason,
    };

    this.blacklistedTokens.set(token, record);
    this.logger.debug(
      `Token blacklisted for user ${userId}, reason: ${reason}`,
    );
  }

  async blacklistAllUserTokens(
    userId: string,
    reason: string,
  ): Promise<number> {
    this.blacklistedUsers.add(userId);

    // Count tokens for this user
    let count = 0;
    for (const [token, record] of this.blacklistedTokens.entries()) {
      if (record.userId === userId) {
        count++;
      }
    }

    this.logger.warn(
      `All tokens blacklisted for user ${userId}, reason: ${reason}`,
    );
    return count;
  }

  getMetrics(): any {
    return {
      blacklistedTokensCount: this.blacklistedTokens.size,
      blacklistedUsersCount: this.blacklistedUsers.size,
      lastCleanup: Date.now(),
    };
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      tokenStore: 'in-memory',
      blacklistedTokens: this.blacklistedTokens.size,
      blacklistedUsers: this.blacklistedUsers.size,
    };
  }

  // Cleanup expired tokens
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [token, record] of this.blacklistedTokens.entries()) {
      if (now > record.expiresAt) {
        this.blacklistedTokens.delete(token);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired blacklisted tokens`);
    }

    return cleaned;
  }
}
