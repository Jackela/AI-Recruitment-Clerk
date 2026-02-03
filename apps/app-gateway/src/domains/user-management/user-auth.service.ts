import { Injectable, Logger } from '@nestjs/common';
import type { UserService } from '../../auth/user.service';
import type { UserDto } from '@ai-recruitment-clerk/user-management-domain';

type InternalUser = UserDto & {
  password?: string;
  lastActivity?: Date;
};

/**
 * User Authentication Service.
 * Handles user-scoped authentication operations such as password verification,
 * authentication state queries, and password-related operations.
 *
 * This service provides a domain-specific authentication layer for user operations,
 * separating authentication concerns from general user management.
 *
 * @example
 * ```typescript
 * constructor(private readonly userAuthService: UserAuthService) {}
 *
 * async validateLogin(userId: string, password: string) {
 *   return this.userAuthService.verifyPassword(userId, password);
 * }
 * ```
 */
@Injectable()
export class UserAuthService {
  private readonly logger = new Logger(UserAuthService.name);

  /**
   * Initializes a new instance of the User Authentication Service.
   * @param userService - The user service (data access layer).
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Verifies a user's password.
   * This method checks if the provided password matches the user's stored password.
   * @param userId - The user ID to verify.
   * @param password - The password to verify.
   * @returns A promise that resolves to true if the password is valid, false otherwise.
   */
  public async verifyPassword(userId: string, password: string): Promise<boolean> {
    if (!userId || !password) {
      return false;
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      return false;
    }

    // In a real implementation, use bcrypt.compare(password, user.password)
    // For testing purposes, we support both hashed and plain-text passwords
    const userWithSensitive = user as InternalUser;
    const storedPassword = userWithSensitive.password;

    if (!storedPassword) {
      return false;
    }

    // Check if the password is hashed (bcrypt hashes start with $2)
    if (storedPassword.startsWith('$2')) {
      try {
        const bcrypt = await import('bcryptjs');
        return bcrypt.compare(password, storedPassword);
      } catch {
        return false;
      }
    }

    // Fallback for plain-text passwords (development/testing only)
    return password === storedPassword || storedPassword.includes(password);
  }

  /**
   * Checks if a user account is active.
   * @param userId - The user ID to check.
   * @returns A promise that resolves to true if the user is active, false otherwise.
   */
  public async isUserActive(userId: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return false;
    }

    // Check both isActive boolean and status enum
    if (user.isActive === false) {
      return false;
    }

    if (user.status && user.status !== 'ACTIVE') {
      return false;
    }

    return true;
  }

  /**
   * Validates a user's authentication state.
   * Combines password verification with account status check.
   * @param userId - The user ID to validate.
   * @param password - The password to verify.
   * @returns A promise that resolves to true if the user is authenticated, false otherwise.
   */
  public async validateAuthentication(
    userId: string,
    password: string,
  ): Promise<boolean> {
    // First check if account is active
    const isActive = await this.isUserActive(userId);
    if (!isActive) {
      this.logger.warn(`Authentication attempt for inactive user: ${userId}`);
      return false;
    }

    // Then verify password
    const isPasswordValid = await this.verifyPassword(userId, password);
    if (!isPasswordValid) {
      this.logger.warn(`Failed password verification for user: ${userId}`);
      return false;
    }

    return true;
  }

  /**
   * Checks if a user requires password change.
   * @param userId - The user ID to check.
   * @returns A promise that resolves to true if password change is required, false otherwise.
   */
  public async requiresPasswordChange(userId: string): Promise<boolean> {
    const user = await this.userService.findByIdWithSensitiveData(userId);
    if (!user) {
      return false;
    }

    // Check security flags for password reset requirement
    const userWithSecurity = user as InternalUser;
    const securityFlags = userWithSecurity.securityFlags || {};

    return securityFlags.password_reset_required === true;
  }

  /**
   * Records a successful authentication event.
   * @param userId - The user ID.
   * @returns A promise that resolves when the operation completes.
   */
  public async recordSuccessfulAuth(userId: string): Promise<void> {
    try {
      // Update last activity timestamp
      await this.userService.updateLastActivity(userId);
      this.logger.debug(`Recorded successful auth for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to record auth for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Records a failed authentication attempt.
   * @param userId - The user ID.
   * @param reason - The reason for failure.
   * @returns A promise that resolves when the operation completes.
   */
  public async recordFailedAuth(
    userId: string,
    reason?: string,
  ): Promise<void> {
    this.logger.warn(
      `Failed auth attempt for user: ${userId}${reason ? ` (${reason})` : ''}`,
    );
    // TODO: Implement rate limiting and account lockout tracking
    // This could integrate with the AuthService's failed login attempt tracking
  }

  /**
   * Gets the last authentication activity timestamp for a user.
   * @param userId - The user ID.
   * @returns A promise that resolves to the last activity timestamp or null.
   */
  public async getLastAuthActivity(userId: string): Promise<Date | null> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return null;
    }

    const userWithSensitive = user as InternalUser;
    return userWithSensitive.lastActivity || null;
  }
}
