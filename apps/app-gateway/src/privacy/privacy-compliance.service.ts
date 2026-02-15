import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import type {
  NatsClient,
  UserConsentProfile,
  CaptureConsentDto,
  WithdrawConsentDto,
  ConsentStatusDto,
  DataCategoryExport,
} from '@ai-recruitment-clerk/shared-dtos';
import {
  DataExportFormat,
} from '@ai-recruitment-clerk/shared-dtos';
import type {
  DataSubjectRightsRequest,
  CreateRightsRequestDto,
  DataExportPackage,
} from '@ai-recruitment-clerk/shared-dtos';
import type { ConsentManagementService } from './services/consent-management.service';
import type { ConsentCascadeService } from './services/consent-cascade.service';
import type { DataSubjectRightsService } from './services/data-subject-rights.service';
import type { DataCollectionService } from './services/data-collection.service';
import type { DataExportService } from './services/data-export.service';
import type { DataErasureService } from './services/data-erasure.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * GDPR Privacy Compliance Service (Facade)
 *
 * This is a unified API facade that delegates to specialized services.
 * Maintains backward compatibility with the existing controller while
 * providing a cleaner separation of concerns.
 *
 * Service responsibilities:
 * - ConsentManagementService: Core consent operations
 * - ConsentCascadeService: Consent withdrawal propagation
 * - DataSubjectRightsService: GDPR rights requests
 * - DataCollectionService: Data gathering from all services
 * - DataExportService: Secure export generation
 * - DataErasureService: Data deletion operations
 */
@Injectable()
export class PrivacyComplianceService {
  private readonly logger = new Logger(PrivacyComplianceService.name);
  private readonly natsClient: NatsClient;

  constructor(
    private readonly consentManagementService: ConsentManagementService,
    private readonly consentCascadeService: ConsentCascadeService,
    private readonly dataSubjectRightsService: DataSubjectRightsService,
    private readonly dataCollectionService: DataCollectionService,
    private readonly dataExportService: DataExportService,
    private readonly dataErasureService: DataErasureService,
  ) {
    // Temporary fallback for NATS client until proper injection is implemented
    this.natsClient = {
      publish: async (subject: string, data: unknown) => {
        this.logger.warn(`NATS publish fallback: ${subject}`, data);
      },
      request: async (subject: string, data: unknown, timeout: number) => {
        this.logger.warn(`NATS request fallback: ${subject}`, {
          data,
          timeout,
        });
        return null;
      },
    };
  }

  // ==================== CONSENT MANAGEMENT ====================

  /**
   * Capture user consent for various processing purposes
   * Delegates to ConsentManagementService
   */
  public async captureConsent(
    captureConsentDto: CaptureConsentDto,
  ): Promise<UserConsentProfile> {
    return this.consentManagementService.captureConsent(
      captureConsentDto,
      this.natsClient,
    );
  }

  /**
   * Withdraw consent for a specific purpose
   * Delegates to ConsentManagementService and ConsentCascadeService
   */
  public async withdrawConsent(
    withdrawConsentDto: WithdrawConsentDto,
  ): Promise<void> {
    // First update consent status
    await this.consentManagementService.withdrawConsent(withdrawConsentDto);

    // Then cascade the withdrawal to all services
    await this.consentCascadeService.cascadeConsentWithdrawal(
      withdrawConsentDto.userId,
      withdrawConsentDto.purpose,
      this.natsClient,
    );

    this.logger.log(
      `Consent withdrawn successfully for user: ${withdrawConsentDto.userId}`,
    );
  }

  /**
   * Get current consent status for a user
   * Delegates to ConsentManagementService
   */
  public async getConsentStatus(userId: string): Promise<ConsentStatusDto> {
    return this.consentManagementService.getConsentStatus(userId);
  }

  // ==================== DATA SUBJECT RIGHTS ====================

  /**
   * Create a data subject rights request
   * Delegates to DataSubjectRightsService
   */
  public async createRightsRequest(
    createRequestDto: CreateRightsRequestDto,
  ): Promise<DataSubjectRightsRequest> {
    return this.dataSubjectRightsService.createRightsRequest(
      createRequestDto,
      this.natsClient,
    );
  }

  /**
   * Process data access request (Article 15)
   * Coordinates data collection and export generation
   */
  public async processDataAccessRequest(
    userId: string,
    format: DataExportFormat = DataExportFormat.JSON,
  ): Promise<DataExportPackage> {
    this.logger.log(`Processing data access request for user: ${userId}`);

    try {
      // Collect all personal data for the user
      const userData = await this.dataCollectionService.collectUserData(
        userId,
        this.natsClient,
      );

      // Convert UserDataCollectionItem[] to DataCategoryExport[]
      const dataCategories: DataCategoryExport[] = userData.map((item) => ({
        category: item.dataType,
        description: `${item.service} - ${item.dataType}`,
        data: item.data,
        sources: [item.service],
        legalBasis: 'Consent',
        retentionPeriod: 'As per data retention policy',
        collectionDate: new Date(item.collectedAt),
      }));

      const requestId = uuidv4();
      const exportPackage: DataExportPackage = {
        id: requestId,
        requestId,
        userId,
        format,
        dataCategories,
        data: dataCategories,
        metadata: {
          exportDate: new Date(),
          dataController: 'AI Recruitment Clerk',
          privacyPolicyVersion: '1.0',
          retentionPolicies: await this.dataExportService.getRetentionPolicies(),
          thirdPartyProcessors: ['Google Gemini AI'],
        },
        createdAt: new Date(),
      } as DataExportPackage;

      // Generate download URL
      exportPackage.downloadUrl =
        await this.dataExportService.generateSecureDownloadUrl(
          exportPackage,
          this.natsClient,
        );

      this.logger.log(`Data access request processed for user: ${userId}`);
      return exportPackage;
    } catch (error) {
      this.logger.error(
        `Failed to process data access request for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process data erasure request (Article 17 - Right to be forgotten)
   * Delegates to DataErasureService
   */
  public async processDataErasureRequest(
    userId: string,
    specificCategories?: string[],
  ): Promise<void> {
    this.logger.log(`Processing data erasure request for user: ${userId}`);

    try {
      // Check if user has active contracts that prevent deletion
      const canErase = await this.dataErasureService.checkErasureEligibility(
        userId,
        this.natsClient,
      );
      if (!canErase.eligible) {
        throw new ForbiddenException(`Cannot erase data: ${canErase.reason}`);
      }

      // Cascade deletion across all systems
      await this.dataErasureService.cascadeDataDeletion(
        userId,
        specificCategories,
        this.natsClient,
      );

      this.logger.log(`Data erasure completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process data erasure request for user ${userId}:`,
        error,
      );
      throw error;
    }
  }
}
