import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../user.service';

/**
 * Service for password management operations.
 * Extracted from AuthService to follow Single Responsibility Principle.
 */
@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Changes a user's password.
   * @param userId - The user id.
   * @param currentPassword - The current password.
   * @param newPassword - The new password.
   * @returns A promise that resolves when the operation completes.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    const user = await this.userService.findByIdWithSensitiveData(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      this.logger.warn(`Invalid current password for user: ${userId}`);
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedNewPassword = await this.hashPassword(newPassword);

    await this.userService.updatePassword(userId, hashedNewPassword);
    this.logger.log(`Password changed successfully for user: ${userId}`);
  }

  /**
   * Hashes a password using bcrypt.
   * @param password - The plain text password.
   * @returns A promise that resolves to the hashed password.
   */
  async hashPassword(password: string): Promise<string> {
    const saltEnv = this.configService.get<string>('BCRYPT_ROUNDS');
    const saltRounds =
      process.env.NODE_ENV === 'test' ? parseInt(saltEnv || '4') : 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validates password strength against security requirements.
   * @param password - The password to validate.
   * @throws BadRequestException if password doesn't meet requirements.
   */
  validatePasswordStrength(password: string): void {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        'Password must contain at least one special character (@$!%*?&)',
      );
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `Password validation failed: ${errors.join(', ')}`,
      );
    }
  }

  /**
   * Compares a plain text password with a hashed password.
   * @param plainPassword - The plain text password.
   * @param hashedPassword - The hashed password.
   * @returns A promise that resolves to true if passwords match.
   */
  async comparePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
