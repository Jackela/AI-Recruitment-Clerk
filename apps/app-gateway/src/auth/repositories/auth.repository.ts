import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { UserProfileDocument } from '../../schemas/user-profile.schema';
import { UserProfile } from '../../schemas/user-profile.schema';

export interface TokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  tokenType: 'access' | 'refresh';
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
  };
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenId: string;
  deviceFingerprint: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    location?: string;
  };
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface MfaDeviceRecord {
  id: string;
  userId: string;
  deviceType: 'totp' | 'sms' | 'email' | 'backup';
  deviceName: string;
  deviceFingerprint?: string;
  isActive: boolean;
  verifiedAt: Date;
  lastUsedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class AuthRepository {
  private readonly logger = new Logger(AuthRepository.name);
  private readonly tokenStore = new Map<string, TokenRecord>();
  private readonly sessionStore = new Map<string, SessionRecord>();
  private readonly mfaDeviceStore = new Map<string, MfaDeviceRecord[]>();

  constructor(
    @InjectModel(UserProfile.name)
    private readonly _userProfileModel: Model<UserProfileDocument>,
  ) {}

  // Token Storage Methods
  async storeToken(
    record: Omit<TokenRecord, 'id' | 'createdAt'>,
  ): Promise<TokenRecord> {
    const tokenRecord: TokenRecord = {
      ...record,
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    this.tokenStore.set(tokenRecord.id, tokenRecord);
    this.logger.debug(
      `Stored ${record.tokenType} token for user ${record.userId}`,
    );
    return tokenRecord;
  }

  async getTokenByHash(tokenHash: string): Promise<TokenRecord | null> {
    for (const record of this.tokenStore.values()) {
      if (record.tokenHash === tokenHash && !record.revokedAt) {
        return record;
      }
    }
    return null;
  }

  async revokeToken(
    tokenId: string,
    reason: string,
  ): Promise<TokenRecord | null> {
    const record = this.tokenStore.get(tokenId);
    if (!record) {
      return null;
    }
    record.revokedAt = new Date();
    record.revokedReason = reason;
    this.tokenStore.set(tokenId, record);
    this.logger.debug(`Revoked token ${tokenId} with reason: ${reason}`);
    return record;
  }

  async revokeAllUserTokens(userId: string, reason: string): Promise<number> {
    let count = 0;
    for (const [id, record] of this.tokenStore.entries()) {
      if (record.userId === userId && !record.revokedAt) {
        record.revokedAt = new Date();
        record.revokedReason = reason;
        this.tokenStore.set(id, record);
        count++;
      }
    }
    this.logger.log(`Revoked ${count} tokens for user ${userId}`);
    return count;
  }

  async getActiveTokensByUser(userId: string): Promise<TokenRecord[]> {
    const tokens: TokenRecord[] = [];
    for (const record of this.tokenStore.values()) {
      if (
        record.userId === userId &&
        !record.revokedAt &&
        record.expiresAt > new Date()
      ) {
        tokens.push(record);
      }
    }
    return tokens;
  }

  async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, record] of this.tokenStore.entries()) {
      if (record.expiresAt < now || record.revokedAt) {
        this.tokenStore.delete(id);
        count++;
      }
    }
    return count;
  }

  // Refresh Token Rotation Methods
  async rotateRefreshToken(
    oldTokenId: string,
    newTokenRecord: Omit<TokenRecord, 'id' | 'createdAt'>,
  ): Promise<TokenRecord | null> {
    const oldToken = this.tokenStore.get(oldTokenId);
    if (!oldToken) {
      return null;
    }

    // Revoke old token
    oldToken.revokedAt = new Date();
    oldToken.revokedReason = 'token_rotation';
    this.tokenStore.set(oldTokenId, oldToken);

    // Create new token
    const newRecord: TokenRecord = {
      ...newTokenRecord,
      id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    this.tokenStore.set(newRecord.id, newRecord);

    this.logger.debug(
      `Rotated refresh token for user ${newTokenRecord.userId}`,
    );
    return newRecord;
  }

  async isRefreshTokenValid(tokenHash: string): Promise<boolean> {
    const record = await this.getTokenByHash(tokenHash);
    if (!record) return false;
    if (record.tokenType !== 'refresh') return false;
    if (record.revokedAt) return false;
    if (record.expiresAt <= new Date()) return false;
    return true;
  }

  // Session Management Methods
  async createSession(
    sessionData: Omit<SessionRecord, 'id' | 'createdAt'>,
  ): Promise<SessionRecord> {
    const session: SessionRecord = {
      ...sessionData,
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    this.sessionStore.set(session.id, session);
    this.logger.debug(
      `Created session ${session.id} for user ${sessionData.userId}`,
    );
    return session;
  }

  async getSessionById(sessionId: string): Promise<SessionRecord | null> {
    return this.sessionStore.get(sessionId) || null;
  }

  async getActiveSessionsByUser(userId: string): Promise<SessionRecord[]> {
    const sessions: SessionRecord[] = [];
    for (const session of this.sessionStore.values()) {
      if (
        session.userId === userId &&
        session.isActive &&
        session.expiresAt > new Date()
      ) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  async updateSessionActivity(
    sessionId: string,
  ): Promise<SessionRecord | null> {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      return null;
    }
    session.lastActivityAt = new Date();
    this.sessionStore.set(sessionId, session);
    return session;
  }

  async terminateSession(sessionId: string): Promise<boolean> {
    const session = this.sessionStore.get(sessionId);
    if (!session) {
      return false;
    }
    session.isActive = false;
    this.sessionStore.set(sessionId, session);
    this.logger.debug(`Terminated session ${sessionId}`);
    return true;
  }

  async terminateAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const [id, session] of this.sessionStore.entries()) {
      if (session.userId === userId && session.isActive) {
        session.isActive = false;
        this.sessionStore.set(id, session);
        count++;
      }
    }
    this.logger.log(`Terminated ${count} sessions for user ${userId}`);
    return count;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let count = 0;
    for (const [id, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now || !session.isActive) {
        this.sessionStore.delete(id);
        count++;
      }
    }
    return count;
  }

  // MFA Device Storage Methods
  async storeMfaDevice(
    deviceData: Omit<MfaDeviceRecord, 'id' | 'createdAt'>,
  ): Promise<MfaDeviceRecord> {
    const device: MfaDeviceRecord = {
      ...deviceData,
      id: `mfa-device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const userDevices = this.mfaDeviceStore.get(deviceData.userId) || [];
    userDevices.push(device);
    this.mfaDeviceStore.set(deviceData.userId, userDevices);

    this.logger.debug(
      `Stored MFA device ${device.id} for user ${deviceData.userId}`,
    );
    return device;
  }

  async getMfaDevicesByUser(userId: string): Promise<MfaDeviceRecord[]> {
    return this.mfaDeviceStore.get(userId) || [];
  }

  async getActiveMfaDevicesByUser(userId: string): Promise<MfaDeviceRecord[]> {
    const devices = this.mfaDeviceStore.get(userId) || [];
    return devices.filter((d) => d.isActive);
  }

  async updateMfaDeviceLastUsed(
    deviceId: string,
  ): Promise<MfaDeviceRecord | null> {
    for (const [userId, devices] of this.mfaDeviceStore.entries()) {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        device.lastUsedAt = new Date();
        this.mfaDeviceStore.set(userId, devices);
        return device;
      }
    }
    return null;
  }

  async deactivateMfaDevice(deviceId: string): Promise<MfaDeviceRecord | null> {
    for (const [userId, devices] of this.mfaDeviceStore.entries()) {
      const device = devices.find((d) => d.id === deviceId);
      if (device) {
        device.isActive = false;
        this.mfaDeviceStore.set(userId, devices);
        this.logger.debug(`Deactivated MFA device ${deviceId}`);
        return device;
      }
    }
    return null;
  }

  async removeMfaDevice(deviceId: string): Promise<boolean> {
    for (const [userId, devices] of this.mfaDeviceStore.entries()) {
      const index = devices.findIndex((d) => d.id === deviceId);
      if (index !== -1) {
        devices.splice(index, 1);
        this.mfaDeviceStore.set(userId, devices);
        this.logger.debug(`Removed MFA device ${deviceId}`);
        return true;
      }
    }
    return false;
  }

  // GDPR Compliance Methods
  async deleteAllUserAuthData(userId: string): Promise<void> {
    // Delete all tokens
    for (const [id, record] of this.tokenStore.entries()) {
      if (record.userId === userId) {
        this.tokenStore.delete(id);
      }
    }

    // Delete all sessions
    for (const [id, session] of this.sessionStore.entries()) {
      if (session.userId === userId) {
        this.sessionStore.delete(id);
      }
    }

    // Delete all MFA devices
    this.mfaDeviceStore.delete(userId);

    this.logger.log(
      `Deleted all auth data for user ${userId} (GDPR compliance)`,
    );
  }

  async getUserAuthAuditLog(userId: string): Promise<{
    tokens: TokenRecord[];
    sessions: SessionRecord[];
    mfaDevices: MfaDeviceRecord[];
  }> {
    const tokens: TokenRecord[] = [];
    for (const record of this.tokenStore.values()) {
      if (record.userId === userId) {
        tokens.push(record);
      }
    }

    const sessions: SessionRecord[] = [];
    for (const session of this.sessionStore.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }

    return {
      tokens,
      sessions,
      mfaDevices: this.mfaDeviceStore.get(userId) || [],
    };
  }
}
