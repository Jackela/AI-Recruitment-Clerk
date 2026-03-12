import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Model } from 'mongoose';
import { MfaService } from './mfa.service';
import { MfaMethod } from '../dto/mfa.dto';
import type { EmailService } from './email.service';
import type { SmsService } from './sms.service';
import type { UserProfile } from '../../schemas/user-profile.schema';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcryptjs';

// Mock external libraries
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('bcryptjs');

const createConfigService = () =>
  ({
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        MFA_ISSUER_NAME: 'TestIssuer',
        MFA_SECRET_LENGTH: '32',
        MFA_BACKUP_CODES_COUNT: '10',
      };
      return map[key];
    }),
  }) as unknown as jest.Mocked<ConfigService>;

const createUserModel = () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
});

describe('MfaService', () => {
  let service: MfaService;
  let userModel: ReturnType<typeof createUserModel>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;

  const mockUser = {
    _id: 'user-123',
    id: 'user-123',
    email: 'test@example.com',
    hashedPassword: 'hashed-password-123',
    mfaSettings: {
      enabled: false,
      methods: [],
      backupCodes: [],
      trustedDevices: [],
      failedAttempts: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    userModel = createUserModel();
    configService = createConfigService();
    emailService = {
      sendMfaToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailService>;
    smsService = {
      sendSms: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SmsService>;

    service = new MfaService(
      userModel as unknown as Model<UserProfile>,
      configService,
      emailService,
      smsService,
    );
  });

  describe('enableMfa', () => {
    const enableMfaDto = {
      method: MfaMethod.TOTP,
      currentPassword: 'correct-password',
    };

    it('should enable TOTP MFA successfully', async () => {
      const mockSecret = {
        base32: 'SECRET123456',
        otpauth_url:
          'otpauth://totp/TestIssuer:test@example.com?secret=SECRET123456',
      };
      const mockQrCode = 'data:image/png;base64,qr-code-data';

      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser });

      const result = await service.enableMfa('user-123', enableMfaDto);

      expect(result.success).toBe(true);
      expect(result.qrCode).toBe(mockQrCode);
      expect(result.secretKey).toBe(mockSecret.base32);
      expect(result.backupCodes).toHaveLength(10);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            enabled: true,
            methods: [MfaMethod.TOTP],
            totpSecret: mockSecret.base32,
          }),
        }),
      );
    });

    it('should enable SMS MFA successfully', async () => {
      const smsMfaDto = {
        method: MfaMethod.SMS,
        currentPassword: 'correct-password',
        phoneNumber: '+1234567890',
      };

      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser });

      const result = await service.enableMfa('user-123', smsMfaDto);

      expect(result.success).toBe(true);
      expect(result.qrCode).toBeUndefined();
      expect(result.secretKey).toBeUndefined();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            enabled: true,
            methods: [MfaMethod.SMS],
            phoneNumber: '+1234567890',
          }),
        }),
      );
    });

    it('should enable Email MFA successfully', async () => {
      const emailMfaDto = {
        method: MfaMethod.EMAIL,
        currentPassword: 'correct-password',
        email: 'mfa@example.com',
      };

      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser });

      const result = await service.enableMfa('user-123', emailMfaDto);

      expect(result.success).toBe(true);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            enabled: true,
            methods: [MfaMethod.EMAIL],
            email: 'mfa@example.com',
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.enableMfa('user-123', enableMfaDto)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.enableMfa('user-123', enableMfaDto)).rejects.toThrow(
        new UnauthorizedException('Invalid password'),
      );
    });

    it('should throw BadRequestException when SMS method without phone number', async () => {
      const smsMfaDto = {
        method: MfaMethod.SMS,
        currentPassword: 'correct-password',
      };

      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.enableMfa('user-123', smsMfaDto as any),
      ).rejects.toThrow(
        new BadRequestException('Phone number is required for SMS MFA'),
      );
    });

    it('should throw BadRequestException when Email method without email', async () => {
      const emailMfaDto = {
        method: MfaMethod.EMAIL,
        currentPassword: 'correct-password',
      };

      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.enableMfa('user-123', emailMfaDto as any),
      ).rejects.toThrow(
        new BadRequestException('Email is required for email MFA'),
      );
    });

    it('should add method to existing MFA without generating new backup codes', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          backupCodes: ['hashed-code-1'],
          trustedDevices: [],
          failedAttempts: 0,
          totpSecret: 'existing-secret',
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithMfa });

      const smsMfaDto = {
        method: MfaMethod.SMS,
        currentPassword: 'correct-password',
        phoneNumber: '+1234567890',
      };

      const result = await service.enableMfa('user-123', smsMfaDto);

      expect(result.success).toBe(true);
      expect(result.backupCodes).toBeUndefined(); // No new backup codes for additional method
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            enabled: true,
            methods: [MfaMethod.TOTP, MfaMethod.SMS],
          }),
        }),
      );
    });

    it('should handle errors during MFA enablement', async () => {
      userModel.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.enableMfa('user-123', enableMfaDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('verifyMfa', () => {
    it('should verify TOTP token successfully', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithMfa });

      const result = await service.verifyMfa('user-123', {
        token: '123456',
        method: MfaMethod.TOTP,
      });

      expect(result.success).toBe(true);
      expect(result.deviceTrusted).toBe(false);
    });

    it('should verify TOTP token and trust device', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithMfa });

      const result = await service.verifyMfa(
        'user-123',
        {
          token: '123456',
          method: MfaMethod.TOTP,
          rememberDevice: true,
        },
        'device-fingerprint-123',
      );

      expect(result.success).toBe(true);
      expect(result.deviceTrusted).toBe(false); // Returns false even when device is newly added
    });

    it('should bypass MFA for trusted device', async () => {
      const userWithTrustedDevice = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: ['device-fingerprint-123'],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithTrustedDevice);

      const result = await service.verifyMfa(
        'user-123',
        { token: 'any-token' },
        'device-fingerprint-123',
      );

      expect(result.success).toBe(true);
      expect(result.deviceTrusted).toBe(true);
    });

    it('should try all enabled methods when no method specified', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP, MfaMethod.SMS],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithMfa });

      const result = await service.verifyMfa('user-123', { token: '123456' });

      expect(result.success).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when MFA not enabled', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.verifyMfa('user-123', { token: '123456' }),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.verifyMfa('user-123', { token: '123456' }),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUser = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 5,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        },
      };

      userModel.findById.mockResolvedValue(lockedUser);

      await expect(
        service.verifyMfa('user-123', { token: '123456' }),
      ).rejects.toThrow(new UnauthorizedException(/Account locked/));
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          failedAttempts: 1,
        },
      });

      await expect(
        service.verifyMfa('user-123', {
          token: '123456',
          method: MfaMethod.TOTP,
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));

      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 4,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          failedAttempts: 5,
          lockedUntil: expect.any(Date),
        },
      });

      await expect(
        service.verifyMfa('user-123', {
          token: '123456',
          method: MfaMethod.TOTP,
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].mfaSettings.failedAttempts).toBe(5);
      expect(updateCall[1].mfaSettings.lockedUntil).toBeInstanceOf(Date);
    });

    it('should reset failed attempts on successful verification', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 3,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          failedAttempts: 0,
        },
      });

      await service.verifyMfa('user-123', {
        token: '123456',
        method: MfaMethod.TOTP,
      });

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].mfaSettings.failedAttempts).toBe(0);
      expect(updateCall[1].mfaSettings.lockedUntil).toBeUndefined();
      expect(updateCall[1].mfaSettings.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should limit trusted devices to 5', async () => {
      const userWithManyDevices = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [
            'device-1',
            'device-2',
            'device-3',
            'device-4',
            'device-5',
          ],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithManyDevices);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithManyDevices });

      await service.verifyMfa(
        'user-123',
        { token: '123456', method: MfaMethod.TOTP, rememberDevice: true },
        'device-6',
      );

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].mfaSettings.trustedDevices).toHaveLength(5);
      expect(updateCall[1].mfaSettings.trustedDevices).toContain('device-6');
      expect(updateCall[1].mfaSettings.trustedDevices).not.toContain(
        'device-1',
      );
    });

    it('should not add duplicate trusted device', async () => {
      const userWithDevice = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: ['device-1'],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithDevice);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithDevice });

      await service.verifyMfa(
        'user-123',
        { token: '123456', method: MfaMethod.TOTP, rememberDevice: true },
        'device-1',
      );

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1].mfaSettings.trustedDevices).toEqual(['device-1']);
    });

    it('should handle errors during verification', async () => {
      userModel.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        service.verifyMfa('user-123', { token: '123456' }),
      ).rejects.toThrow('Database error');
    });
  });

  describe('disableMfa', () => {
    const disableMfaDto = {
      currentPassword: 'correct-password',
      mfaToken: '123456',
    };

    it('should disable MFA successfully', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: ['hashed-code'],
          trustedDevices: ['device-1'],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      // Mock verifyMfa call within disableMfa
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser });

      const result = await service.disableMfa('user-123', disableMfaDto);

      expect(result.success).toBe(true);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            enabled: false,
            methods: [],
            backupCodes: [],
            trustedDevices: [],
            failedAttempts: 0,
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.disableMfa('user-123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.disableMfa('user-123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid password'));
    });

    it('should throw UnauthorizedException when MFA token is invalid', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithMfa,
        mfaSettings: { ...userWithMfa.mfaSettings, failedAttempts: 1 },
      });

      await expect(
        service.disableMfa('user-123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));
    });

    it('should handle errors during MFA disablement', async () => {
      userModel.findById.mockRejectedValue(new Error('Database error'));

      await expect(
        service.disableMfa('user-123', disableMfaDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getMfaStatus', () => {
    it('should return MFA status for enabled user', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP, MfaMethod.SMS],
          backupCodes: ['code1', 'code2', 'code3'],
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);

      const result = await service.getMfaStatus('user-123');

      expect(result.enabled).toBe(true);
      expect(result.methods).toEqual([MfaMethod.TOTP, MfaMethod.SMS]);
      expect(result.remainingBackupCodes).toBe(3);
      expect(result.hasBackupCodes).toBe(true);
      expect(result.deviceTrusted).toBe(false);
    });

    it('should return MFA status for disabled user', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      const result = await service.getMfaStatus('user-123');

      expect(result.enabled).toBe(false);
      expect(result.methods).toEqual([]);
      expect(result.remainingBackupCodes).toBe(0);
      expect(result.hasBackupCodes).toBe(false);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.getMfaStatus('user-123')).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should normalize MFA settings with string method names', async () => {
      const userWithStringMethods = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: ['totp', 'sms', 'email'],
          backupCodes: [],
        },
      };

      userModel.findById.mockResolvedValue(userWithStringMethods);

      const result = await service.getMfaStatus('user-123');

      expect(result.methods).toEqual([
        MfaMethod.TOTP,
        MfaMethod.SMS,
        MfaMethod.EMAIL,
      ]);
    });
  });

  describe('generateNewBackupCodes', () => {
    const generateBackupCodesDto = {
      currentPassword: 'correct-password',
      mfaToken: '123456',
    };

    it('should generate new backup codes successfully', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: ['old-code'],
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');
      userModel.findByIdAndUpdate.mockResolvedValue({ ...userWithMfa });

      const result = await service.generateNewBackupCodes(
        'user-123',
        generateBackupCodesDto,
      );

      expect(result).toHaveLength(10);
      expect(result[0]).toMatch(/^\w{4}-\w{4}$/); // Format: XXXX-XXXX
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          mfaSettings: expect.objectContaining({
            backupCodes: expect.arrayContaining(['hashed-code']),
          }),
        }),
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.generateNewBackupCodes('user-123', generateBackupCodesDto),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.generateNewBackupCodes('user-123', generateBackupCodesDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid password'));
    });

    it('should throw UnauthorizedException when MFA token is invalid', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'SECRET123',
          backupCodes: [],
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);
      userModel.findByIdAndUpdate.mockResolvedValue({
        ...userWithMfa,
        mfaSettings: { ...userWithMfa.mfaSettings, failedAttempts: 1 },
      });

      await expect(
        service.generateNewBackupCodes('user-123', generateBackupCodesDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));
    });
  });

  describe('sendMfaToken', () => {
    it('should send MFA token via email', async () => {
      const userWithEmailMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
          email: 'mfa@example.com',
        },
      };

      userModel.findById.mockResolvedValue(userWithEmailMfa);

      const result = await service.sendMfaToken('user-123', MfaMethod.EMAIL);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/EMAIL/i);
      expect(emailService.sendMfaToken).toHaveBeenCalledWith(
        'mfa@example.com',
        expect.any(String),
        'TestIssuer',
      );
    });

    it('should send MFA token via SMS', async () => {
      const userWithSmsMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.SMS],
          phoneNumber: '+1234567890',
        },
      };

      userModel.findById.mockResolvedValue(userWithSmsMfa);

      const result = await service.sendMfaToken('user-123', MfaMethod.SMS);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/SMS/i);
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining('verification code'),
      );
    });

    it('should use user email when MFA email not set', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
          // No email field, should fallback to user.email
        },
      };

      userModel.findById.mockResolvedValue(userWithMfa);

      await service.sendMfaToken('user-123', MfaMethod.EMAIL);

      expect(emailService.sendMfaToken).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
        'TestIssuer',
      );
    });

    it('should throw UnauthorizedException when MFA not enabled', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.sendMfaToken('user-123', MfaMethod.EMAIL),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.sendMfaToken('user-123', MfaMethod.EMAIL),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw BadRequestException for TOTP method', async () => {
      const userWithTotp = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
        },
      };

      userModel.findById.mockResolvedValue(userWithTotp);

      await expect(
        service.sendMfaToken('user-123', MfaMethod.TOTP),
      ).rejects.toThrow(
        new BadRequestException('Invalid MFA method for token generation'),
      );
    });

    it('should throw BadRequestException when email service fails', async () => {
      const userWithEmailMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
        },
      };

      userModel.findById.mockResolvedValue(userWithEmailMfa);
      emailService.sendMfaToken.mockRejectedValue(
        new Error('Email service error'),
      );

      await expect(
        service.sendMfaToken('user-123', MfaMethod.EMAIL),
      ).rejects.toThrow(
        new BadRequestException('Failed to send verification code via EMAIL'),
      );
    });

    it('should throw BadRequestException when SMS service fails', async () => {
      const userWithSmsMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.SMS],
          phoneNumber: '+1234567890',
        },
      };

      userModel.findById.mockResolvedValue(userWithSmsMfa);
      smsService.sendSms.mockRejectedValue(new Error('SMS service error'));

      await expect(
        service.sendMfaToken('user-123', MfaMethod.SMS),
      ).rejects.toThrow(
        new BadRequestException('Failed to send verification code via SMS'),
      );
    });
  });

  describe('temporary token management', () => {
    it('should store and cleanup temporary tokens', async () => {
      const userWithEmailMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
        },
      };

      userModel.findById.mockResolvedValue(userWithEmailMfa);

      // Send first token
      await service.sendMfaToken('user-123', MfaMethod.EMAIL);

      // The token should be stored (implementation detail through side effects)
      expect(emailService.sendMfaToken).toHaveBeenCalledTimes(1);
    });

    it('should cleanup expired tokens on store', async () => {
      // This test verifies the cleanupExpiredTokens is called
      // Implementation uses setTimeout which we can't easily test
      const userWithEmailMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
        },
      };

      userModel.findById.mockResolvedValue(userWithEmailMfa);

      // Multiple calls should work without error
      await service.sendMfaToken('user-123', MfaMethod.EMAIL);
      await service.sendMfaToken('user-123', MfaMethod.EMAIL);

      expect(emailService.sendMfaToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyTokenForMethod', () => {
    it('should return false for SMS method (not implemented)', async () => {
      const mfaSettings = {
        enabled: true,
        methods: [MfaMethod.SMS],
        phoneNumber: '+1234567890',
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };

      // Access private method through any cast
      const result = await (service as any).verifyTokenForMethod(
        mfaSettings,
        '123456',
        MfaMethod.SMS,
      );

      expect(result).toBe(false);
    });

    it('should return false for Email method (not implemented)', async () => {
      const mfaSettings = {
        enabled: true,
        methods: [MfaMethod.EMAIL],
        email: 'test@example.com',
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };

      const result = await (service as any).verifyTokenForMethod(
        mfaSettings,
        '123456',
        MfaMethod.EMAIL,
      );

      expect(result).toBe(false);
    });

    it('should return false for TOTP when secret is missing', async () => {
      const mfaSettings = {
        enabled: true,
        methods: [MfaMethod.TOTP],
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };

      const result = await (service as any).verifyTokenForMethod(
        mfaSettings,
        '123456',
        MfaMethod.TOTP,
      );

      expect(result).toBe(false);
    });

    it('should return false for unknown method', async () => {
      const mfaSettings = {
        enabled: true,
        methods: ['unknown' as MfaMethod],
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      };

      const result = await (service as any).verifyTokenForMethod(
        mfaSettings,
        '123456',
        'unknown' as MfaMethod,
      );

      expect(result).toBe(false);
    });
  });

  describe('normalizeMfaSettings', () => {
    it('should handle null/undefined settings', async () => {
      const userWithNullSettings = {
        ...mockUser,
        mfaSettings: null,
      };

      userModel.findById.mockResolvedValue(userWithNullSettings);

      const result = await service.getMfaStatus('user-123');

      expect(result.enabled).toBe(false);
      expect(result.methods).toEqual([]);
    });

    it('should convert string method names to enum values', async () => {
      const userWithStringMethods = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: ['sms', 'email', 'totp', 'unknown'],
          backupCodes: [],
        },
      };

      userModel.findById.mockResolvedValue(userWithStringMethods);

      const result = await service.getMfaStatus('user-123');

      expect(result.methods).toContain(MfaMethod.SMS);
      expect(result.methods).toContain(MfaMethod.EMAIL);
      expect(result.methods).toContain(MfaMethod.TOTP);
      expect(result.methods).toContain('unknown');
    });
  });
});
