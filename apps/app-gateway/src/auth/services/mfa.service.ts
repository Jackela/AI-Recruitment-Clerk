import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import {
  MfaMethod,
  EnableMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
  GenerateBackupCodesDto,
  MfaStatusDto,
  MfaSetupResponseDto,
} from '../dto/mfa.dto';
import { UserProfile } from '../../schemas/user-profile.schema';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

interface MfaSettings {
  enabled: boolean;
  methods: MfaMethod[];
  totpSecret?: string;
  phoneNumber?: string;
  email?: string;
  backupCodes: string[];
  trustedDevices: string[];
  lastUsedAt?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
}

/**
 * Provides mfa functionality.
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly issuerName: string;
  private readonly secretLength: number;
  private readonly backupCodesCount: number;

  /**
   * Initializes a new instance of the Mfa Service.
   * @param userModel - The user model.
   * @param configService - The config service.
   * @param emailService - The email service.
   * @param smsService - The sms service.
   */
  constructor(
    @InjectModel(UserProfile.name) private userModel: Model<UserProfile>,
    private configService: ConfigService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {
    this.issuerName =
      this.configService.get<string>('MFA_ISSUER_NAME') ||
      'AI-Recruitment-Clerk';
    this.secretLength = parseInt(
      this.configService.get<string>('MFA_SECRET_LENGTH') || '32',
    );
    this.backupCodesCount = parseInt(
      this.configService.get<string>('MFA_BACKUP_CODES_COUNT') || '10',
    );
  }

  /**
   * Performs the enable mfa operation.
   * @param userId - The user id.
   * @param enableMfaDto - The enable mfa dto.
   * @returns A promise that resolves to MfaSetupResponseDto.
   */
  async enableMfa(
    userId: string,
    enableMfaDto: EnableMfaDto,
  ): Promise<MfaSetupResponseDto> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        enableMfaDto.currentPassword,
        user.hashedPassword,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      const mfaSettings: MfaSettings = this.normalizeMfaSettings(
        user.mfaSettings,
      );

      let qrCode: string | undefined;
      let secretKey: string | undefined;
      let backupCodes: string[] | undefined;

      switch (enableMfaDto.method) {
        case MfaMethod.TOTP: {
          const secret = speakeasy.generateSecret({
            name: `${this.issuerName} (${user.email})`,
            issuer: this.issuerName,
            length: this.secretLength,
          });

          mfaSettings.totpSecret = secret.base32;
          secretKey = secret.base32;

          // Generate QR code
          if (!secret.otpauth_url) {
            throw new BadRequestException('Unable to generate TOTP QR code');
          }
          qrCode = await QRCode.toDataURL(secret.otpauth_url);
          break;
        }

        case MfaMethod.SMS:
          if (!enableMfaDto.phoneNumber) {
            throw new BadRequestException(
              'Phone number is required for SMS MFA',
            );
          }
          mfaSettings.phoneNumber = enableMfaDto.phoneNumber;
          break;

        case MfaMethod.EMAIL:
          if (!enableMfaDto.email) {
            throw new BadRequestException('Email is required for email MFA');
          }
          mfaSettings.email = enableMfaDto.email;
          break;
      }

      // Add method to enabled methods
      if (!mfaSettings.methods.includes(enableMfaDto.method)) {
        mfaSettings.methods.push(enableMfaDto.method);
      }

      // Enable MFA if first method
      if (!mfaSettings.enabled) {
        mfaSettings.enabled = true;
        // Generate backup codes
        backupCodes = this.generateBackupCodes();
        mfaSettings.backupCodes = await Promise.all(
          backupCodes.map((code) => bcrypt.hash(code, 12)),
        );
      }

      // Save MFA settings
      await this.userModel.findByIdAndUpdate(userId, { mfaSettings });

      this.logger.log(`MFA ${enableMfaDto.method} enabled for user ${userId}`);

      return {
        success: true,
        qrCode,
        secretKey,
        backupCodes,
        message: `${enableMfaDto.method.toUpperCase()} MFA has been enabled successfully`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to enable MFA for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private normalizeMfaSettings(
    rawSettings?:
      | (Partial<Omit<MfaSettings, 'methods'>> & {
          methods?: Array<MfaMethod | string>;
        })
      | null,
  ): MfaSettings {
    if (!rawSettings) {
      return {
        enabled: false,
        methods: [],
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };
    }

    const normalizedMethods = Array.isArray(rawSettings.methods)
      ? rawSettings.methods.map((method) => {
          switch (method) {
            case MfaMethod.SMS:
            case MfaMethod.EMAIL:
            case MfaMethod.TOTP:
              return method;
            case 'sms':
              return MfaMethod.SMS;
            case 'email':
              return MfaMethod.EMAIL;
            case 'totp':
              return MfaMethod.TOTP;
            default:
              return method as MfaMethod;
          }
        })
      : [];

    return {
      enabled: rawSettings.enabled ?? false,
      methods: normalizedMethods,
      totpSecret: rawSettings.totpSecret,
      phoneNumber: rawSettings.phoneNumber,
      email: rawSettings.email,
      backupCodes: rawSettings.backupCodes ?? [],
      trustedDevices: rawSettings.trustedDevices ?? [],
      lastUsedAt: rawSettings.lastUsedAt,
      failedAttempts: rawSettings.failedAttempts ?? 0,
      lockedUntil: rawSettings.lockedUntil,
    };
  }

  /**
   * Performs the verify mfa operation.
   * @param userId - The user id.
   * @param verifyMfaDto - The verify mfa dto.
   * @param deviceFingerprint - The device fingerprint.
   * @returns A promise that resolves to { success: boolean; deviceTrusted?: boolean }.
   */
  async verifyMfa(
    userId: string,
    verifyMfaDto: VerifyMfaDto,
    deviceFingerprint?: string,
  ): Promise<{ success: boolean; deviceTrusted?: boolean }> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user || !user.mfaSettings?.enabled) {
        throw new UnauthorizedException('MFA not enabled');
      }

      const mfaSettings = this.normalizeMfaSettings(user.mfaSettings);

      // Check if account is locked
      if (mfaSettings.lockedUntil && new Date() < mfaSettings.lockedUntil) {
        const lockTimeRemaining = Math.ceil(
          (mfaSettings.lockedUntil.getTime() - Date.now()) / 60000,
        );
        throw new UnauthorizedException(
          `Account locked due to too many failed attempts. Try again in ${lockTimeRemaining} minutes.`,
        );
      }

      // Check if device is already trusted
      if (
        deviceFingerprint &&
        mfaSettings.trustedDevices.includes(deviceFingerprint)
      ) {
        this.logger.debug(`Trusted device bypassing MFA for user ${userId}`);
        return { success: true, deviceTrusted: true };
      }

      let isValidToken = false;

      // Verify token based on method
      if (verifyMfaDto.method) {
        isValidToken = await this.verifyTokenForMethod(
          mfaSettings,
          verifyMfaDto.token,
          verifyMfaDto.method,
        );
      } else {
        // Try all enabled methods
        for (const method of mfaSettings.methods) {
          if (
            await this.verifyTokenForMethod(
              mfaSettings,
              verifyMfaDto.token,
              method,
            )
          ) {
            isValidToken = true;
            break;
          }
        }
      }

      if (!isValidToken) {
        // Increment failed attempts
        mfaSettings.failedAttempts = (mfaSettings.failedAttempts || 0) + 1;

        // Lock account if too many failed attempts
        if (mfaSettings.failedAttempts >= 5) {
          mfaSettings.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          this.logger.warn(
            `User ${userId} account locked due to too many MFA failures`,
          );
        }

        await this.userModel.findByIdAndUpdate(userId, { mfaSettings });
        throw new UnauthorizedException('Invalid MFA token');
      }

      // Reset failed attempts on successful verification
      mfaSettings.failedAttempts = 0;
      mfaSettings.lockedUntil = undefined;
      mfaSettings.lastUsedAt = new Date();

      // Add device to trusted list if requested
      if (
        verifyMfaDto.rememberDevice &&
        deviceFingerprint &&
        !mfaSettings.trustedDevices.includes(deviceFingerprint)
      ) {
        mfaSettings.trustedDevices.push(deviceFingerprint);
        // Keep only last 5 trusted devices
        if (mfaSettings.trustedDevices.length > 5) {
          mfaSettings.trustedDevices = mfaSettings.trustedDevices.slice(-5);
        }
      }

      await this.userModel.findByIdAndUpdate(userId, { mfaSettings });

      this.logger.log(`MFA verification successful for user ${userId}`);
      return { success: true, deviceTrusted: false };
    } catch (error) {
      this.logger.error(
        `MFA verification failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Performs the disable mfa operation.
   * @param userId - The user id.
   * @param disableMfaDto - The disable mfa dto.
   * @returns A promise that resolves to { success: boolean }.
   */
  async disableMfa(
    userId: string,
    disableMfaDto: DisableMfaDto,
  ): Promise<{ success: boolean }> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        disableMfaDto.currentPassword,
        user.hashedPassword,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password');
      }

      // Verify MFA token
      const mfaVerification = await this.verifyMfa(userId, {
        token: disableMfaDto.mfaToken,
      });
      if (!mfaVerification.success) {
        throw new UnauthorizedException('Invalid MFA token');
      }

      // Disable MFA
      const disabledMfaSettings: MfaSettings = {
        enabled: false,
        methods: [],
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };

      await this.userModel.findByIdAndUpdate(userId, {
        mfaSettings: disabledMfaSettings,
      });

      this.logger.log(`MFA disabled for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to disable MFA for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Retrieves mfa status.
   * @param userId - The user id.
   * @returns A promise that resolves to MfaStatusDto.
   */
  async getMfaStatus(userId: string): Promise<MfaStatusDto> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const mfaSettings = this.normalizeMfaSettings(user.mfaSettings);

    return {
      enabled: mfaSettings.enabled,
      methods: mfaSettings.methods,
      remainingBackupCodes: mfaSettings.backupCodes.length,
      deviceTrusted: false, // This would be set based on device fingerprint
      hasBackupCodes: mfaSettings.backupCodes.length > 0,
    };
  }

  /**
   * Generates new backup codes.
   * @param userId - The user id.
   * @param generateBackupCodesDto - The generate backup codes dto.
   * @returns A promise that resolves to an array of string value.
   */
  async generateNewBackupCodes(
    userId: string,
    generateBackupCodesDto: GenerateBackupCodesDto,
  ): Promise<string[]> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      generateBackupCodesDto.currentPassword,
      user.hashedPassword,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA token
    const mfaVerification = await this.verifyMfa(userId, {
      token: generateBackupCodesDto.mfaToken,
    });
    if (!mfaVerification.success) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    // Generate new backup codes
    const newBackupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      newBackupCodes.map((code) => bcrypt.hash(code, 12)),
    );

    // Update user with new backup codes
    if (!user.mfaSettings) {
      throw new UnauthorizedException('MFA is not configured for this user');
    }
    const mfaSettings = this.normalizeMfaSettings(user.mfaSettings);
    mfaSettings.backupCodes = hashedBackupCodes;

    await this.userModel.findByIdAndUpdate(userId, { mfaSettings });

    this.logger.log(`New backup codes generated for user ${userId}`);
    return newBackupCodes;
  }

  private async verifyTokenForMethod(
    mfaSettings: MfaSettings,
    token: string,
    method: MfaMethod,
  ): Promise<boolean> {
    switch (method) {
      case MfaMethod.TOTP:
        if (!mfaSettings.totpSecret) return false;
        return speakeasy.totp.verify({
          secret: mfaSettings.totpSecret,
          encoding: 'base32',
          token,
          window: 2, // Allow 2 time steps (60 seconds) tolerance
        });

      case MfaMethod.SMS:
        // SMS verification logic would go here
        // For now, return false as it requires SMS service integration
        return false;

      case MfaMethod.EMAIL:
        // Email verification logic would go here
        // For now, return false as it requires email service integration
        return false;

      default:
        return false;
    }
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.backupCodesCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      const formattedCode = `${code.substring(0, 4)}-${code.substring(4, 8)}`;
      codes.push(formattedCode);
    }
    return codes;
  }

  /**
   * Performs the send mfa token operation.
   * @param userId - The user id.
   * @param method - The method.
   * @returns A promise that resolves to { success: boolean; message: string }.
   */
  async sendMfaToken(
    userId: string,
    method: MfaMethod,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || !user.mfaSettings?.enabled) {
      throw new UnauthorizedException('MFA not enabled');
    }

    const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit token
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store token temporarily (in production, use Redis or similar)
    // For now, we'll use a simple in-memory store
    this.storeTemporaryToken(userId, token, expiresAt);

    try {
      switch (method) {
        case MfaMethod.SMS:
          if (user.mfaSettings.phoneNumber) {
            await this.smsService.sendSms(
              user.mfaSettings.phoneNumber,
              `Your ${this.issuerName} verification code is: ${token}. This code expires in 5 minutes.`,
            );
          }
          break;

        case MfaMethod.EMAIL: {
          const email = user.mfaSettings.email || user.email;
          await this.emailService.sendMfaToken(email, token, this.issuerName);
          break;
        }

        default:
          throw new BadRequestException(
            'Invalid MFA method for token generation',
          );
      }

      return {
        success: true,
        message: `Verification code sent via ${method.toUpperCase()}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send MFA token: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException(
        `Failed to send verification code via ${method.toUpperCase()}`,
      );
    }
  }

  private temporaryTokens = new Map<
    string,
    { token: string; expiresAt: Date }
  >();

  private storeTemporaryToken(userId: string, token: string, expiresAt: Date) {
    // Clean up expired tokens
    this.cleanupExpiredTokens();

    // Store new token
    this.temporaryTokens.set(userId, { token, expiresAt });

    // Schedule cleanup
    setTimeout(
      () => {
        this.temporaryTokens.delete(userId);
      },
      5 * 60 * 1000,
    );
  }

  private cleanupExpiredTokens() {
    const now = new Date();
    for (const [userId, tokenData] of this.temporaryTokens.entries()) {
      if (tokenData.expiresAt < now) {
        this.temporaryTokens.delete(userId);
      }
    }
  }

  // Reserved for future implementation
  // private verifyTemporaryToken(userId: string, token: string): boolean
}
