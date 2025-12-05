import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user.service';
import { UserDto, UserStatus } from '@ai-recruitment-clerk/user-management-domain';

/**
 * Service for user validation and response preparation.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class UserValidationService {
  private readonly logger = new Logger(UserValidationService.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Validates user credentials during login.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns A promise that resolves to UserDto if valid, null otherwise.
   */
  async validateUser(email: string, password: string): Promise<UserDto | null> {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (user.isActive === false) {
      return null;
    }

    if (user.status && user.status !== UserStatus.ACTIVE) {
      return null;
    }

    const isPasswordValid = await this.userService.validatePassword(
      user.id,
      password,
    );
    if (!isPasswordValid) {
      return null;
    }

    return this.prepareUserForResponse(user);
  }

  /**
   * Normalizes user role to lowercase string.
   * @param user - The user.
   * @returns Normalized role string or undefined.
   */
  normalizeRole(user: UserDto): string | undefined {
    const rawRole =
      (user as any)?.rawRole !== undefined
        ? (user as any).rawRole
        : user.role;

    if (typeof rawRole === 'string') {
      return rawRole.toLowerCase();
    }

    return rawRole;
  }

  /**
   * Prepares user object for API response by removing sensitive data.
   * @param user - The user.
   * @returns Sanitized user object.
   */
  prepareUserForResponse(user: UserDto): UserDto {
    const normalizedRole = this.normalizeRole(user);
    const safeUser: UserDto = {
      id: user.id,
      email: user.email,
      username: (user as any)?.username,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name ?? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      role: normalizedRole ?? user.role,
      organizationId: user.organizationId,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
    };

    return safeUser;
  }

  /**
   * Checks if a user is active and valid.
   * @param user - The user to check.
   * @returns True if user is active.
   */
  isUserActive(user: UserDto): boolean {
    if (user.isActive === false) {
      return false;
    }

    if (user.status && user.status !== UserStatus.ACTIVE) {
      return false;
    }

    return true;
  }

  /**
   * Finds a user by ID and validates they are active.
   * @param userId - The user ID.
   * @returns The user if found and active, null otherwise.
   */
  async findActiveUser(userId: string): Promise<UserDto | null> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return null;
    }

    if (!this.isUserActive(user)) {
      return null;
    }

    return user;
  }
}
