import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  ConsentRecord,
  ConsentAuditLog,
  CookieConsent,
  ConsentStatus,
  ConsentPurpose,
  DataCategory,
  type ConsentRecordDocument,
  type ConsentAuditLogDocument,
  type CookieConsentDocument,
} from '../../schemas/consent-record.schema';

export interface ConsentVersionRecord {
  id: string;
  version: string;
  purpose: ConsentPurpose;
  consentText: string;
  dataCategories: DataCategory[];
  legalBasis: string;
  effectiveDate: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  purpose: ConsentPurpose;
  withdrawalDate: Date;
  reason?: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
  previousConsentDate: Date;
  createdAt: Date;
}

export interface ConsentAuditEntry {
  id: string;
  userId: string;
  action: 'grant' | 'withdraw' | 'renew' | 'expire' | 'update';
  purpose: ConsentPurpose;
  previousStatus: ConsentStatus;
  newStatus: ConsentStatus;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConsentRepository {
  private readonly logger = new Logger(ConsentRepository.name);
  private readonly consentVersionStore = new Map<
    string,
    ConsentVersionRecord[]
  >();
  private readonly withdrawalStore = new Map<string, WithdrawalRecord[]>();

  constructor(
    @InjectModel(ConsentRecord.name)
    private readonly consentRecordModel: Model<ConsentRecordDocument>,
    @InjectModel(ConsentAuditLog.name)
    private readonly consentAuditLogModel: Model<ConsentAuditLogDocument>,
    @InjectModel(CookieConsent.name)
    private readonly cookieConsentModel: Model<CookieConsentDocument>,
  ) {}

  // Consent Record Storage Methods
  async createConsentRecord(
    recordData: Omit<ConsentRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ConsentRecordDocument> {
    const record = new this.consentRecordModel({
      ...recordData,
      id: `consent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    await record.save();
    this.logger.debug(
      `Created consent record ${record.id} for user ${recordData.userId}`,
    );
    return record;
  }

  async getConsentRecordByUserAndPurpose(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<ConsentRecordDocument | null> {
    return this.consentRecordModel.findOne({ userId, purpose }).exec();
  }

  async getConsentRecordsByUser(
    userId: string,
  ): Promise<ConsentRecordDocument[]> {
    return this.consentRecordModel
      .find({ userId })
      .sort({ consentDate: -1 })
      .exec();
  }

  async updateConsentStatus(
    userId: string,
    purpose: ConsentPurpose,
    newStatus: ConsentStatus,
    reason?: string,
  ): Promise<ConsentRecordDocument | null> {
    const record = await this.consentRecordModel
      .findOneAndUpdate(
        { userId, purpose },
        {
          status: newStatus,
          ...(newStatus === ConsentStatus.WITHDRAWN && {
            withdrawalDate: new Date(),
            withdrawalReason: reason,
          }),
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (record) {
      this.logger.debug(
        `Updated consent status to ${newStatus} for user ${userId}, purpose ${purpose}`,
      );
    }
    return record;
  }

  async deleteConsentRecord(recordId: string): Promise<boolean> {
    const result = await this.consentRecordModel
      .deleteOne({ id: recordId })
      .exec();
    return result.deletedCount > 0;
  }

  async getActiveConsentsByUser(
    userId: string,
  ): Promise<ConsentRecordDocument[]> {
    return this.consentRecordModel
      .find({
        userId,
        status: ConsentStatus.GRANTED,
        $or: [
          { expiryDate: { $gt: new Date() } },
          { expiryDate: { $exists: false } },
        ],
      })
      .exec();
  }

  async hasValidConsent(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<boolean> {
    const record = await this.consentRecordModel
      .findOne({
        userId,
        purpose,
        status: ConsentStatus.GRANTED,
        $or: [
          { expiryDate: { $gt: new Date() } },
          { expiryDate: { $exists: false } },
        ],
      })
      .exec();
    return !!record;
  }

  // Consent Version Tracking Methods
  async createConsentVersion(
    versionData: Omit<ConsentVersionRecord, 'id' | 'createdAt'>,
  ): Promise<ConsentVersionRecord> {
    const version: ConsentVersionRecord = {
      ...versionData,
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const purposeVersions =
      this.consentVersionStore.get(versionData.purpose) || [];
    purposeVersions.push(version);
    this.consentVersionStore.set(versionData.purpose, purposeVersions);

    this.logger.debug(
      `Created consent version ${version.version} for purpose ${versionData.purpose}`,
    );
    return version;
  }

  async getConsentVersionsByPurpose(
    purpose: ConsentPurpose,
  ): Promise<ConsentVersionRecord[]> {
    const versions = this.consentVersionStore.get(purpose) || [];
    return versions.sort(
      (a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime(),
    );
  }

  async getActiveConsentVersion(
    purpose: ConsentPurpose,
  ): Promise<ConsentVersionRecord | null> {
    const versions = this.consentVersionStore.get(purpose) || [];
    const now = new Date();
    return versions.find((v) => v.isActive && v.effectiveDate <= now) || null;
  }

  async deactivateConsentVersion(
    versionId: string,
  ): Promise<ConsentVersionRecord | null> {
    for (const [purpose, versions] of this.consentVersionStore.entries()) {
      const version = versions.find((v) => v.id === versionId);
      if (version) {
        version.isActive = false;
        this.consentVersionStore.set(purpose as ConsentPurpose, versions);
        return version;
      }
    }
    return null;
  }

  // Withdrawal Records Methods
  async recordWithdrawal(
    withdrawalData: Omit<WithdrawalRecord, 'id' | 'createdAt'>,
  ): Promise<WithdrawalRecord> {
    const withdrawal: WithdrawalRecord = {
      ...withdrawalData,
      id: `withdrawal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const userWithdrawals =
      this.withdrawalStore.get(withdrawalData.userId) || [];
    userWithdrawals.push(withdrawal);
    this.withdrawalStore.set(withdrawalData.userId, userWithdrawals);

    this.logger.debug(
      `Recorded withdrawal ${withdrawal.id} for user ${withdrawalData.userId}`,
    );
    return withdrawal;
  }

  async getWithdrawalsByUser(userId: string): Promise<WithdrawalRecord[]> {
    const withdrawals = this.withdrawalStore.get(userId) || [];
    return withdrawals.sort(
      (a, b) => b.withdrawalDate.getTime() - a.withdrawalDate.getTime(),
    );
  }

  async getWithdrawalsByPurpose(
    purpose: ConsentPurpose,
  ): Promise<WithdrawalRecord[]> {
    const allWithdrawals: WithdrawalRecord[] = [];
    for (const userWithdrawals of this.withdrawalStore.values()) {
      allWithdrawals.push(
        ...userWithdrawals.filter((w) => w.purpose === purpose),
      );
    }
    return allWithdrawals.sort(
      (a, b) => b.withdrawalDate.getTime() - a.withdrawalDate.getTime(),
    );
  }

  async getWithdrawalStatistics(): Promise<{
    totalWithdrawals: number;
    byPurpose: Record<ConsentPurpose, number>;
    byMonth: Record<string, number>;
  }> {
    const allWithdrawals: WithdrawalRecord[] = [];
    for (const userWithdrawals of this.withdrawalStore.values()) {
      allWithdrawals.push(...userWithdrawals);
    }

    const byPurpose: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    for (const withdrawal of allWithdrawals) {
      byPurpose[withdrawal.purpose] = (byPurpose[withdrawal.purpose] || 0) + 1;
      const monthKey = withdrawal.withdrawalDate.toISOString().slice(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    }

    return {
      totalWithdrawals: allWithdrawals.length,
      byPurpose: byPurpose as Record<ConsentPurpose, number>,
      byMonth,
    };
  }

  // Audit Logs Methods
  async createAuditLog(
    auditData: Omit<ConsentAuditEntry, 'id'>,
  ): Promise<ConsentAuditLogDocument> {
    const auditLog = new this.consentAuditLogModel({
      ...auditData,
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    await auditLog.save();
    this.logger.debug(
      `Created audit log ${auditLog.id} for user ${auditData.userId}`,
    );
    return auditLog;
  }

  async getAuditLogsByUser(
    userId: string,
    limit = 100,
  ): Promise<ConsentAuditLogDocument[]> {
    return this.consentAuditLogModel
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getAuditLogsByPurpose(
    purpose: ConsentPurpose,
    limit = 100,
  ): Promise<ConsentAuditLogDocument[]> {
    return this.consentAuditLogModel
      .find({ purpose })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getAuditLogsByAction(
    action: ConsentAuditEntry['action'],
    limit = 100,
  ): Promise<ConsentAuditLogDocument[]> {
    return this.consentAuditLogModel
      .find({ action })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    limit = 1000,
  ): Promise<ConsentAuditLogDocument[]> {
    return this.consentAuditLogModel
      .find({
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  // Cookie Consent Methods
  async createCookieConsent(
    cookieData: Omit<CookieConsent, 'createdAt' | 'updatedAt'>,
  ): Promise<CookieConsentDocument> {
    const cookieConsent = new this.cookieConsentModel({
      ...cookieData,
    });
    await cookieConsent.save();
    this.logger.debug(
      `Created cookie consent for device ${cookieData.deviceId}`,
    );
    return cookieConsent;
  }

  async getCookieConsentByDevice(
    deviceId: string,
  ): Promise<CookieConsentDocument | null> {
    return this.cookieConsentModel.findOne({ deviceId }).exec();
  }

  async updateCookieConsent(
    deviceId: string,
    updates: Partial<
      Omit<CookieConsent, 'deviceId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<CookieConsentDocument | null> {
    const cookieConsent = await this.cookieConsentModel
      .findOneAndUpdate(
        { deviceId },
        { ...updates, updatedAt: new Date() },
        { new: true },
      )
      .exec();
    if (cookieConsent) {
      this.logger.debug(`Updated cookie consent for device ${deviceId}`);
    }
    return cookieConsent;
  }

  // GDPR Compliance Methods
  async deleteAllUserConsentData(userId: string): Promise<void> {
    // Delete consent records
    await this.consentRecordModel.deleteMany({ userId }).exec();

    // Delete audit logs (keep anonymized version for compliance)
    await this.consentAuditLogModel
      .updateMany(
        { userId },
        {
          $set: {
            userId: 'ANONYMIZED',
            ipAddress: null,
            userAgent: null,
            metadata: { anonymized: true, originalUserId: userId },
          },
        },
      )
      .exec();

    // Delete withdrawal records
    this.withdrawalStore.delete(userId);

    this.logger.log(
      `Deleted all consent data for user ${userId} (GDPR compliance)`,
    );
  }

  async exportUserConsentData(userId: string): Promise<{
    consentRecords: ConsentRecordDocument[];
    auditLogs: ConsentAuditLogDocument[];
    withdrawals: WithdrawalRecord[];
  }> {
    const [consentRecords, auditLogs] = await Promise.all([
      this.consentRecordModel.find({ userId }).exec(),
      this.consentAuditLogModel.find({ userId }).exec(),
    ]);

    const withdrawals = this.withdrawalStore.get(userId) || [];

    return {
      consentRecords,
      auditLogs,
      withdrawals,
    };
  }

  async validateConsentCompliance(userId: string): Promise<{
    isCompliant: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const records = await this.getConsentRecordsByUser(userId);

    // Check for missing legal basis
    for (const record of records) {
      if (!record.legalBasis) {
        issues.push(`Missing legal basis for purpose ${record.purpose}`);
      }
    }

    // Check for missing consent text
    for (const record of records) {
      if (!record.consentText) {
        issues.push(`Missing consent text for purpose ${record.purpose}`);
      }
    }

    // Check for missing consent method
    for (const record of records) {
      if (!record.consentMethod) {
        issues.push(`Missing consent method for purpose ${record.purpose}`);
      }
    }

    // Check for expired consents without renewal
    const now = new Date();
    for (const record of records) {
      if (
        record.expiryDate &&
        record.expiryDate < now &&
        record.status === ConsentStatus.GRANTED
      ) {
        issues.push(
          `Expired consent not renewed for purpose ${record.purpose}`,
        );
      }
    }

    return {
      isCompliant: issues.length === 0,
      issues,
    };
  }

  async cleanupExpiredConsents(): Promise<number> {
    const now = new Date();
    const result = await this.consentRecordModel
      .updateMany(
        {
          expiryDate: { $lt: now },
          status: ConsentStatus.GRANTED,
        },
        {
          status: ConsentStatus.EXPIRED,
          updatedAt: new Date(),
        },
      )
      .exec();

    return result.modifiedCount || 0;
  }
}
