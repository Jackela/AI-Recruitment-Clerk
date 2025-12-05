import { Injectable, Logger } from '@nestjs/common';
import { RedisTokenBlacklistService } from '../../security/redis-token-blacklist.service';
import { LoginSecurityService } from './login-security.service';
import { SessionManagementService } from './session-management.service';

/**
 * Service for security metrics and health monitoring.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class SecurityMetricsService {
  private readonly logger = new Logger(SecurityMetricsService.name);

  constructor(
    private readonly tokenBlacklistService: RedisTokenBlacklistService,
    private readonly loginSecurityService: LoginSecurityService,
    private readonly sessionManagementService: SessionManagementService,
  ) {}

  /**
   * Get comprehensive security metrics.
   * @returns Security metrics including blacklisted tokens, failed attempts, and locked accounts.
   */
  async getSecurityMetrics(): Promise<{
    blacklistedTokensCount: number;
    failedLoginAttemptsCount: number;
    lockedAccountsCount: number;
    tokenBlacklistMetrics: any;
  }> {
    const tokenMetrics = this.tokenBlacklistService.getMetrics();

    return {
      blacklistedTokensCount: this.sessionManagementService.getBlacklistedTokensCount(),
      failedLoginAttemptsCount: this.loginSecurityService.getTrackedClientsCount(),
      lockedAccountsCount: this.loginSecurityService.getLockedAccountsCount(),
      tokenBlacklistMetrics: tokenMetrics,
    };
  }

  /**
   * Health check for authentication service.
   * @returns Health status including service status and memory usage.
   */
  async authHealthCheck(): Promise<{
    status: string;
    authService: string;
    tokenBlacklist: any;
    memoryUsage: {
      blacklistedTokens: number;
      failedAttempts: number;
    };
  }> {
    const tokenBlacklistHealth = await this.tokenBlacklistService.healthCheck();

    return {
      status: 'healthy',
      authService: 'operational',
      tokenBlacklist: tokenBlacklistHealth,
      memoryUsage: {
        blacklistedTokens: this.sessionManagementService.getBlacklistedTokensCount(),
        failedAttempts: this.loginSecurityService.getTrackedClientsCount(),
      },
    };
  }

  /**
   * Gets a summary of security state for logging/monitoring.
   * @returns Summary object with key security indicators.
   */
  getSecuritySummary(): {
    lockedAccounts: number;
    trackedClients: number;
    inMemoryBlacklistedTokens: number;
  } {
    return {
      lockedAccounts: this.loginSecurityService.getLockedAccountsCount(),
      trackedClients: this.loginSecurityService.getTrackedClientsCount(),
      inMemoryBlacklistedTokens: this.sessionManagementService.getBlacklistedTokensCount(),
    };
  }

  /**
   * Logs security metrics for monitoring systems.
   */
  logSecurityMetrics(): void {
    const summary = this.getSecuritySummary();
    this.logger.log(
      `Security metrics - Locked: ${summary.lockedAccounts}, Tracked: ${summary.trackedClients}, Blacklisted: ${summary.inMemoryBlacklistedTokens}`,
    );
  }
}
