import { Injectable, Logger } from '@nestjs/common';

interface TokenRecord {
  token: string;
  userId: string;
  blacklistedAt: number;
  expiresAt: number;
  reason: string;
}

/**
 * Provides redis token blacklist functionality.
 */
@Injectable()
export class RedisTokenBlacklistService {
  private readonly logger = new Logger(RedisTokenBlacklistService.name);
  private readonly blacklistedTokens = new Map<string, TokenRecord>();
  private readonly blacklistedUsers = new Set<string>();

  /**
   * Performs the is token blacklisted operation.
   * @param token - The token.
   * @returns A promise that resolves to boolean value.
   */
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

  /**
   * Backwards compatible alias for checking if a token is blacklisted.
   * @param token - The token.
   * @returns A promise that resolves to boolean value.
   */
  async isBlacklisted(token: string): Promise<boolean> {
    return this.isTokenBlacklisted(token);
  }

  /**
   * Performs the is user blacklisted operation.
   * @param userId - The user id.
   * @returns A promise that resolves to boolean value.
   */
  async isUserBlacklisted(userId: string): Promise<boolean> {
    return this.blacklistedUsers.has(userId);
  }

  /**
   * Performs the blacklist token operation.
   * @param token - The token.
   * @param userId - The user id.
   * @param exp - The exp.
   * @param reason - The reason.
   * @returns A promise that resolves when the operation completes.
   */
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

  /**
   * Backwards compatible alias for blacklisting a token.
   * @param token - The token.
   * @param userId - The user id.
   * @param exp - The exp.
   * @param reason - The reason.
   * @returns A promise that resolves when the operation completes.
   */
  async addToken(
    token: string,
    userId: string,
    exp: number,
    reason: string,
  ): Promise<void> {
    await this.blacklistToken(token, userId, exp, reason);
  }

  /**
   * Performs the blacklist all user tokens operation.
   * @param userId - The user id.
   * @param reason - The reason.
   * @returns A promise that resolves to number value.
   */
  async blacklistAllUserTokens(
    userId: string,
    reason: string,
  ): Promise<number> {
    this.blacklistedUsers.add(userId);

    // Count tokens for this user
    let count = 0;
    for (const [_token, record] of this.blacklistedTokens.entries()) {
      if (record.userId === userId) {
        count++;
      }
    }

    this.logger.warn(
      `All tokens blacklisted for user ${userId}, reason: ${reason}`,
    );
    return count;
  }

  /**
   * Retrieves metrics.
   * @returns The any.
   */
  getMetrics(): any {
    return {
      blacklistedTokensCount: this.blacklistedTokens.size,
      blacklistedUsersCount: this.blacklistedUsers.size,
      lastCleanup: Date.now(),
    };
  }

  /**
   * Performs the health check operation.
   * @returns A promise that resolves to any.
   */
  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      tokenStore: 'in-memory',
      blacklistedTokens: this.blacklistedTokens.size,
      blacklistedUsers: this.blacklistedUsers.size,
    };
  }

  // Cleanup expired tokens
  /**
   * Performs the cleanup operation.
   * @returns The number value.
   */
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
