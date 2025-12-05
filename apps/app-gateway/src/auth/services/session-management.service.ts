import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user.service';
import { RedisTokenBlacklistService } from '../../security/redis-token-blacklist.service';

/**
 * Service for session management including logout and token revocation.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class SessionManagementService {
  private readonly logger = new Logger(SessionManagementService.name);
  private readonly blacklistedTokens = new Map<string, number>();
  private readonly TOKEN_BLACKLIST_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly tokenBlacklistService: RedisTokenBlacklistService,
  ) {
    // Start periodic cleanup of expired blacklisted tokens - skip in test environment
    if (process.env.NODE_ENV !== 'test') {
      setInterval(
        () => this.cleanupBlacklistedTokens(),
        this.TOKEN_BLACKLIST_CLEANUP_INTERVAL,
      );
    }
  }

  /**
   * Logs out a user by blacklisting their tokens.
   * @param userIdOrToken - The user id or access token.
   * @param accessToken - The access token (optional).
   * @param refreshToken - The refresh token (optional).
   * @returns A promise that resolves when the operation completes.
   */
  async logout(
    userIdOrToken: string,
    accessToken?: string,
    refreshToken?: string,
  ): Promise<void> {
    let userId = userIdOrToken;
    try {
      const tokenOnlyMode = !accessToken && !refreshToken;

      if (tokenOnlyMode) {
        accessToken = userIdOrToken;
        const decoded = this.decodeToken(accessToken);
        if (decoded?.sub) {
          userId = decoded.sub;
        }
      }

      // Blacklist tokens using Redis-based service
      if (accessToken) {
        await this.blacklistToken(accessToken, userId, 'logout');
      }

      if (refreshToken) {
        await this.blacklistToken(refreshToken, userId, 'logout');
      }

      if (
        !tokenOnlyMode &&
        typeof (this.userService as any).updateLastActivity === 'function'
      ) {
        await this.userService.updateLastActivity(userId);
      }
      this.logger.log(`User logged out successfully: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Emergency security response: Blacklist all tokens for a user.
   * Use this when a security breach is detected.
   * @param userId - The user id.
   * @param reason - The reason for revocation.
   * @returns A promise that resolves when the operation completes.
   */
  async emergencyRevokeAllUserTokens(
    userId: string,
    reason = 'security_breach',
  ): Promise<void> {
    try {
      const blacklistedCount =
        await this.tokenBlacklistService.blacklistAllUserTokens(userId, reason);
      await this.userService.updateSecurityFlag(userId, 'tokens_revoked', true);

      this.logger.warn(
        `🚨 Emergency token revocation for user ${userId}: ${reason}`,
      );
      this.logger.log(
        `Blacklisted ${blacklistedCount} tokens for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Emergency token revocation failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Blacklists a single token.
   * @param token - The token to blacklist.
   * @param userId - The user id.
   * @param reason - The reason for blacklisting.
   */
  private async blacklistToken(
    token: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    try {
      const decoded = this.decodeToken(token);
      const exp =
        decoded && typeof decoded.exp === 'number'
          ? decoded.exp
          : Math.floor(Date.now() / 1000) + 60;

      await this.tokenBlacklistService.blacklistToken(
        token,
        userId,
        exp,
        reason,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to blacklist token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decodes a JWT token without validation.
   * @param token - The token to decode.
   * @returns The decoded payload or null.
   */
  private decodeToken(token: string): any {
    return typeof this.jwtService.decode === 'function'
      ? this.jwtService.decode(token)
      : null;
  }

  /**
   * Cleans up expired blacklisted tokens from in-memory cache.
   */
  cleanupBlacklistedTokens(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [tokenHash, exp] of this.blacklistedTokens.entries()) {
      if (now > exp) {
        this.blacklistedTokens.delete(tokenHash);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} expired blacklisted tokens`,
      );
    }
  }

  /**
   * Gets the count of in-memory blacklisted tokens.
   * @returns The number of blacklisted tokens.
   */
  getBlacklistedTokensCount(): number {
    return this.blacklistedTokens.size;
  }
}
