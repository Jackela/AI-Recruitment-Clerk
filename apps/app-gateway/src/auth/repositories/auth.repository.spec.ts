import { Test, type TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  AuthRepository,
  type TokenRecord,
  type SessionRecord,
  type MfaDeviceRecord,
} from './auth.repository';
import { UserProfile } from '../../schemas/user-profile.schema';

describe('AuthRepository', () => {
  let repository: AuthRepository;

  const mockUserProfileModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        {
          provide: getModelToken(UserProfile.name),
          useValue: mockUserProfileModel,
        },
      ],
    }).compile();

    repository = module.get<AuthRepository>(AuthRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Storage', () => {
    it('should store a new token record', async () => {
      const tokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'hash123',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        },
      };

      const result = await repository.storeToken(tokenData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(tokenData.userId);
      expect(result.tokenHash).toBe(tokenData.tokenHash);
      expect(result.tokenType).toBe(tokenData.tokenType);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.id).toContain('token-');
    });

    it('should retrieve a token by hash', async () => {
      const tokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'hash456',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const stored = await repository.storeToken(tokenData);
      const retrieved = await repository.getTokenByHash('hash456');

      expect(retrieved).toBeDefined();
      expect(retrieved?.tokenHash).toBe('hash456');
      expect(retrieved?.id).toBe(stored.id);
    });

    it('should return null for non-existent token hash', async () => {
      const result = await repository.getTokenByHash('non-existent-hash');
      expect(result).toBeNull();
    });

    it('should revoke a token with a reason', async () => {
      const tokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'hash789',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const stored = await repository.storeToken(tokenData);
      const revoked = await repository.revokeToken(stored.id, 'logout');

      expect(revoked).toBeDefined();
      expect(revoked?.revokedAt).toBeInstanceOf(Date);
      expect(revoked?.revokedReason).toBe('logout');
    });

    it('should get all active tokens for a user', async () => {
      // Store multiple tokens
      await repository.storeToken({
        userId: 'user-456',
        tokenHash: 'hash1',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await repository.storeToken({
        userId: 'user-456',
        tokenHash: 'hash2',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Store expired token
      await repository.storeToken({
        userId: 'user-456',
        tokenHash: 'hash3',
        tokenType: 'access',
        expiresAt: new Date(Date.now() - 3600000), // Expired
      });

      const activeTokens = await repository.getActiveTokensByUser('user-456');

      expect(activeTokens).toHaveLength(2);
      expect(activeTokens.every((t) => t.expiresAt > new Date())).toBe(true);
    });
  });

  describe('Refresh Token Rotation', () => {
    it('should rotate refresh token and revoke old one', async () => {
      const oldTokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'old-hash',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const oldToken = await repository.storeToken(oldTokenData);

      const newTokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'new-hash',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const newToken = await repository.rotateRefreshToken(
        oldToken.id,
        newTokenData,
      );

      expect(newToken).toBeDefined();
      expect(newToken?.tokenHash).toBe('new-hash');

      // Verify old token is revoked
      const oldTokenAfterRotation = await repository.getTokenByHash('old-hash');
      expect(oldTokenAfterRotation?.revokedAt).toBeDefined();
      expect(oldTokenAfterRotation?.revokedReason).toBe('token_rotation');
    });

    it('should return null when rotating non-existent token', async () => {
      const newTokenData: Omit<TokenRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenHash: 'new-hash',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const result = await repository.rotateRefreshToken(
        'non-existent-id',
        newTokenData,
      );
      expect(result).toBeNull();
    });

    it('should validate refresh token correctly', async () => {
      // Valid token
      const validToken = await repository.storeToken({
        userId: 'user-123',
        tokenHash: 'valid-hash',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      });

      // Expired token
      await repository.storeToken({
        userId: 'user-123',
        tokenHash: 'expired-hash',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() - 86400000),
      });

      // Access token (not refresh)
      await repository.storeToken({
        userId: 'user-123',
        tokenHash: 'access-hash',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      expect(await repository.isRefreshTokenValid('valid-hash')).toBe(true);
      expect(await repository.isRefreshTokenValid('expired-hash')).toBe(false);
      expect(await repository.isRefreshTokenValid('access-hash')).toBe(false);
      expect(await repository.isRefreshTokenValid('non-existent-hash')).toBe(
        false,
      );
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const sessionData: Omit<SessionRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        tokenId: 'token-123',
        deviceFingerprint: 'device-fp-123',
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          location: 'US',
        },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      };

      const session = await repository.createSession(sessionData);

      expect(session).toBeDefined();
      expect(session.id).toContain('session-');
      expect(session.userId).toBe('user-123');
      expect(session.isActive).toBe(true);
    });

    it('should get active sessions by user', async () => {
      // Create active session
      await repository.createSession({
        userId: 'user-789',
        tokenId: 'token-1',
        deviceFingerprint: 'fp-1',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      // Create inactive session
      const inactiveSession = await repository.createSession({
        userId: 'user-789',
        tokenId: 'token-2',
        deviceFingerprint: 'fp-2',
        deviceInfo: { userAgent: 'Chrome', ipAddress: '2.2.2.2' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });
      await repository.terminateSession(inactiveSession.id);

      // Create expired session
      await repository.createSession({
        userId: 'user-789',
        tokenId: 'token-3',
        deviceFingerprint: 'fp-3',
        deviceInfo: { userAgent: 'Safari', ipAddress: '3.3.3.3' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() - 86400000),
        isActive: true,
      });

      const activeSessions =
        await repository.getActiveSessionsByUser('user-789');

      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0].deviceFingerprint).toBe('fp-1');
    });

    it('should update session activity', async () => {
      const session = await repository.createSession({
        userId: 'user-123',
        tokenId: 'token-123',
        deviceFingerprint: 'fp-123',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      const oldActivity = session.lastActivityAt;
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repository.updateSessionActivity(session.id);

      expect(updated).toBeDefined();
      expect(updated?.lastActivityAt.getTime()).toBeGreaterThan(
        oldActivity.getTime(),
      );
    });

    it('should terminate all user sessions', async () => {
      // Create multiple sessions
      await repository.createSession({
        userId: 'user-multiple',
        tokenId: 'token-1',
        deviceFingerprint: 'fp-1',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      await repository.createSession({
        userId: 'user-multiple',
        tokenId: 'token-2',
        deviceFingerprint: 'fp-2',
        deviceInfo: { userAgent: 'Chrome', ipAddress: '2.2.2.2' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      const terminatedCount =
        await repository.terminateAllUserSessions('user-multiple');

      expect(terminatedCount).toBe(2);

      const activeSessions =
        await repository.getActiveSessionsByUser('user-multiple');
      expect(activeSessions).toHaveLength(0);
    });
  });

  describe('MFA Device Storage', () => {
    it('should store an MFA device', async () => {
      const deviceData: Omit<MfaDeviceRecord, 'id' | 'createdAt'> = {
        userId: 'user-123',
        deviceType: 'totp',
        deviceName: 'My Authenticator App',
        deviceFingerprint: 'totp-fp-123',
        isActive: true,
        verifiedAt: new Date(),
        metadata: { issuer: 'AI-Recruitment-Clerk' },
      };

      const device = await repository.storeMfaDevice(deviceData);

      expect(device).toBeDefined();
      expect(device.id).toContain('mfa-device-');
      expect(device.deviceType).toBe('totp');
      expect(device.isActive).toBe(true);
    });

    it('should get active MFA devices by user', async () => {
      // Store active device
      await repository.storeMfaDevice({
        userId: 'user-mfa',
        deviceType: 'totp',
        deviceName: 'TOTP Device',
        deviceFingerprint: 'fp-totp',
        isActive: true,
        verifiedAt: new Date(),
      });

      // Store inactive device
      await repository.storeMfaDevice({
        userId: 'user-mfa',
        deviceType: 'sms',
        deviceName: 'SMS Device',
        deviceFingerprint: 'fp-sms',
        isActive: false,
        verifiedAt: new Date(),
      });

      // Store backup codes
      await repository.storeMfaDevice({
        userId: 'user-mfa',
        deviceType: 'backup',
        deviceName: 'Backup Codes',
        isActive: true,
        verifiedAt: new Date(),
      });

      const activeDevices =
        await repository.getActiveMfaDevicesByUser('user-mfa');

      expect(activeDevices).toHaveLength(2);
      expect(activeDevices.every((d) => d.isActive)).toBe(true);
    });

    it('should update MFA device last used timestamp', async () => {
      const device = await repository.storeMfaDevice({
        userId: 'user-123',
        deviceType: 'totp',
        deviceName: 'TOTP',
        isActive: true,
        verifiedAt: new Date(),
      });

      expect(device.lastUsedAt).toBeUndefined();

      const updated = await repository.updateMfaDeviceLastUsed(device.id);

      expect(updated).toBeDefined();
      expect(updated?.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should deactivate and remove MFA devices', async () => {
      const device = await repository.storeMfaDevice({
        userId: 'user-123',
        deviceType: 'sms',
        deviceName: 'SMS',
        isActive: true,
        verifiedAt: new Date(),
      });

      const deactivated = await repository.deactivateMfaDevice(device.id);
      expect(deactivated?.isActive).toBe(false);

      const removed = await repository.removeMfaDevice(device.id);
      expect(removed).toBe(true);

      const devices = await repository.getMfaDevicesByUser('user-123');
      expect(devices.find((d) => d.id === device.id)).toBeUndefined();
    });
  });

  describe('GDPR Compliance', () => {
    it('should delete all user auth data', async () => {
      const userId = 'user-gdpr-delete';

      // Create tokens
      await repository.storeToken({
        userId,
        tokenHash: 'hash1',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Create session
      await repository.createSession({
        userId,
        tokenId: 'token-1',
        deviceFingerprint: 'fp-1',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      // Create MFA device
      await repository.storeMfaDevice({
        userId,
        deviceType: 'totp',
        deviceName: 'TOTP',
        isActive: true,
        verifiedAt: new Date(),
      });

      await repository.deleteAllUserAuthData(userId);

      const auditLog = await repository.getUserAuthAuditLog(userId);
      expect(auditLog.tokens).toHaveLength(0);
      expect(auditLog.sessions).toHaveLength(0);
      expect(auditLog.mfaDevices).toHaveLength(0);
    });

    it('should provide user auth audit log', async () => {
      const userId = 'user-audit';

      const token = await repository.storeToken({
        userId,
        tokenHash: 'hash-audit',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      const session = await repository.createSession({
        userId,
        tokenId: 'token-audit',
        deviceFingerprint: 'fp-audit',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      const device = await repository.storeMfaDevice({
        userId,
        deviceType: 'totp',
        deviceName: 'TOTP Audit',
        isActive: true,
        verifiedAt: new Date(),
      });

      const auditLog = await repository.getUserAuthAuditLog(userId);

      expect(auditLog.tokens).toHaveLength(1);
      expect(auditLog.tokens[0].id).toBe(token.id);
      expect(auditLog.sessions).toHaveLength(1);
      expect(auditLog.sessions[0].id).toBe(session.id);
      expect(auditLog.mfaDevices).toHaveLength(1);
      expect(auditLog.mfaDevices[0].id).toBe(device.id);
    });

    it('should revoke all user tokens', async () => {
      const userId = 'user-revoke-all';

      await repository.storeToken({
        userId,
        tokenHash: 'hash1',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      await repository.storeToken({
        userId,
        tokenHash: 'hash2',
        tokenType: 'refresh',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const revokedCount = await repository.revokeAllUserTokens(
        userId,
        'security_breach',
      );

      expect(revokedCount).toBe(2);

      const activeTokens = await repository.getActiveTokensByUser(userId);
      expect(activeTokens).toHaveLength(0);
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired tokens', async () => {
      // Create valid token
      await repository.storeToken({
        userId: 'user-cleanup',
        tokenHash: 'valid',
        tokenType: 'access',
        expiresAt: new Date(Date.now() + 3600000),
      });

      // Create expired token
      await repository.storeToken({
        userId: 'user-cleanup',
        tokenHash: 'expired',
        tokenType: 'access',
        expiresAt: new Date(Date.now() - 3600000),
      });

      const cleanedCount = await repository.cleanupExpiredTokens();

      expect(cleanedCount).toBe(1);

      const activeTokens =
        await repository.getActiveTokensByUser('user-cleanup');
      expect(activeTokens).toHaveLength(1);
    });

    it('should cleanup expired sessions', async () => {
      // Create valid session
      await repository.createSession({
        userId: 'user-cleanup-session',
        tokenId: 'token-1',
        deviceFingerprint: 'fp-1',
        deviceInfo: { userAgent: 'Mozilla', ipAddress: '1.1.1.1' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });

      // Create inactive session
      const inactiveSession = await repository.createSession({
        userId: 'user-cleanup-session',
        tokenId: 'token-2',
        deviceFingerprint: 'fp-2',
        deviceInfo: { userAgent: 'Chrome', ipAddress: '2.2.2.2' },
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      });
      await repository.terminateSession(inactiveSession.id);

      const cleanedCount = await repository.cleanupExpiredSessions();

      expect(cleanedCount).toBe(1);

      const activeSessions = await repository.getActiveSessionsByUser(
        'user-cleanup-session',
      );
      expect(activeSessions).toHaveLength(1);
    });
  });
});
