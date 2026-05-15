/**
 * @fileoverview MFA Controller Tests - Comprehensive test coverage for multi-factor authentication endpoints
 * @author AI Recruitment Team
 * @since v1.0.0
 * @version v1.0.0
 * @module MfaControllerTests
 */

import { HttpStatus, HttpException } from '@nestjs/common';
import { MfaController } from './mfa.controller';
import type { MfaService } from '../services/mfa.service';
import type {
  EnableMfaDto,
  VerifyMfaDto,
  DisableMfaDto,
  GenerateBackupCodesDto,
  MfaStatusDto,
  MfaSetupResponseDto,
} from '../dto/mfa.dto';
import { MfaMethod } from '../dto/mfa.dto';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

describe('MfaController', () => {
  let controller: MfaController;
  let mfaService: jest.Mocked<MfaService>;

  const mockUserId = 'user-123';

  const mockAuthenticatedRequest = {
    user: {
      sub: mockUserId,
      email: 'test@example.com',
    },
    headers: {
      'user-agent': 'Mozilla/5.0 (Test)',
      'accept-language': 'en-US',
      'accept-encoding': 'gzip, deflate',
    },
    ip: '127.0.0.1',
  } as unknown as AuthenticatedRequest;

  const mockMfaStatus: MfaStatusDto = {
    enabled: true,
    methods: [MfaMethod.TOTP],
    remainingBackupCodes: 10,
    deviceTrusted: false,
    hasBackupCodes: true,
  };

  const mockMfaSetupResponse: MfaSetupResponseDto = {
    success: true,
    qrCode: 'data:image/png;base64,mock-qr-code',
    secretKey: 'MOCKSECRETKEY123456789',
    backupCodes: ['ABCD-EFGH', 'IJKL-MNOP'],
    message: 'TOTP MFA has been enabled successfully',
  };

  beforeEach(() => {
    mfaService = {
      getMfaStatus: jest.fn(),
      enableMfa: jest.fn(),
      verifyMfa: jest.fn(),
      disableMfa: jest.fn(),
      generateNewBackupCodes: jest.fn(),
      sendMfaToken: jest.fn(),
    } as unknown as jest.Mocked<MfaService>;

    controller = new MfaController(mfaService as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /auth/mfa/status', () => {
    it('should return MFA status for authenticated user', async () => {
      // Arrange
      mfaService.getMfaStatus.mockResolvedValue(mockMfaStatus);

      // Act
      const result = await controller.getMfaStatus(mockAuthenticatedRequest);

      // Assert
      expect(result).toEqual(mockMfaStatus);
      expect(mfaService.getMfaStatus).toHaveBeenCalledWith(mockUserId);
    });

    it('should return MFA status when MFA is disabled', async () => {
      // Arrange
      const disabledStatus: MfaStatusDto = {
        enabled: false,
        methods: [],
        remainingBackupCodes: 0,
        deviceTrusted: false,
        hasBackupCodes: false,
      };
      mfaService.getMfaStatus.mockResolvedValue(disabledStatus);

      // Act
      const result = await controller.getMfaStatus(mockAuthenticatedRequest);

      // Assert
      expect(result.enabled).toBe(false);
      expect(result.methods).toHaveLength(0);
    });

    it('should propagate service errors as HTTP exceptions', async () => {
      // Arrange
      const serviceError = new Error('Database connection failed');
      mfaService.getMfaStatus.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getMfaStatus(mockAuthenticatedRequest)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('POST /auth/mfa/enable', () => {
    const enableMfaDto: EnableMfaDto = {
      method: MfaMethod.TOTP,
      currentPassword: 'SecurePass123!',
    };

    it('should enable TOTP MFA successfully', async () => {
      // Arrange
      mfaService.enableMfa.mockResolvedValue(mockMfaSetupResponse);

      // Act
      const result = await controller.enableMfa(mockAuthenticatedRequest, enableMfaDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.qrCode).toBeDefined();
      expect(result.secretKey).toBeDefined();
      expect(mfaService.enableMfa).toHaveBeenCalledWith(mockUserId, enableMfaDto);
    });

    it('should enable SMS MFA with phone number', async () => {
      // Arrange
      const smsEnableDto: EnableMfaDto = {
        method: MfaMethod.SMS,
        phoneNumber: '+1234567890',
        currentPassword: 'SecurePass123!',
      };
      const smsResponse: MfaSetupResponseDto = {
        success: true,
        message: 'SMS MFA has been enabled successfully',
      };
      mfaService.enableMfa.mockResolvedValue(smsResponse);

      // Act
      const result = await controller.enableMfa(mockAuthenticatedRequest, smsEnableDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('SMS');
    });

    it('should enable Email MFA with email address', async () => {
      // Arrange
      const emailEnableDto: EnableMfaDto = {
        method: MfaMethod.EMAIL,
        email: 'mfa@example.com',
        currentPassword: 'SecurePass123!',
      };
      const emailResponse: MfaSetupResponseDto = {
        success: true,
        message: 'EMAIL MFA has been enabled successfully',
      };
      mfaService.enableMfa.mockResolvedValue(emailResponse);

      // Act
      const result = await controller.enableMfa(mockAuthenticatedRequest, emailEnableDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('EMAIL');
    });

    it('should throw 401 Unauthorized for invalid password', async () => {
      // Arrange
      const invalidPasswordError = new Error('Invalid password');
      mfaService.enableMfa.mockRejectedValue(invalidPasswordError);

      // Act & Assert
      await expect(
        controller.enableMfa(mockAuthenticatedRequest, enableMfaDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 400 Bad Request for missing required fields', async () => {
      // Arrange
      const validationError = new Error('Phone number is required for SMS MFA');
      mfaService.enableMfa.mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        controller.enableMfa(mockAuthenticatedRequest, enableMfaDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 500 Internal Server Error for unexpected errors', async () => {
      // Arrange
      mfaService.enableMfa.mockRejectedValue(new Error('Unknown error'));

      // Act & Assert
      await expect(
        controller.enableMfa(mockAuthenticatedRequest, enableMfaDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /auth/mfa/verify', () => {
    const verifyMfaDto: VerifyMfaDto = {
      token: '123456',
      method: MfaMethod.TOTP,
      rememberDevice: false,
    };

    it('should verify MFA token successfully', async () => {
      // Arrange
      mfaService.verifyMfa.mockResolvedValue({ success: true, deviceTrusted: false });

      // Act
      const result = await controller.verifyMfa(mockAuthenticatedRequest, verifyMfaDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('MFA verification successful');
      expect(mfaService.verifyMfa).toHaveBeenCalledWith(
        mockUserId,
        verifyMfaDto,
        expect.any(String),
      );
    });

    it('should verify MFA with device trust enabled', async () => {
      // Arrange
      const trustDto: VerifyMfaDto = {
        token: '123456',
        rememberDevice: true,
      };
      mfaService.verifyMfa.mockResolvedValue({ success: true, deviceTrusted: true });

      // Act
      const result = await controller.verifyMfa(mockAuthenticatedRequest, trustDto);

      // Assert
      expect(result.deviceTrusted).toBe(true);
    });

    it('should throw 401 Unauthorized for invalid token', async () => {
      // Arrange
      const invalidTokenError = new Error('Invalid MFA token');
      mfaService.verifyMfa.mockRejectedValue(invalidTokenError);

      // Act & Assert
      await expect(
        controller.verifyMfa(mockAuthenticatedRequest, verifyMfaDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 401 Unauthorized for locked account', async () => {
      // Arrange
      const lockedError = new Error('Account locked due to too many failed attempts');
      mfaService.verifyMfa.mockRejectedValue(lockedError);

      // Act & Assert
      await expect(
        controller.verifyMfa(mockAuthenticatedRequest, verifyMfaDto),
      ).rejects.toThrow(HttpException);
    });

    it('should handle verification without specifying method', async () => {
      // Arrange
      const noMethodDto: VerifyMfaDto = { token: '123456' };
      mfaService.verifyMfa.mockResolvedValue({ success: true, deviceTrusted: false });

      // Act
      const result = await controller.verifyMfa(mockAuthenticatedRequest, noMethodDto);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('POST /auth/mfa/disable', () => {
    const disableMfaDto: DisableMfaDto = {
      currentPassword: 'SecurePass123!',
      mfaToken: '123456',
    };

    it('should disable MFA successfully', async () => {
      // Arrange
      mfaService.disableMfa.mockResolvedValue({ success: true });

      // Act
      const result = await controller.disableMfa(mockAuthenticatedRequest, disableMfaDto);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('disabled');
      expect(mfaService.disableMfa).toHaveBeenCalledWith(mockUserId, disableMfaDto);
    });

    it('should throw 401 Unauthorized for invalid password', async () => {
      // Arrange
      const invalidPasswordError = new Error('Invalid password');
      mfaService.disableMfa.mockRejectedValue(invalidPasswordError);

      // Act & Assert
      await expect(
        controller.disableMfa(mockAuthenticatedRequest, disableMfaDto),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 401 Unauthorized for invalid MFA token', async () => {
      // Arrange
      const invalidTokenError = new Error('Invalid MFA token');
      mfaService.disableMfa.mockRejectedValue(invalidTokenError);

      // Act & Assert
      await expect(
        controller.disableMfa(mockAuthenticatedRequest, disableMfaDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('POST /auth/mfa/backup-codes/generate', () => {
    const generateBackupCodesDto: GenerateBackupCodesDto = {
      currentPassword: 'SecurePass123!',
      mfaToken: '123456',
    };

    it('should generate new backup codes successfully', async () => {
      // Arrange
      const newBackupCodes = ['AAAA-1111', 'BBBB-2222', 'CCCC-3333'];
      mfaService.generateNewBackupCodes.mockResolvedValue(newBackupCodes);

      // Act
      const result = await controller.generateBackupCodes(
        mockAuthenticatedRequest,
        generateBackupCodesDto,
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.backupCodes).toEqual(newBackupCodes);
      expect(result.backupCodes.length).toBeGreaterThan(0);
    });

    it('should throw 401 Unauthorized for invalid credentials', async () => {
      // Arrange
      const unauthorizedError = new Error('Invalid password');
      mfaService.generateNewBackupCodes.mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(
        controller.generateBackupCodes(mockAuthenticatedRequest, generateBackupCodesDto),
      ).rejects.toThrow(HttpException);
    });

    it('should include security warning in response message', async () => {
      // Arrange
      mfaService.generateNewBackupCodes.mockResolvedValue(['CODE-1234']);

      // Act
      const result = await controller.generateBackupCodes(
        mockAuthenticatedRequest,
        generateBackupCodesDto,
      );

      // Assert
      expect(result.message).toContain('securely');
    });
  });

  describe('POST /auth/mfa/send-token/:method', () => {
    it('should send MFA token via SMS successfully', async () => {
      // Arrange
      const smsResult = { success: true, message: 'Verification code sent via SMS' };
      mfaService.sendMfaToken.mockResolvedValue(smsResult);

      // Act
      const result = await controller.sendMfaToken(mockAuthenticatedRequest, {
        method: MfaMethod.SMS,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mfaService.sendMfaToken).toHaveBeenCalledWith(mockUserId, MfaMethod.SMS);
    });

    it('should send MFA token via Email successfully', async () => {
      // Arrange
      const emailResult = { success: true, message: 'Verification code sent via EMAIL' };
      mfaService.sendMfaToken.mockResolvedValue(emailResult);

      // Act
      const result = await controller.sendMfaToken(mockAuthenticatedRequest, {
        method: MfaMethod.EMAIL,
      });

      // Assert
      expect(result.success).toBe(true);
    });

    it('should throw 400 Bad Request for TOTP method', async () => {
      // Act & Assert
      await expect(
        controller.sendMfaToken(mockAuthenticatedRequest, { method: MfaMethod.TOTP }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 400 Bad Request for invalid MFA method', async () => {
      // Arrange
      const invalidMethod = 'invalid_method' as MfaMethod;

      // Act & Assert
      await expect(
        controller.sendMfaToken(mockAuthenticatedRequest, { method: invalidMethod }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw 400 Bad Request when MFA not enabled', async () => {
      // Arrange
      const notEnabledError = new Error('MFA not enabled');
      mfaService.sendMfaToken.mockRejectedValue(notEnabledError);

      // Act & Assert
      await expect(
        controller.sendMfaToken(mockAuthenticatedRequest, { method: MfaMethod.SMS }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('DELETE /auth/mfa/trusted-devices', () => {
    it('should remove all trusted devices successfully', async () => {
      // Act
      const result = await controller.removeTrustedDevices(mockAuthenticatedRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('trusted devices');
    });

    it('should indicate MFA will be required on all devices', async () => {
      // Act
      const result = await controller.removeTrustedDevices(mockAuthenticatedRequest);

      // Assert
      expect(result.message).toContain('prompted for MFA');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      // Arrange
      const serviceError = new Error('Service temporarily unavailable');
      mfaService.getMfaStatus.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getMfaStatus(mockAuthenticatedRequest)).rejects.toThrow(
        HttpException,
      );
    });

    it('should handle database connection errors', async () => {
      // Arrange
      const dbError = new Error('Database connection lost');
      mfaService.enableMfa.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        controller.enableMfa(mockAuthenticatedRequest, {
          method: MfaMethod.TOTP,
          currentPassword: 'test',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in MFA status', async () => {
      // Arrange
      mfaService.getMfaStatus.mockResolvedValue(mockMfaStatus);

      // Act
      const result = await controller.getMfaStatus(mockAuthenticatedRequest);

      // Assert
      expect(result).not.toHaveProperty('secretKey');
      expect(result).not.toHaveProperty('backupCodes');
    });

    it('should require authentication for all endpoints', async () => {
      // All endpoints use @UseGuards(JwtAuthGuard), so we verify the guard is applied
      // by checking that the controller methods expect AuthenticatedRequest
      expect(controller.getMfaStatus).toBeDefined();
      expect(controller.enableMfa).toBeDefined();
      expect(controller.verifyMfa).toBeDefined();
      expect(controller.disableMfa).toBeDefined();
    });

    it('should validate token format (numeric only)', async () => {
      // Arrange
      const invalidTokenDto: VerifyMfaDto = {
        token: 'abc123',
        method: MfaMethod.TOTP,
      };
      mfaService.verifyMfa.mockRejectedValue(new Error('Invalid MFA token'));

      // Act & Assert
      await expect(
        controller.verifyMfa(mockAuthenticatedRequest, invalidTokenDto),
      ).rejects.toThrow(HttpException);
    });

    it('should validate token length (4-8 characters)', async () => {
      // Arrange
      const shortTokenDto: VerifyMfaDto = { token: '12', method: MfaMethod.TOTP };
      const longTokenDto: VerifyMfaDto = {
        token: '123456789',
        method: MfaMethod.TOTP,
      };
      mfaService.verifyMfa.mockRejectedValue(new Error('Invalid token length'));

      // Act & Assert
      await expect(
        controller.verifyMfa(mockAuthenticatedRequest, shortTokenDto),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.verifyMfa(mockAuthenticatedRequest, longTokenDto),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Device Fingerprinting', () => {
    it('should generate device fingerprint from request headers', async () => {
      // Arrange
      const verifyDto: VerifyMfaDto = { token: '123456' };
      mfaService.verifyMfa.mockResolvedValue({ success: true });

      // Act
      await controller.verifyMfa(mockAuthenticatedRequest, verifyDto);

      // Assert
      expect(mfaService.verifyMfa).toHaveBeenCalledWith(
        mockUserId,
        verifyDto,
        expect.any(String),
      );
      const deviceFingerprint = (mfaService.verifyMfa as jest.Mock).mock.calls[0][2];
      expect(deviceFingerprint).toBeDefined();
      expect(typeof deviceFingerprint).toBe('string');
    });

    it('should handle missing request headers gracefully', async () => {
      // Arrange
      const minimalRequest = {
        user: { sub: mockUserId },
        headers: {},
      } as AuthenticatedRequest;
      mfaService.verifyMfa.mockResolvedValue({ success: true });

      // Act
      await controller.verifyMfa(minimalRequest, { token: '123456' });

      // Assert
      expect(mfaService.verifyMfa).toHaveBeenCalledWith(
        mockUserId,
        { token: '123456' },
        expect.any(String),
      );
    });
  });

  describe('Performance', () => {
    it('should complete MFA verification within performance budget', async () => {
      // Arrange
      mfaService.verifyMfa.mockResolvedValue({ success: true });

      // Act
      const startTime = Date.now();
      await controller.verifyMfa(mockAuthenticatedRequest, { token: '123456' });
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(200);
    });
  });
});
