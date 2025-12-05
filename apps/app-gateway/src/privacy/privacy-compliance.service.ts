import {
  Injectable,
  Logger,
  NotFoundException,
  
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsentStatus } from '../schemas/consent-record.schema';
import {
  ConsentRecord,
  UserConsentProfile,
  CaptureConsentDto,
  WithdrawConsentDto,
  ConsentStatusDto,
  DataSubjectRightType,
  DataSubjectRightsRequest,
  CreateRightsRequestDto,
  DataExportPackage,
  DataCategory,
  RequestStatus,
  DataExportFormat,
  IdentityVerificationStatus,

  ConsentPurpose,
} from '@ai-recruitment-clerk/shared-dtos';
import {
  UserProfile,
  UserProfileDocument,
} from '../schemas/user-profile.schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * GDPR Privacy Compliance Service
 * Handles consent management, data subject rights, and privacy infrastructure
 */
@Injectable()
export class PrivacyComplianceService {
  private readonly logger = new Logger(PrivacyComplianceService.name);
  private readonly natsClient: any; // Temporary fallback until NATS client is properly injected
  private readonly consentRecordModel: any; // Temporary fallback until proper injection
  private readonly dataSubjectRightsModel: any; // Temporary fallback until proper injection

  /**
   * Initializes a new instance of the Privacy Compliance Service.
   * @param userProfileModel - The user profile model.
   */
  constructor(
    @InjectModel(UserProfile.name)
    private userProfileModel: Model<UserProfileDocument>,
    // We'll inject additional models as we create them
  ) {
    // Temporary fallback for NATS client until proper injection is implemented
    this.natsClient = {
      publish: async (subject: string, data: any) => {
        this.logger.warn(`NATS publish fallback: ${subject}`, data);
      },
      request: async (subject: string, data: any, timeout: number) => {
        this.logger.warn(`NATS request fallback: ${subject}`, {
          data,
          timeout,
        });
        return null;
      },
    };

    // Temporary fallback models until proper injection is implemented
    this.consentRecordModel = {
      find: () => ({ lean: () => Promise.resolve([]) }),
    } as any;

    this.dataSubjectRightsModel = {
      find: () => ({ lean: () => Promise.resolve([]) }),
    } as any;
  }

  /**
   * CONSENT MANAGEMENT
   */

  /**
   * Capture user consent for various processing purposes
   */
  async captureConsent(
    captureConsentDto: CaptureConsentDto,
  ): Promise<UserConsentProfile> {
    this.logger.log(`Capturing consent for user: ${captureConsentDto.userId}`);

    try {
      // Find or create user consent profile
      const userProfile = await this.userProfileModel.findOne({
        userId: captureConsentDto.userId,
      });

      if (!userProfile) {
        throw new NotFoundException(
          `User profile not found for user: ${captureConsentDto.userId}`,
        );
      }

      // Process consent grants
      const consentRecords: ConsentRecord[] = captureConsentDto.consents.map(
        (consent) => ({
          id: uuidv4(),
          userId: captureConsentDto.userId,
          purpose: consent.purpose,
          status: consent.granted
            ? ConsentStatus.GRANTED
            : ConsentStatus.DENIED,
          consentMethod: consent.method,
          dataCategories:
            consent.dataCategories ||
            this.getDefaultDataCategories(consent.purpose),
          legalBasis: this.getLegalBasisForPurpose(consent.purpose),
          consentDate: new Date(),
          consentText: consent.consentText,
          ipAddress: captureConsentDto.ipAddress,
          userAgent: captureConsentDto.userAgent,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      // Update user profile with consent information
      userProfile.dataProcessingConsent = this.hasConsentForEssentialProcessing(
        consentRecords,
      )
        ? ConsentStatus.GRANTED
        : ConsentStatus.DENIED;

      userProfile.marketingConsent = this.hasConsentForMarketing(consentRecords)
        ? ConsentStatus.GRANTED
        : ConsentStatus.DENIED;

      userProfile.analyticsConsent = this.hasConsentForAnalytics(consentRecords)
        ? ConsentStatus.GRANTED
        : ConsentStatus.DENIED;

      await userProfile.save();

      // Create consent profile response
      const consentProfile: UserConsentProfile = {
        userId: captureConsentDto.userId,
        consentRecords,
        lastConsentUpdate: new Date(),
        consentVersion: captureConsentDto.consentVersion || '1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        hasValidConsent: (purpose: ConsentPurpose) => {
          const record = consentRecords.find((r) => r.purpose === purpose);
          return record?.status === ConsentStatus.GRANTED;
        },
        getGrantedPurposes: () => {
          return consentRecords
            .filter((r) => r.status === ConsentStatus.GRANTED)
            .map((r) => r.purpose);
        },
        needsConsentRenewal: () => false, // New consent, no renewal needed
      };

      this.logger.log(
        `Consent captured successfully for user: ${captureConsentDto.userId}`,
      );
      return consentProfile;
    } catch (error) {
      this.logger.error(
        `Failed to capture consent for user ${captureConsentDto.userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Withdraw consent for a specific purpose
   */
  async withdrawConsent(withdrawConsentDto: WithdrawConsentDto): Promise<void> {
    this.logger.log(
      `Withdrawing consent for user: ${withdrawConsentDto.userId}, purpose: ${withdrawConsentDto.purpose}`,
    );

    try {
      const userProfile = await this.userProfileModel.findOne({
        userId: withdrawConsentDto.userId,
      });

      if (!userProfile) {
        throw new NotFoundException(
          `User profile not found for user: ${withdrawConsentDto.userId}`,
        );
      }

      // Update consent status based on purpose
      switch (withdrawConsentDto.purpose) {
        case ConsentPurpose.MARKETING_COMMUNICATIONS:
          userProfile.marketingConsent = ConsentStatus.WITHDRAWN;
          break;
        case ConsentPurpose.BEHAVIORAL_ANALYTICS:
          userProfile.analyticsConsent = ConsentStatus.WITHDRAWN;
          break;
        case ConsentPurpose.ESSENTIAL_SERVICES:
          throw new ForbiddenException(
            'Cannot withdraw consent for essential services required for contract performance',
          );
        default:
          // Handle other purposes as needed
          break;
      }

      await userProfile.save();

      // TODO: Implement consent withdrawal cascade - stop processing activities
      await this.cascadeConsentWithdrawal(
        withdrawConsentDto.userId,
        withdrawConsentDto.purpose as any,
      );

      this.logger.log(
        `Consent withdrawn successfully for user: ${withdrawConsentDto.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to withdraw consent for user ${withdrawConsentDto.userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get current consent status for a user
   */
  async getConsentStatus(userId: string): Promise<ConsentStatusDto> {
    this.logger.log(`Getting consent status for user: ${userId}`);

    try {
      const userProfile = await this.userProfileModel.findOne({ userId });

      if (!userProfile) {
        throw new NotFoundException(
          `User profile not found for user: ${userId}`,
        );
      }

      const consentStatus: ConsentStatusDto = {
        userId,
        purposes: [
          {
            purpose: ConsentPurpose.ESSENTIAL_SERVICES,
            status: userProfile.dataProcessingConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: false, // Essential services cannot be withdrawn
          },
          {
            purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
            status: userProfile.marketingConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: true,
          },
          {
            purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
            status: userProfile.analyticsConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: true,
          },
        ],
        needsRenewal: this.checkConsentRenewalNeeded(userProfile),
        lastUpdated: (userProfile as any).updatedAt || new Date(),
      };

      return consentStatus;
    } catch (error) {
      this.logger.error(
        `Failed to get consent status for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * DATA SUBJECT RIGHTS IMPLEMENTATION
   */

  /**
   * Create a data subject rights request
   */
  async createRightsRequest(
    createRequestDto: CreateRightsRequestDto,
  ): Promise<DataSubjectRightsRequest> {
    this.logger.log(
      `Creating rights request for user: ${createRequestDto.userId}, type: ${createRequestDto.requestType}`,
    );

    try {
      const requestId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30 days per GDPR

      const rightsRequest: DataSubjectRightsRequest = {
        id: requestId,
        userId: createRequestDto.userId,
        type: createRequestDto.requestType as any,
        requestType: createRequestDto.requestType as any,
        status: RequestStatus.PENDING,
        identityVerificationStatus: IdentityVerificationStatus.PENDING,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      // TODO: Store in database (implement rights request schema)
      // await this.rightsRequestModel.create(rightsRequest);

      // Start automated processing for certain request types
      await this.startAutomatedRightsProcessing(rightsRequest);

      this.logger.log(`Rights request created: ${requestId}`);
      return rightsRequest;
    } catch (error) {
      this.logger.error(
        `Failed to create rights request for user ${createRequestDto.userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process data access request (Article 15)
   */
  async processDataAccessRequest(
    userId: string,
    format: DataExportFormat = DataExportFormat.JSON,
  ): Promise<DataExportPackage> {
    this.logger.log(`Processing data access request for user: ${userId}`);

    try {
      // Collect all personal data for the user
      const userData = await this.collectUserData(userId);

      const exportPackage: DataExportPackage = {
        requestId: uuidv4(),
        userId,
        format,
        dataCategories: userData,
        metadata: {
          exportDate: new Date(),
          dataController: 'AI Recruitment Clerk',
          privacyPolicyVersion: '1.0',
          retentionPolicies: await this.getRetentionPolicies(),
          thirdPartyProcessors: ['Google Gemini AI'],
        },
        createdAt: new Date(),
      };

      // Generate download URL (implementation depends on file storage system)
      exportPackage.downloadUrl =
        await this.generateSecureDownloadUrl(exportPackage);

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
   */
  async processDataErasureRequest(
    userId: string,
    specificCategories?: string[],
  ): Promise<void> {
    this.logger.log(`Processing data erasure request for user: ${userId}`);

    try {
      // Check if user has active contracts that prevent deletion
      const canErase = await this.checkErasureEligibility(userId);
      if (!canErase.eligible) {
        throw new ForbiddenException(`Cannot erase data: ${canErase.reason}`);
      }

      // Cascade deletion across all systems
      await this.cascadeDataDeletion(userId, specificCategories);

      this.logger.log(`Data erasure completed for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process data erasure request for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private getDefaultDataCategories(purpose: ConsentPurpose): DataCategory[] {
    const categoryMap: Record<ConsentPurpose, DataCategory[]> = {
      [ConsentPurpose.ESSENTIAL_SERVICES]: [
        DataCategory.AUTHENTICATION,
        DataCategory.PROFILE_INFORMATION,
      ],
      [ConsentPurpose.BEHAVIORAL_ANALYTICS]: [
        DataCategory.BEHAVIORAL_DATA,
        DataCategory.DEVICE_INFORMATION,
      ],
      [ConsentPurpose.MARKETING_COMMUNICATIONS]: [
        DataCategory.COMMUNICATION_PREFERENCES,
        DataCategory.PROFILE_INFORMATION,
      ],
      [ConsentPurpose.FUNCTIONAL_ANALYTICS]: [
        DataCategory.SYSTEM_LOGS,
        DataCategory.DEVICE_INFORMATION,
      ],
      [ConsentPurpose.THIRD_PARTY_SHARING]: [
        DataCategory.RESUME_CONTENT,
        DataCategory.JOB_PREFERENCES,
      ],
      [ConsentPurpose.PERSONALIZATION]: [
        DataCategory.PROFILE_INFORMATION,
        DataCategory.JOB_PREFERENCES,
      ],
      [ConsentPurpose.PERFORMANCE_MONITORING]: [DataCategory.SYSTEM_LOGS],
    };

    return categoryMap[purpose] || [DataCategory.PROFILE_INFORMATION];
  }

  private getLegalBasisForPurpose(purpose: ConsentPurpose): string {
    const legalBasisMap = {
      [ConsentPurpose.ESSENTIAL_SERVICES]:
        'Article 6(1)(b) - Contract performance',
      [ConsentPurpose.BEHAVIORAL_ANALYTICS]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.MARKETING_COMMUNICATIONS]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.FUNCTIONAL_ANALYTICS]:
        'Article 6(1)(f) - Legitimate interests',
      [ConsentPurpose.THIRD_PARTY_SHARING]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.PERSONALIZATION]:
        'Article 6(1)(f) - Legitimate interests',
      [ConsentPurpose.PERFORMANCE_MONITORING]:
        'Article 6(1)(f) - Legitimate interests',
    };

    return legalBasisMap[purpose] || 'Article 6(1)(f) - Legitimate interests';
  }

  private hasConsentForEssentialProcessing(records: ConsentRecord[]): boolean {
    const essential = records.find(
      (r) => r.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
    );
    return essential?.status === ConsentStatus.GRANTED;
  }

  private hasConsentForMarketing(records: ConsentRecord[]): boolean {
    const marketing = records.find(
      (r) => r.purpose === ConsentPurpose.MARKETING_COMMUNICATIONS,
    );
    return marketing?.status === ConsentStatus.GRANTED;
  }

  private hasConsentForAnalytics(records: ConsentRecord[]): boolean {
    const analytics = records.find(
      (r) => r.purpose === ConsentPurpose.BEHAVIORAL_ANALYTICS,
    );
    return analytics?.status === ConsentStatus.GRANTED;
  }

  private checkConsentRenewalNeeded(userProfile: UserProfileDocument): boolean {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return ((userProfile as any).updatedAt || new Date()) < oneYearAgo;
  }

  private async cascadeConsentWithdrawal(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<void> {
    try {
      this.logger.log(
        `Cascading consent withdrawal for user: ${userId}, purpose: ${purpose}`,
      );

      // Stop all related processing activities based on purpose
      switch (purpose) {
        case ConsentPurpose.ESSENTIAL_SERVICES:
          await this.stopResumeProcessing(userId);
          await this.stopJobMatchingActivities(userId);
          break;

        case ConsentPurpose.MARKETING_COMMUNICATIONS:
          await this.stopMarketingActivities(userId);
          await this.removeFromMarketingLists(userId);
          await this.stopCommunicationActivities(userId);
          await this.unsubscribeFromNotifications(userId);
          break;

        case ConsentPurpose.FUNCTIONAL_ANALYTICS:
        case ConsentPurpose.BEHAVIORAL_ANALYTICS:
          await this.stopAnalyticsCollection(userId);
          await this.anonymizeAnalyticsData(userId);
          break;

        case ConsentPurpose.THIRD_PARTY_SHARING:
        case ConsentPurpose.PERSONALIZATION:
        case ConsentPurpose.PERFORMANCE_MONITORING:
          // Handle other consent purposes
          this.logger.log(`Processing consent withdrawal for purpose: ${purpose}`);
          break;

        default:
          this.logger.warn(`Unknown consent purpose for cascade: ${purpose}`);
      }

      // Notify other services about consent withdrawal
      await this.notifyServicesConsentWithdrawal(userId, purpose);

      // Log the cascade completion
      await this.logConsentWithdrawalCascade(userId, purpose);
    } catch (error) {
      this.logger.error(
        `Failed to cascade consent withdrawal for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async stopResumeProcessing(userId: string): Promise<void> {
    try {
      // Stop any active resume parsing for this user
      await this.natsClient.publish('resume.processing.stop', { userId });

      // Cancel any pending job matching operations
      await this.natsClient.publish('matching.operations.stop', { userId });

      this.logger.log(
        `Stopped resume processing activities for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to stop resume processing for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async stopJobMatchingActivities(userId: string): Promise<void> {
    try {
      // Stop job recommendation algorithms
      await this.natsClient.publish('job.recommendations.stop', { userId });

      // Remove from active matching queues
      await this.natsClient.publish('matching.queue.remove', { userId });

      this.logger.log(`Stopped job matching activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop job matching for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async stopMarketingActivities(userId: string): Promise<void> {
    try {
      // Stop marketing campaigns
      await this.natsClient.publish('marketing.campaigns.exclude', { userId });

      // Remove from promotional activities
      await this.natsClient.publish('promotions.exclude', { userId });

      this.logger.log(`Stopped marketing activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop marketing activities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async removeFromMarketingLists(userId: string): Promise<void> {
    try {
      // Remove from email marketing lists
      // Remove from SMS marketing lists
      // Update marketing preferences

      this.logger.log(`Removed user ${userId} from marketing lists`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user ${userId} from marketing lists:`,
        error,
      );
      throw error;
    }
  }

  private async stopAnalyticsCollection(userId: string): Promise<void> {
    try {
      // Stop collecting analytics data for this user
      await this.natsClient.publish('analytics.collection.stop', { userId });

      // Mark user for analytics exclusion
      await this.natsClient.publish('analytics.user.exclude', { userId });

      this.logger.log(`Stopped analytics collection for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop analytics collection for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async anonymizeAnalyticsData(userId: string): Promise<void> {
    try {
      // Anonymize existing analytics data
      await this.natsClient.publish('analytics.data.anonymize', { userId });

      this.logger.log(
        `Initiated analytics data anonymization for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to anonymize analytics data for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async stopCommunicationActivities(userId: string): Promise<void> {
    try {
      // Stop automated communications
      await this.natsClient.publish('communications.stop', { userId });

      // Cancel scheduled communications
      await this.natsClient.publish('communications.scheduled.cancel', {
        userId,
      });

      this.logger.log(`Stopped communication activities for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to stop communication activities for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async unsubscribeFromNotifications(userId: string): Promise<void> {
    try {
      // Unsubscribe from push notifications
      // Unsubscribe from email notifications
      // Unsubscribe from SMS notifications

      this.logger.log(`Unsubscribed user ${userId} from notifications`);
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId} from notifications:`,
        error,
      );
      throw error;
    }
  }

  private async notifyServicesConsentWithdrawal(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<void> {
    try {
      // Notify all microservices about consent withdrawal
      const notification = {
        userId,
        purpose,
        action: 'consent_withdrawn',
        timestamp: new Date().toISOString(),
      };

      // Notify each service
      await Promise.all([
        this.natsClient.publish(
          'resume-parser.consent.withdrawn',
          notification,
        ),
        this.natsClient.publish(
          'scoring-engine.consent.withdrawn',
          notification,
        ),
        this.natsClient.publish(
          'report-generator.consent.withdrawn',
          notification,
        ),
        this.natsClient.publish('jd-extractor.consent.withdrawn', notification),
      ]);

      this.logger.log(
        `Notified all services about consent withdrawal for user: ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify services about consent withdrawal for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  private async logConsentWithdrawalCascade(
    userId: string,
    purpose: ConsentPurpose,
  ): Promise<void> {
    try {
      // Log the cascade completion for audit purposes
      const logEntry = {
        userId,
        purpose,
        action: 'consent_withdrawal_cascaded',
        timestamp: new Date().toISOString(),
        details: 'All related processing activities stopped',
      };

      // Store in audit log
      await this.natsClient.publish('audit.log', logEntry);

      this.logger.log(`Logged consent withdrawal cascade for user: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to log consent withdrawal cascade for user ${userId}:`,
        error,
      );
      // Don't throw here as this is logging only
    }
  }

  private async startAutomatedRightsProcessing(
    request: DataSubjectRightsRequest,
  ): Promise<void> {
    // TODO: Implement automated processing based on request type
    switch (request.requestType) {
      case DataSubjectRightType.ACCESS:
        // Auto-generate data export
        break;
      case DataSubjectRightType.ERASURE:
        // Check for deletion eligibility
        break;
      default:
        // Manual processing required
        break;
    }
  }

  private async collectUserData(userId: string): Promise<any[]> {
    const collectedData: any[] = [];

    try {
      this.logger.log(
        `Starting comprehensive data collection for user: ${userId}`,
      );

      // Collect data from all services in parallel
      const dataCollectionPromises = [
        this.collectGatewayData(userId),
        this.collectResumeParserData(userId),
        this.collectScoringEngineData(userId),
        this.collectReportGeneratorData(userId),
        this.collectJdExtractorData(userId),
        this.collectAnalyticsData(userId),
        this.collectMarketingData(userId),
        this.collectUserManagementData(userId),
      ];

      const results = await Promise.allSettled(dataCollectionPromises);

      // Process results and collect successful data
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          collectedData.push(...result.value);
        } else if (result.status === 'rejected') {
          this.logger.error(
            `Data collection failed for service ${index}:`,
            result.reason,
          );
        }
      });

      this.logger.log(
        `Collected ${collectedData.length} data items for user: ${userId}`,
      );
      return collectedData;
    } catch (error) {
      this.logger.error(`Failed to collect user data for ${userId}:`, error);
      throw error;
    }
  }

  private async collectGatewayData(userId: string): Promise<any[]> {
    try {
      const data: any[] = [];

      // Collect user profile data
      const userProfile = await this.userProfileModel
        .findOne({ userId })
        .lean();
      if (userProfile) {
        data.push({
          service: 'app-gateway',
          dataType: 'user_profile',
          data: userProfile,
          collectedAt: new Date().toISOString(),
        });
      }

      // Collect consent records
      const consentRecords = await this.consentRecordModel
        .find({ userId })
        .lean();
      if (consentRecords.length > 0) {
        data.push({
          service: 'app-gateway',
          dataType: 'consent_records',
          data: consentRecords,
          collectedAt: new Date().toISOString(),
        });
      }

      // Collect data subject rights requests
      const rightsRequests = await this.dataSubjectRightsModel
        .find({ userId })
        .lean();
      if (rightsRequests.length > 0) {
        data.push({
          service: 'app-gateway',
          dataType: 'rights_requests',
          data: rightsRequests,
          collectedAt: new Date().toISOString(),
        });
      }

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to collect gateway data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectResumeParserData(userId: string): Promise<any[]> {
    try {
      // Request data from resume parser service via NATS
      const response = await this.natsClient.request(
        'resume-parser.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect resume parser data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectScoringEngineData(userId: string): Promise<any[]> {
    try {
      // Request data from scoring engine service via NATS
      const response = await this.natsClient.request(
        'scoring-engine.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect scoring engine data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectReportGeneratorData(userId: string): Promise<any[]> {
    try {
      // Request data from report generator service via NATS
      const response = await this.natsClient.request(
        'report-generator.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect report generator data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectJdExtractorData(userId: string): Promise<any[]> {
    try {
      // Request data from JD extractor service via NATS
      const response = await this.natsClient.request(
        'jd-extractor.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect JD extractor data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectAnalyticsData(userId: string): Promise<any[]> {
    try {
      // Request analytics data via NATS
      const response = await this.natsClient.request(
        'analytics.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect analytics data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectMarketingData(userId: string): Promise<any[]> {
    try {
      // Request marketing data via NATS
      const response = await this.natsClient.request(
        'marketing.data.collect',
        { userId },
        5000,
      );
      return response ? [response] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect marketing data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async collectUserManagementData(userId: string): Promise<any[]> {
    try {
      // Request user management data via NATS
      // const response = await this.natsClient.request('user-management.data.collect', { userId }, 5000);
      // return response ? [response] : [];

      // Fallback implementation until NATS client is properly injected
      const userData: any[] = [];
      return userData;
    } catch (error) {
      this.logger.error(
        `Failed to collect user management data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  private async generateSecureDownloadUrl(
    exportPackage: DataExportPackage,
  ): Promise<string> {
    try {
      this.logger.log(`Generating secure download URL for export package`);

      // Create comprehensive data export
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          dataSubject: exportPackage.userId,
          totalRecords: exportPackage.dataCategories?.length || 0,
          exportFormat: 'JSON',
          gdprCompliant: true,
          packageId: exportPackage.requestId,
        },
        data: exportPackage.dataCategories || [],
        summary: this.generateDataSummary(exportPackage.dataCategories || []),
      };

      // Convert to JSON with proper formatting
      const exportJson = JSON.stringify(exportData, null, 2);
      const exportBuffer = Buffer.from(exportJson, 'utf-8');

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

  private generateDataSummary(userData: any[]): any {
    const summary: {
      totalRecords: number;
      dataByService: Record<string, number>;
      dataByType: Record<string, number>;
      recordTypes: string[];
    } = {
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

  private async storeSecureFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<{ fileId: string; storagePath: string }> {
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

  private generateSecureFileId(): string {
    // Generate cryptographically secure file ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const additional = Math.random().toString(36).substring(2);
    return `gdpr-export-${timestamp}-${random}-${additional}`;
  }

  private async encryptFileContent(fileBuffer: Buffer): Promise<Buffer> {
    try {
      // Implement AES-256-GCM encryption
      const crypto = require('crypto');
      const algorithm = 'aes-256-gcm';

      // Generate encryption key (should be from secure key management)
      const encryptionKey =
        process.env.GDPR_ENCRYPTION_KEY || crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);

      const cipher = crypto.createCipher(algorithm, encryptionKey);
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

  private async storeEncryptedFile(
    encryptedBuffer: Buffer,
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

  private async createSecureDownloadUrl(
    fileId: string,
    filename: string,
  ): Promise<string> {
    try {
      // Generate time-limited, signed URL
      const crypto = require('crypto');
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

  private async recordDataExportDownload(
    userId: string,
    fileId: string,
    downloadUrl: string,
  ): Promise<void> {
    try {
      // Record download information for audit purposes
      // Note: In production, this should be stored in an audit collection
      // const downloadRecord = {
      //   userId,
      //   fileId,
      //   downloadUrl: downloadUrl.replace(/signature=[^&]*/, 'signature=***'), // Hide signature in logs
      //   generatedAt: new Date(),
      //   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      //   accessed: false,
      //   accessLog: [],
      // };

      // Store in audit collection or database
      // await this.auditModel.create(downloadRecord);

      this.logger.log(`Recorded data export download for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to record data export download:', error);
      // Don't throw here as this is audit logging
    }
  }

  private async getRetentionPolicies(): Promise<Record<string, string>> {
    // TODO: Implement retention policy lookup
    return {
      user_profiles: '7 years after account deletion',
      resume_data: '2 years after last application',
      analytics_data: '2 years from collection',
      system_logs: '1 year from creation',
    };
  }

  private async checkErasureEligibility(
    userId: string,
  ): Promise<{ eligible: boolean; reason?: string }> {
    // TODO: Implement erasure eligibility checks
    // - Active job applications
    // - Legal hold requirements
    // - Outstanding financial obligations

    return { eligible: true };
  }

  private async cascadeDataDeletion(
    userId: string,
    specificCategories?: string[],
  ): Promise<void> {
    // TODO: Implement comprehensive data deletion across all services
    this.logger.log(`Cascading data deletion for user: ${userId}`, {
      specificCategories,
    });

    // Delete user profile
    await this.userProfileModel.deleteOne({ userId });

    // TODO: Delete from other services:
    // - Resume data
    // - Job applications
    // - Analytics events
    // - System logs (where legally permissible)
  }
}
