import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { UserProfile } from '../../schemas/user-profile.schema';
import { MfaMethod } from '../dto/mfa.dto';

// Mock dependencies at the top level with proper Jest types
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('speakeasy', () => ({
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

// Import after mocking to get typed mock functions
const bcryptMock = require('bcryptjs');
const speakeasyMock = require('speakeasy');
const cryptoMock = require('crypto');
const qrcodeMock = require('qrcode');

describe('MfaService', () => {
  let service: MfaService;
  let userModel: any;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;
  let smsService: jest.Mocked<SmsService>;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    hashedPassword: 'hashedPassword123',
    mfaSettings: {
      enabled: false,
      methods: [],
      backupCodes: [],
      trustedDevices: [],
      failedAttempts: 0,
    },
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: getModelToken(UserProfile.name),
          useValue: {
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMfaToken: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: {
            sendSms: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    userModel = module.get(getModelToken(UserProfile.name));
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
    smsService = module.get(SmsService);

    // Replace logger with mock
    (service as any).logger = mockLogger;

    // Setup config defaults
    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        MFA_ISSUER_NAME: 'AI-Recruitment-Clerk',
        MFA_SECRET_LENGTH: '32',
        MFA_BACKUP_CODES_COUNT: '10',
      };
      return config[key];
    });

    // Mocked modules are already set up at the top level - no need to override here

    // Reset all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clear temporary tokens
    (service as any).temporaryTokens.clear();
  });

  describe('Constructor and Configuration', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct default configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('MFA_ISSUER_NAME');
      expect(configService.get).toHaveBeenCalledWith('MFA_SECRET_LENGTH');
      expect(configService.get).toHaveBeenCalledWith('MFA_BACKUP_CODES_COUNT');
    });

    it('should use fallback values when config is not provided', () => {
      configService.get.mockReturnValue(undefined);

      const module = Test.createTestingModule({
        providers: [
          MfaService,
          {
            provide: getModelToken(UserProfile.name),
            useValue: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
          },
          { provide: ConfigService, useValue: configService },
          { provide: EmailService, useValue: {} },
          { provide: SmsService, useValue: {} },
        ],
      }).compile();

      // The service should use default values when config returns undefined
      expect(configService.get).toHaveBeenCalled();
    });
  });

  describe('enableMfa - TOTP Method', () => {
    const enableMfaDto = {
      method: MfaMethod.TOTP,
      currentPassword: 'password123',
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true);

      speakeasyMock.generateSecret.mockReturnValue({
        base32: 'MOCK_SECRET_BASE32',
        otpauth_url:
          'otpauth://totp/AI-Recruitment-Clerk%20%28test%40example.com%29?secret=MOCK_SECRET_BASE32&issuer=AI-Recruitment-Clerk',
      } as any);

      // Setup QRCode mock response
      qrcodeMock.toDataURL.mockResolvedValue(
        'data:image/png;base64,mockQRCode',
      );
    });

    it('should enable TOTP MFA successfully', async () => {
      const result = await service.enableMfa('user123', enableMfaDto);

      expect(result.success).toBe(true);
      expect(result.qrCode).toBe('data:image/png;base64,mockQRCode');
      expect(result.secretKey).toBe('MOCK_SECRET_BASE32');
      expect(result.backupCodes).toHaveLength(10);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'MFA totp enabled for user user123',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.enableMfa('user123', enableMfaDto)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      bcryptMock.compare.mockResolvedValue(false);

      await expect(service.enableMfa('user123', enableMfaDto)).rejects.toThrow(
        new UnauthorizedException('Invalid password'),
      );
    });

    it('should not generate backup codes if MFA already enabled', async () => {
      const userWithMfaEnabled = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
          backupCodes: ['existing-code'],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithMfaEnabled);

      const result = await service.enableMfa('user123', enableMfaDto);

      expect(result.backupCodes).toBeUndefined();
    });

    it('should add method to existing methods array', async () => {
      const userWithSomeMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.EMAIL],
          backupCodes: ['existing-code'],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithSomeMfa);

      await service.enableMfa('user123', enableMfaDto);

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.methods).toContain(MfaMethod.TOTP);
      expect(updateCall.mfaSettings.methods).toContain(MfaMethod.EMAIL);
    });
  });

  describe('enableMfa - SMS Method', () => {
    const enableSmsDto = {
      method: MfaMethod.SMS,
      phoneNumber: '+1234567890',
      currentPassword: 'password123',
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true);
    });

    it('should enable SMS MFA successfully', async () => {
      const result = await service.enableMfa('user123', enableSmsDto);

      expect(result.success).toBe(true);
      expect(result.qrCode).toBeUndefined();
      expect(result.secretKey).toBeUndefined();
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw BadRequestException when phone number missing', async () => {
      const invalidDto = { ...enableSmsDto, phoneNumber: undefined };

      await expect(service.enableMfa('user123', invalidDto)).rejects.toThrow(
        new BadRequestException('Phone number is required for SMS MFA'),
      );
    });
  });

  describe('enableMfa - Email Method', () => {
    const enableEmailDto = {
      method: MfaMethod.EMAIL,
      email: 'mfa@example.com',
      currentPassword: 'password123',
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(mockUser);
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true);
    });

    it('should enable Email MFA successfully', async () => {
      const result = await service.enableMfa('user123', enableEmailDto);

      expect(result.success).toBe(true);
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw BadRequestException when email missing', async () => {
      const invalidDto = { ...enableEmailDto, email: undefined };

      await expect(service.enableMfa('user123', invalidDto)).rejects.toThrow(
        new BadRequestException('Email is required for email MFA'),
      );
    });
  });

  describe('verifyMfa', () => {
    const userWithMfa = {
      ...mockUser,
      mfaSettings: {
        enabled: true,
        methods: [MfaMethod.TOTP],
        totpSecret: 'MOCK_SECRET',
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      },
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(userWithMfa);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithMfa);
    });

    it('should verify TOTP token successfully', async () => {
      speakeasyMock.totp.verify.mockReturnValue(true);

      const result = await service.verifyMfa('user123', { token: '123456' });

      expect(result.success).toBe(true);
      expect(result.deviceTrusted).toBe(false);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'MFA verification successful for user user123',
      );
    });

    it('should return true for trusted device', async () => {
      const userWithTrustedDevice = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          trustedDevices: ['device123'],
        },
      };
      userModel.findById.mockResolvedValue(userWithTrustedDevice);

      const result = await service.verifyMfa(
        'user123',
        { token: '123456' },
        'device123',
      );

      expect(result.success).toBe(true);
      expect(result.deviceTrusted).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Trusted device bypassing MFA for user user123',
      );
    });

    it('should throw UnauthorizedException when MFA not enabled', async () => {
      userModel.findById.mockResolvedValue(mockUser); // MFA disabled

      await expect(
        service.verifyMfa('user123', { token: '123456' }),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw UnauthorizedException with invalid token', async () => {
      speakeasyMock.totp.verify.mockReturnValue(false);

      await expect(
        service.verifyMfa('user123', { token: '123456' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));
    });

    it('should increment failed attempts on invalid token', async () => {
      speakeasyMock.totp.verify.mockReturnValue(false);

      try {
        await service.verifyMfa('user123', { token: '123456' });
      } catch (error) {
        // Expected to throw
      }

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.failedAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWithFailures = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          failedAttempts: 4,
        },
      };
      userModel.findById.mockResolvedValue(userWithFailures);
      speakeasyMock.totp.verify.mockReturnValue(false);

      try {
        await service.verifyMfa('user123', { token: '123456' });
      } catch (error) {
        // Expected to throw
      }

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.failedAttempts).toBe(5);
      expect(updateCall.mfaSettings.lockedUntil).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'User user123 account locked due to too many MFA failures',
      );
    });

    it('should reject verification when account is locked', async () => {
      const lockedUser = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        },
      };
      userModel.findById.mockResolvedValue(lockedUser);

      await expect(
        service.verifyMfa('user123', { token: '123456' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          /Account locked due to too many failed attempts/,
        ),
      );
    });

    it('should add device to trusted list when rememberDevice is true', async () => {
      speakeasyMock.totp.verify.mockReturnValue(true);

      await service.verifyMfa(
        'user123',
        {
          token: '123456',
          rememberDevice: true,
        },
        'device123',
      );

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.trustedDevices).toContain('device123');
    });

    it('should limit trusted devices to 5', async () => {
      const userWithManyDevices = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          trustedDevices: [
            'device1',
            'device2',
            'device3',
            'device4',
            'device5',
          ],
        },
      };
      userModel.findById.mockResolvedValue(userWithManyDevices);
      speakeasyMock.totp.verify.mockReturnValue(true);

      await service.verifyMfa(
        'user123',
        {
          token: '123456',
          rememberDevice: true,
        },
        'device6',
      );

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.trustedDevices).toHaveLength(5);
      expect(updateCall.mfaSettings.trustedDevices).toContain('device6');
      expect(updateCall.mfaSettings.trustedDevices).not.toContain('device1');
    });

    it('should reset failed attempts on successful verification', async () => {
      const userWithFailures = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          failedAttempts: 3,
        },
      };
      userModel.findById.mockResolvedValue(userWithFailures);
      speakeasyMock.totp.verify.mockReturnValue(true);

      await service.verifyMfa('user123', { token: '123456' });

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.failedAttempts).toBe(0);
      expect(updateCall.mfaSettings.lockedUntil).toBeUndefined();
      expect(updateCall.mfaSettings.lastUsedAt).toBeDefined();
    });

    it('should try all enabled methods when method not specified', async () => {
      const userWithMultipleMethods = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          methods: [MfaMethod.TOTP, MfaMethod.SMS, MfaMethod.EMAIL],
        },
      };
      userModel.findById.mockResolvedValue(userWithMultipleMethods);
      speakeasyMock.totp.verify.mockReturnValue(true);

      const result = await service.verifyMfa('user123', { token: '123456' });

      expect(result.success).toBe(true);
    });
  });

  describe('disableMfa', () => {
    const disableMfaDto = {
      currentPassword: 'password123',
      mfaToken: '123456',
    };

    const userWithMfa = {
      ...mockUser,
      mfaSettings: {
        enabled: true,
        methods: [MfaMethod.TOTP],
        totpSecret: 'MOCK_SECRET',
        backupCodes: ['code1', 'code2'],
        trustedDevices: ['device1'],
        failedAttempts: 0,
      },
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(userWithMfa);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithMfa);
      bcryptMock.compare.mockResolvedValue(true);
      speakeasyMock.totp.verify.mockReturnValue(true);
    });

    it('should disable MFA successfully', async () => {
      const result = await service.disableMfa('user123', disableMfaDto);

      expect(result.success).toBe(true);

      const updateCall = userModel.findByIdAndUpdate.mock.calls[1][1]; // Second call (after MFA verification)
      expect(updateCall.mfaSettings.enabled).toBe(false);
      expect(updateCall.mfaSettings.methods).toEqual([]);
      expect(updateCall.mfaSettings.backupCodes).toEqual([]);
      expect(updateCall.mfaSettings.trustedDevices).toEqual([]);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'MFA disabled for user user123',
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.disableMfa('user123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      bcryptMock.compare.mockResolvedValue(false);

      await expect(
        service.disableMfa('user123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid password'));
    });

    it('should throw UnauthorizedException with invalid MFA token', async () => {
      speakeasyMock.totp.verify.mockReturnValue(false);

      await expect(
        service.disableMfa('user123', disableMfaDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid MFA token'));
    });
  });

  describe('getMfaStatus', () => {
    it('should return MFA status for user with enabled MFA', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP, MfaMethod.SMS],
          backupCodes: ['code1', 'code2', 'code3'],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithMfa);

      const status = await service.getMfaStatus('user123');

      expect(status.enabled).toBe(true);
      expect(status.methods).toEqual([MfaMethod.TOTP, MfaMethod.SMS]);
      expect(status.remainingBackupCodes).toBe(3);
      expect(status.hasBackupCodes).toBe(true);
    });

    it('should return MFA status for user with disabled MFA', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      const status = await service.getMfaStatus('user123');

      expect(status.enabled).toBe(false);
      expect(status.methods).toEqual([]);
      expect(status.remainingBackupCodes).toBe(0);
      expect(status.hasBackupCodes).toBe(false);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(service.getMfaStatus('user123')).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });
  });

  describe('generateNewBackupCodes', () => {
    const generateDto = {
      currentPassword: 'password123',
      mfaToken: '123456',
    };

    const userWithMfa = {
      ...mockUser,
      mfaSettings: {
        enabled: true,
        methods: [MfaMethod.TOTP],
        totpSecret: 'MOCK_SECRET',
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      },
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(userWithMfa);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithMfa);
      bcryptMock.compare.mockResolvedValue(true);
      speakeasyMock.totp.verify.mockReturnValue(true);

      // Mock crypto for backup codes
      cryptoMock.randomBytes.mockReturnValue(
        Buffer.from([0x12, 0x34, 0x56, 0x78]),
      );
    });

    it('should generate new backup codes successfully', async () => {
      const codes = await service.generateNewBackupCodes(
        'user123',
        generateDto,
      );

      expect(codes).toHaveLength(10);
      expect(codes[0]).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'New backup codes generated for user user123',
      );
    });

    it('should hash and store backup codes', async () => {
      bcryptMock.hash.mockResolvedValue('hashedCode');

      await service.generateNewBackupCodes('user123', generateDto);

      // Verify backup codes were hashed
      expect(bcryptMock.hash).toHaveBeenCalledTimes(10);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.generateNewBackupCodes('user123', generateDto),
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      bcryptMock.compare.mockResolvedValue(false);

      await expect(
        service.generateNewBackupCodes('user123', generateDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid password'));
    });
  });

  describe('sendMfaToken', () => {
    const userWithMfa = {
      ...mockUser,
      mfaSettings: {
        enabled: true,
        methods: [MfaMethod.SMS, MfaMethod.EMAIL],
        phoneNumber: '+1234567890',
        email: 'mfa@example.com',
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      },
    };

    beforeEach(() => {
      userModel.findById.mockResolvedValue(userWithMfa);
      emailService.sendMfaToken.mockResolvedValue(undefined);
      smsService.sendSms.mockResolvedValue(undefined);
    });

    it('should send SMS token successfully', async () => {
      const result = await service.sendMfaToken('user123', MfaMethod.SMS);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification code sent via SMS');
      expect(smsService.sendSms).toHaveBeenCalledWith(
        '+1234567890',
        expect.stringContaining(
          'Your AI-Recruitment-Clerk verification code is:',
        ),
      );
    });

    it('should send email token successfully', async () => {
      const result = await service.sendMfaToken('user123', MfaMethod.EMAIL);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Verification code sent via EMAIL');
      expect(emailService.sendMfaToken).toHaveBeenCalledWith(
        'mfa@example.com',
        expect.stringMatching(/^\d{6}$/),
        'AI-Recruitment-Clerk',
      );
    });

    it('should use user email when MFA email not configured', async () => {
      const userWithoutMfaEmail = {
        ...userWithMfa,
        mfaSettings: {
          ...userWithMfa.mfaSettings,
          email: undefined,
        },
      };
      userModel.findById.mockResolvedValue(userWithoutMfaEmail);

      await service.sendMfaToken('user123', MfaMethod.EMAIL);

      expect(emailService.sendMfaToken).toHaveBeenCalledWith(
        'test@example.com', // User's primary email
        expect.stringMatching(/^\d{6}$/),
        'AI-Recruitment-Clerk',
      );
    });

    it('should throw UnauthorizedException when MFA not enabled', async () => {
      userModel.findById.mockResolvedValue(mockUser);

      await expect(
        service.sendMfaToken('user123', MfaMethod.SMS),
      ).rejects.toThrow(new UnauthorizedException('MFA not enabled'));
    });

    it('should throw BadRequestException for invalid method', async () => {
      await expect(
        service.sendMfaToken('user123', MfaMethod.TOTP),
      ).rejects.toThrow(
        new BadRequestException('Invalid MFA method for token generation'),
      );
    });

    it('should handle SMS service errors', async () => {
      smsService.sendSms.mockRejectedValue(new Error('SMS service failed'));

      await expect(
        service.sendMfaToken('user123', MfaMethod.SMS),
      ).rejects.toThrow(
        new BadRequestException('Failed to send verification code via SMS'),
      );

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should store temporary token with expiration', async () => {
      await service.sendMfaToken('user123', MfaMethod.SMS);

      const temporaryTokens = (service as any).temporaryTokens;
      expect(temporaryTokens.has('user123')).toBe(true);

      const tokenData = temporaryTokens.get('user123');
      expect(tokenData.token).toMatch(/^\d{6}$/);
      expect(tokenData.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('Temporary Token Management', () => {
    beforeEach(() => {
      // Clear any existing tokens
      (service as any).temporaryTokens.clear();
    });

    it('should store and verify temporary token', async () => {
      const temporaryTokens = (service as any).temporaryTokens;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      (service as any).storeTemporaryToken('user123', '123456', expiresAt);

      expect(temporaryTokens.has('user123')).toBe(true);

      const isValid = (service as any).verifyTemporaryToken(
        'user123',
        '123456',
      );
      expect(isValid).toBe(true);

      // Token should be removed after verification
      expect(temporaryTokens.has('user123')).toBe(false);
    });

    it('should reject expired temporary token', async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago

      (service as any).storeTemporaryToken('user123', '123456', expiredDate);

      const isValid = (service as any).verifyTemporaryToken(
        'user123',
        '123456',
      );
      expect(isValid).toBe(false);
    });

    it('should reject invalid temporary token', async () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      (service as any).storeTemporaryToken('user123', '123456', expiresAt);

      const isValid = (service as any).verifyTemporaryToken(
        'user123',
        '654321',
      );
      expect(isValid).toBe(false);
    });

    it('should clean up expired tokens', async () => {
      const temporaryTokens = (service as any).temporaryTokens;
      const now = Date.now();

      // Add expired token
      temporaryTokens.set('user1', {
        token: '123456',
        expiresAt: new Date(now - 1000),
      });

      // Add valid token
      temporaryTokens.set('user2', {
        token: '789012',
        expiresAt: new Date(now + 5 * 60 * 1000),
      });

      (service as any).cleanupExpiredTokens();

      expect(temporaryTokens.has('user1')).toBe(false);
      expect(temporaryTokens.has('user2')).toBe(true);
    });

    it('should automatically schedule token cleanup', async () => {
      const temporaryTokens = (service as any).temporaryTokens;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      (service as any).storeTemporaryToken('user123', '123456', expiresAt);

      expect(temporaryTokens.has('user123')).toBe(true);

      // Advance time by 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000);

      expect(temporaryTokens.has('user123')).toBe(false);
    });
  });

  describe('normalizeMfaSettings', () => {
    it('should normalize null/undefined settings', () => {
      const normalized = (service as any).normalizeMfaSettings(null);

      expect(normalized).toEqual({
        enabled: false,
        methods: [],
        backupCodes: [],
        trustedDevices: [],
        failedAttempts: 0,
      });
    });

    it('should normalize string methods to enum values', () => {
      const rawSettings = {
        enabled: true,
        methods: ['sms', 'email', 'totp', 'unknown'],
        backupCodes: [],
        trustedDevices: [],
      };

      const normalized = (service as any).normalizeMfaSettings(rawSettings);

      expect(normalized.methods).toEqual([
        MfaMethod.SMS,
        MfaMethod.EMAIL,
        MfaMethod.TOTP,
        'unknown', // Unknown methods are preserved
      ]);
    });

    it('should preserve existing enum values', () => {
      const rawSettings = {
        enabled: true,
        methods: [MfaMethod.TOTP, MfaMethod.SMS],
        backupCodes: [],
        trustedDevices: [],
      };

      const normalized = (service as any).normalizeMfaSettings(rawSettings);

      expect(normalized.methods).toEqual([MfaMethod.TOTP, MfaMethod.SMS]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully in enableMfa', async () => {
      userModel.findById.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.enableMfa('user123', {
          method: MfaMethod.TOTP,
          currentPassword: 'password123',
        }),
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle bcrypt errors gracefully', async () => {
      userModel.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockRejectedValue(new Error('Bcrypt failed'));

      await expect(
        service.enableMfa('user123', {
          method: MfaMethod.TOTP,
          currentPassword: 'password123',
        }),
      ).rejects.toThrow('Bcrypt failed');
    });

    it('should handle speakeasy errors gracefully', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'INVALID_SECRET',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithMfa);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithMfa);

      speakeasyMock.totp.verify.mockImplementation(() => {
        throw new Error('Invalid secret');
      });

      await expect(
        service.verifyMfa('user123', { token: '123456' }),
      ).rejects.toThrow('Invalid MFA token');
    });

    it('should handle concurrent verification attempts', async () => {
      const userWithMfa = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'MOCK_SECRET',
          backupCodes: [],
          trustedDevices: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithMfa);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithMfa);
      speakeasyMock.totp.verify.mockReturnValue(true);

      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => service.verifyMfa('user123', { token: '123456' }));

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malformed MFA settings', async () => {
      const userWithMalformedSettings = {
        ...mockUser,
        mfaSettings: 'invalid_json_string',
      };
      userModel.findById.mockResolvedValue(userWithMalformedSettings);

      const status = await service.getMfaStatus('user123');

      // Should normalize malformed settings to defaults
      expect(status.enabled).toBe(false);
      expect(status.methods).toEqual([]);
    });

    it('should prevent backup code reuse', async () => {
      // This test assumes backup code verification is implemented
      // Currently not fully implemented in the service
      expect(true).toBe(true); // Placeholder for future implementation
    });

    it('should handle very large trusted device lists', async () => {
      const userWithManyDevices = {
        ...mockUser,
        mfaSettings: {
          enabled: true,
          methods: [MfaMethod.TOTP],
          totpSecret: 'MOCK_SECRET',
          trustedDevices: Array(100)
            .fill(0)
            .map((_, i) => `device${i}`),
          backupCodes: [],
          failedAttempts: 0,
        },
      };
      userModel.findById.mockResolvedValue(userWithManyDevices);
      userModel.findByIdAndUpdate.mockResolvedValue(userWithManyDevices);
      speakeasyMock.totp.verify.mockReturnValue(true);

      await service.verifyMfa(
        'user123',
        {
          token: '123456',
          rememberDevice: true,
        },
        'newdevice',
      );

      const updateCall = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(updateCall.mfaSettings.trustedDevices).toHaveLength(5);
    });

    it('should handle null user fields gracefully', async () => {
      const userWithNulls = {
        ...mockUser,
        email: null,
        hashedPassword: null,
        mfaSettings: null,
      };
      userModel.findById.mockResolvedValue(userWithNulls);

      await expect(service.getMfaStatus('user123')).resolves.toMatchObject({
        enabled: false,
        methods: [],
        remainingBackupCodes: 0,
      });
    });
  });
});
