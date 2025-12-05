import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Service for login security including brute force protection.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);
  private readonly failedLoginAttempts = new Map<
    string,
    { count: number; lastAttempt: number }
  >();

  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Hashes an email for use as a client identifier.
   * @param email - The email to hash.
   * @returns The hashed email.
   */
  hashEmail(email: string): string {
    return createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  /**
   * Checks if an account is locked due to failed login attempts.
   * @param clientId - The hashed client identifier.
   * @returns True if the account is locked.
   */
  isAccountLocked(clientId: string): boolean {
    const attempts = this.failedLoginAttempts.get(clientId);
    if (!attempts) return false;

    return (
      attempts.count >= this.MAX_LOGIN_ATTEMPTS &&
      Date.now() - attempts.lastAttempt < this.LOCKOUT_DURATION
    );
  }

  /**
   * Records a failed login attempt for a client.
   * @param clientId - The hashed client identifier.
   */
  recordFailedLoginAttempt(clientId: string): void {
    const attempts = this.failedLoginAttempts.get(clientId) || {
      count: 0,
      lastAttempt: 0,
    };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.failedLoginAttempts.set(clientId, attempts);
  }

  /**
   * Resets failed login attempts for a client (on successful login).
   * @param clientId - The hashed client identifier.
   */
  resetFailedAttempts(clientId: string): void {
    this.failedLoginAttempts.delete(clientId);
  }

  /**
   * Gets the number of failed login attempts for a client.
   * @param clientId - The hashed client identifier.
   * @returns The number of failed attempts.
   */
  getFailedAttemptCount(clientId: string): number {
    return this.failedLoginAttempts.get(clientId)?.count ?? 0;
  }

  /**
   * Gets the total number of tracked clients with failed attempts.
   * @returns The number of clients being tracked.
   */
  getTrackedClientsCount(): number {
    return this.failedLoginAttempts.size;
  }

  /**
   * Gets the count of currently locked accounts.
   * @returns The number of locked accounts.
   */
  getLockedAccountsCount(): number {
    const now = Date.now();
    return Array.from(this.failedLoginAttempts.values()).filter(
      (attempts) =>
        attempts.count >= this.MAX_LOGIN_ATTEMPTS &&
        now - attempts.lastAttempt < this.LOCKOUT_DURATION,
    ).length;
  }

  /**
   * Gets security configuration values.
   * @returns Security configuration.
   */
  getSecurityConfig(): { maxAttempts: number; lockoutDuration: number } {
    return {
      maxAttempts: this.MAX_LOGIN_ATTEMPTS,
      lockoutDuration: this.LOCKOUT_DURATION,
    };
  }
}
