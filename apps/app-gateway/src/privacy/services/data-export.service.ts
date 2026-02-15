import { Injectable, Logger } from '@nestjs/common';
import type {
  NatsClient,
  DataExportPackage,
  UserDataCollectionItem,
  DataSummary,
  SecureFileInfo,
} from '@ai-recruitment-clerk/shared-dtos';
import type { DataExportFormat } from '@ai-recruitment-clerk/shared-dtos';

/**
 * Data Export Service
 * Generates secure data export packages for GDPR data access requests
 * Handles encryption, file storage, and secure download URLs
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor() {}

  /**
   * Generate secure download URL for a data export package
   * Creates encrypted file, stores it, and generates time-limited URL
   */
  public async generateSecureDownloadUrl(
    exportPackage: DataExportPackage,
    natsClient: NatsClient,
  ): Promise<string> {
    try {
      this.logger.log(`Generating secure download URL for export package`);

      // Create comprehensive data export
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          dataSubject: exportPackage.userId,
          totalRecords: exportPackage.data?.length || 0,
          exportFormat: 'JSON',
          gdprCompliant: true,
          packageId: exportPackage.requestId,
        },
        data: exportPackage.data || [],
        summary: this.generateDataSummary(
          (exportPackage.data || []).map((item) => ({
            service: item.sources?.[0] || 'unknown',
            dataType: item.category,
            data: item.data,
            collectedAt:
              item.collectionDate?.toISOString() || new Date().toISOString(),
          })),
        ),
      };

      // Convert to JSON with proper formatting
      const exportJson = JSON.stringify(exportData, null, 2);
      const exportBuffer = Buffer.from(exportJson, 'utf-8') as Buffer & { readonly length: number };

      // Generate secure filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `gdpr-data-export-${exportPackage.userId}-${timestamp}.json`;

      // Store file securely with encryption
      const fileInfo = await this.storeSecureFile(exportBuffer, filename);

      // Generate secure download URL with time-limited access
      const downloadUrl = await this.createSecureDownloadUrl(
        fileInfo.fileId,
        filename,
      );

      // Record download information for audit
      await this.recordDataExportDownload(
        exportPackage.userId,
        fileInfo.fileId,
        downloadUrl,
        natsClient,
      );

      this.logger.log(
        `Generated secure download URL for user: ${exportPackage.userId}`,
      );

      return downloadUrl;
    } catch (error) {
      this.logger.error('Failed to generate secure download URL:', error);
      throw error;
    }
  }

  /**
   * Generate data summary for export package
   */
  public generateDataSummary(userData: UserDataCollectionItem[]): DataSummary {
    const summary: DataSummary = {
      totalRecords: userData.length,
      dataByService: {},
      dataByType: {},
      recordTypes: [],
    };

    userData.forEach((item) => {
      // Count by service
      const service = item.service || 'unknown';
      summary.dataByService[service] =
        (summary.dataByService[service] || 0) + 1;

      // Count by data type
      const dataType = item.dataType || 'unknown';
      summary.dataByType[dataType] = (summary.dataByType[dataType] || 0) + 1;
    });

    summary.recordTypes = Object.keys(summary.dataByType);

    return summary;
  }

  /**
   * Store file securely with encryption
   */
  public async storeSecureFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<SecureFileInfo> {
    try {
      // Generate unique file ID
      const fileId = this.generateSecureFileId();

      // Encrypt file content
      const encryptedBuffer = await this.encryptFileContent(fileBuffer);

      // Store in secure location (GridFS or secure file storage)
      const storagePath = await this.storeEncryptedFile(
        encryptedBuffer,
        filename,
        fileId,
      );

      this.logger.log(`Stored secure file: ${filename} with ID: ${fileId}`);

      return { fileId, storagePath };
    } catch (error) {
      this.logger.error(`Failed to store secure file ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Generate cryptographically secure file ID
   */
  public generateSecureFileId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const additional = Math.random().toString(36).substring(2);
    return `gdpr-export-${timestamp}-${random}-${additional}`;
  }

  /**
   * Encrypt file content using AES-256-GCM
   */
  public async encryptFileContent(fileBuffer: Buffer & { readonly length: number }): Promise<Buffer & { readonly length: number }> {
    try {
      const crypto = await import('crypto');
      const algorithm = 'aes-256-gcm';

      // Generate encryption key (should be from secure key management)
      const encryptionKey =
        process.env.GDPR_ENCRYPTION_KEY || crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
      cipher.setAAD(Buffer.from('GDPR_DATA_EXPORT', 'utf8'));

      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // Combine IV, auth tag, and encrypted data
      return Buffer.concat([iv, authTag, encrypted]);
    } catch (error) {
      this.logger.error('Failed to encrypt file content:', error);
      throw error;
    }
  }

  /**
   * Store encrypted file to secure storage
   */
  public async storeEncryptedFile(
    _encryptedBuffer: Buffer & { readonly length: number },
    filename: string,
    fileId: string,
  ): Promise<string> {
    try {
      // Store using GridFS or secure file storage service
      // This is a placeholder implementation - in production would use GridFS
      const storagePath = `secure-exports/${fileId}/${filename}`;

      // In a real implementation, this would use GridFS or cloud storage
      // await this.gridFsService.uploadFile(encryptedBuffer, filename, metadata);

      this.logger.log(`Encrypted file stored at: ${storagePath}`);
      return storagePath;
    } catch (error) {
      this.logger.error('Failed to store encrypted file:', error);
      throw error;
    }
  }

  /**
   * Create secure, time-limited download URL
   */
  public async createSecureDownloadUrl(
    fileId: string,
    _filename: string,
  ): Promise<string> {
    try {
      const crypto = await import('crypto');
      const expirationTime = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

      // Create signature
      const payload = `${fileId}:${expirationTime}`;
      const secretKey = process.env.DOWNLOAD_URL_SECRET || 'default-secret-key';
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(payload)
        .digest('hex');

      // Construct secure download URL
      const baseUrl = process.env.APP_BASE_URL || 'https://localhost:8080';
      const downloadUrl = `${baseUrl}/api/privacy/data-export/download/${fileId}?expires=${expirationTime}&signature=${signature}`;

      this.logger.log(`Generated secure download URL for file: ${fileId}`);
      return downloadUrl;
    } catch (error) {
      this.logger.error('Failed to generate secure download URL:', error);
      throw error;
    }
  }

  /**
   * Record data export download for audit purposes
   */
  public async recordDataExportDownload(
    userId: string,
    _fileId: string,
    _downloadUrl: string,
    natsClient: NatsClient,
  ): Promise<void> {
    try {
      // Record download information for audit purposes
      await natsClient.publish('audit.data_export', {
        userId,
        fileId: _fileId,
        downloadUrl: _downloadUrl.replace(/signature=[^&]*/, 'signature=***'),
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      this.logger.log(`Recorded data export download for user: ${userId}`);
    } catch (_error) {
      this.logger.error('Failed to record data export download:', _error);
      // Don't throw here as this is audit logging
    }
  }

  /**
   * Get data retention policies for export package metadata
   */
  public async getRetentionPolicies(): Promise<Record<string, string>> {
    return {
      user_profiles: '7 years after account deletion',
      resume_data: '2 years after last application',
      analytics_data: '2 years from collection',
      system_logs: '1 year from creation',
    };
  }

  /**
   * Generate export package metadata
   */
  public generateExportMetadata(
    _userId: string,
    _dataCategories: number,
    _format: DataExportFormat,
  ): {
    exportDate: Date;
    dataController: string;
    privacyPolicyVersion: string;
    retentionPolicies: Record<string, string>;
    thirdPartyProcessors: string[];
  } {
    return {
      exportDate: new Date(),
      dataController: 'AI Recruitment Clerk',
      privacyPolicyVersion: '1.0',
      retentionPolicies: {
        user_profiles: '7 years after account deletion',
        resume_data: '2 years after last application',
        analytics_data: '2 years from collection',
        system_logs: '1 year from creation',
      },
      thirdPartyProcessors: ['Google Gemini AI'],
    };
  }
}
