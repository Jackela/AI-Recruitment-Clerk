import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type {
  NatsClient,
  UserConsentProfile,
  CaptureConsentDto,
  WithdrawConsentDto,
  ConsentStatusDto,

  ConsentMethod} from '@ai-recruitment-clerk/shared-dtos';
import {
  ConsentStatus,
  ConsentPurpose,
  DataCategory,
  ConsentRecord,
} from '@ai-recruitment-clerk/shared-dtos';
import type { UserProfileDocument } from '../../schemas/user-profile.schema';
import { UserProfile } from '../../schemas/user-profile.schema';

/**
 * Consent Management Service
 * Handles core consent record operations including capturing, withdrawing, and checking consent status
 */
@Injectable()
export class ConsentManagementService {
  private readonly logger = new Logger(ConsentManagementService.name);

  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
  ) {}

  /**
   * Capture user consent for various processing purposes
   */
  public async captureConsent(
    captureConsentDto: CaptureConsentDto,
    natsClient: NatsClient,
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
        (consent: {
          purpose: ConsentPurpose;
          granted: boolean;
          method?: string;
          dataCategories?: DataCategory[];
          consentText?: string;
        }) => {
          const record = new ConsentRecord();
          record.id = uuidv4();
          record.userId = captureConsentDto.userId;
          record.purpose = consent.purpose;
          record.status = consent.granted
            ? ConsentStatus.GRANTED
            : ConsentStatus.DENIED;
          if (consent.method) {
            record.consentMethod = consent.method as ConsentMethod;
          }
          record.dataCategories =
            consent.dataCategories ||
            this.getDefaultDataCategories(consent.purpose);
          record.legalBasis = this.getLegalBasisForPurpose(consent.purpose);
          record.consentDate = new Date();
          record.consentText = consent.consentText;
          record.ipAddress = captureConsentDto.ipAddress;
          record.userAgent = captureConsentDto.userAgent;
          record.createdAt = new Date();
          record.updatedAt = new Date();
          return record;
        },
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

      // Publish consent captured event
      await natsClient.publish('consent.captured', {
        userId: captureConsentDto.userId,
        consentRecords,
        timestamp: new Date().toISOString(),
      });

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
  public async withdrawConsent(
    withdrawConsentDto: WithdrawConsentDto,
  ): Promise<void> {
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
  public async getConsentStatus(userId: string): Promise<ConsentStatusDto> {
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
            grantedAt:
              (userProfile as { createdAt?: Date }).createdAt || new Date(),
            canWithdraw: false, // Essential services cannot be withdrawn
          },
          {
            purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
            status: userProfile.marketingConsent,
            grantedAt:
              (userProfile as { createdAt?: Date }).createdAt || new Date(),
            canWithdraw: true,
          },
          {
            purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
            status: userProfile.analyticsConsent,
            grantedAt:
              (userProfile as { createdAt?: Date }).createdAt || new Date(),
            canWithdraw: true,
          },
        ],
        needsRenewal: this.checkConsentRenewalNeeded(userProfile),
        lastUpdated:
          (userProfile as { updatedAt?: Date }).updatedAt || new Date(),
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
   * Get default data categories for a consent purpose
   */
  public getDefaultDataCategories(purpose: ConsentPurpose): DataCategory[] {
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
        DataCategory.PERFORMANCE_DATA,
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
      [ConsentPurpose.RESUME_PROCESSING]: [
        DataCategory.RESUME_CONTENT,
        DataCategory.PROFILE_INFORMATION,
      ],
      [ConsentPurpose.MARKETING]: [
        DataCategory.COMMUNICATION_PREFERENCES,
        DataCategory.PROFILE_INFORMATION,
      ],
      [ConsentPurpose.ANALYTICS]: [
        DataCategory.BEHAVIORAL_DATA,
        DataCategory.SYSTEM_LOGS,
      ],
      [ConsentPurpose.COMMUNICATION]: [DataCategory.COMMUNICATION_PREFERENCES],
    };

    return categoryMap[purpose] || [DataCategory.GENERAL];
  }

  /**
   * Get GDPR legal basis for a consent purpose
   */
  public getLegalBasisForPurpose(purpose: ConsentPurpose): string {
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

    return (
      legalBasisMap[purpose as keyof typeof legalBasisMap] ||
      'Article 6(1)(f) - Legitimate interests'
    );
  }

  /**
   * Check if user has consent for essential processing
   */
  public hasConsentForEssentialProcessing(
    records: ConsentRecord[],
  ): boolean {
    const essential = records.find(
      (r) => r.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
    );
    return essential?.status === ConsentStatus.GRANTED;
  }

  /**
   * Check if user has consent for marketing
   */
  public hasConsentForMarketing(records: ConsentRecord[]): boolean {
    const marketing = records.find(
      (r) => r.purpose === ConsentPurpose.MARKETING_COMMUNICATIONS,
    );
    return marketing?.status === ConsentStatus.GRANTED;
  }

  /**
   * Check if user has consent for analytics
   */
  public hasConsentForAnalytics(records: ConsentRecord[]): boolean {
    const analytics = records.find(
      (r) => r.purpose === ConsentPurpose.BEHAVIORAL_ANALYTICS,
    );
    return analytics?.status === ConsentStatus.GRANTED;
  }

  /**
   * Check if consent renewal is needed (older than 1 year)
   */
  public checkConsentRenewalNeeded(userProfile: UserProfileDocument): boolean {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return (
      ((userProfile as { updatedAt?: Date }).updatedAt || new Date()) < oneYearAgo
    );
  }
}
