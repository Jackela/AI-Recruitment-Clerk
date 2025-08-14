import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConsentStatus, DataCategory } from '../schemas/consent-record.schema';
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
  ProcessRightsRequestDto,
  RequestStatus,
  DataExportFormat,
  IdentityVerificationStatus,
  UserPreferencesDto,
  ConsentPurpose
} from '../common/interfaces/fallback-types';
import { UserProfile, UserProfileDocument } from '../schemas/user-profile.schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * GDPR Privacy Compliance Service
 * Handles consent management, data subject rights, and privacy infrastructure
 */
@Injectable()
export class PrivacyComplianceService {
  private readonly logger = new Logger(PrivacyComplianceService.name);

  constructor(
    @InjectModel(UserProfile.name) private userProfileModel: Model<UserProfileDocument>,
    // We'll inject additional models as we create them
  ) {}

  /**
   * CONSENT MANAGEMENT
   */

  /**
   * Capture user consent for various processing purposes
   */
  async captureConsent(captureConsentDto: CaptureConsentDto): Promise<UserConsentProfile> {
    this.logger.log(`Capturing consent for user: ${captureConsentDto.userId}`);

    try {
      // Find or create user consent profile
      let userProfile = await this.userProfileModel.findOne({ 
        userId: captureConsentDto.userId 
      });

      if (!userProfile) {
        throw new NotFoundException(`User profile not found for user: ${captureConsentDto.userId}`);
      }

      // Process consent grants
      const consentRecords: ConsentRecord[] = captureConsentDto.consents.map(consent => ({
        id: uuidv4(),
        userId: captureConsentDto.userId,
        purpose: consent.purpose,
        status: consent.granted ? ConsentStatus.GRANTED : ConsentStatus.DENIED,
        consentMethod: consent.method,
        dataCategories: consent.dataCategories || this.getDefaultDataCategories(consent.purpose),
        legalBasis: this.getLegalBasisForPurpose(consent.purpose),
        consentDate: new Date(),
        consentText: consent.consentText,
        ipAddress: captureConsentDto.ipAddress,
        userAgent: captureConsentDto.userAgent,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Update user profile with consent information
      userProfile.dataProcessingConsent = this.hasConsentForEssentialProcessing(consentRecords) 
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
          const record = consentRecords.find(r => r.purpose === purpose);
          return record?.status === ConsentStatus.GRANTED;
        },
        getGrantedPurposes: () => {
          return consentRecords
            .filter(r => r.status === ConsentStatus.GRANTED)
            .map(r => r.purpose);
        },
        needsConsentRenewal: () => false // New consent, no renewal needed
      };

      this.logger.log(`Consent captured successfully for user: ${captureConsentDto.userId}`);
      return consentProfile;

    } catch (error) {
      this.logger.error(`Failed to capture consent for user ${captureConsentDto.userId}:`, error);
      throw error;
    }
  }

  /**
   * Withdraw consent for a specific purpose
   */
  async withdrawConsent(withdrawConsentDto: WithdrawConsentDto): Promise<void> {
    this.logger.log(`Withdrawing consent for user: ${withdrawConsentDto.userId}, purpose: ${withdrawConsentDto.purpose}`);

    try {
      const userProfile = await this.userProfileModel.findOne({ 
        userId: withdrawConsentDto.userId 
      });

      if (!userProfile) {
        throw new NotFoundException(`User profile not found for user: ${withdrawConsentDto.userId}`);
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
          throw new ForbiddenException('Cannot withdraw consent for essential services required for contract performance');
        default:
          // Handle other purposes as needed
          break;
      }

      await userProfile.save();

      // TODO: Implement consent withdrawal cascade - stop processing activities
      await this.cascadeConsentWithdrawal(withdrawConsentDto.userId, withdrawConsentDto.purpose as any);

      this.logger.log(`Consent withdrawn successfully for user: ${withdrawConsentDto.userId}`);

    } catch (error) {
      this.logger.error(`Failed to withdraw consent for user ${withdrawConsentDto.userId}:`, error);
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
        throw new NotFoundException(`User profile not found for user: ${userId}`);
      }

      const consentStatus: ConsentStatusDto = {
        userId,
        purposes: [
          {
            purpose: ConsentPurpose.ESSENTIAL_SERVICES,
            status: userProfile.dataProcessingConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: false // Essential services cannot be withdrawn
          },
          {
            purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
            status: userProfile.marketingConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: true
          },
          {
            purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
            status: userProfile.analyticsConsent,
            grantedAt: (userProfile as any).createdAt || new Date(),
            canWithdraw: true
          }
        ],
        needsRenewal: this.checkConsentRenewalNeeded(userProfile),
        lastUpdated: (userProfile as any).updatedAt || new Date()
      };

      return consentStatus;

    } catch (error) {
      this.logger.error(`Failed to get consent status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * DATA SUBJECT RIGHTS IMPLEMENTATION
   */

  /**
   * Create a data subject rights request
   */
  async createRightsRequest(createRequestDto: CreateRightsRequestDto): Promise<DataSubjectRightsRequest> {
    this.logger.log(`Creating rights request for user: ${createRequestDto.userId}, type: ${createRequestDto.requestType}`);

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
        updatedAt: new Date()
      } as any;

      // TODO: Store in database (implement rights request schema)
      // await this.rightsRequestModel.create(rightsRequest);

      // Start automated processing for certain request types
      await this.startAutomatedRightsProcessing(rightsRequest);

      this.logger.log(`Rights request created: ${requestId}`);
      return rightsRequest;

    } catch (error) {
      this.logger.error(`Failed to create rights request for user ${createRequestDto.userId}:`, error);
      throw error;
    }
  }

  /**
   * Process data access request (Article 15)
   */
  async processDataAccessRequest(userId: string, format: DataExportFormat = DataExportFormat.JSON): Promise<DataExportPackage> {
    this.logger.log(`Processing data access request for user: ${userId}`);

    try {
      // Collect all personal data for the user
      const userData = await this.collectUserData(userId);

      const exportPackage: DataExportPackage = {
        requestId: uuidv4(),
        userId,
        data: userData,
        format,
        dataCategories: userData,
        metadata: {
          exportDate: new Date(),
          dataController: 'AI Recruitment Clerk',
          privacyPolicyVersion: '1.0',
          retentionPolicies: await this.getRetentionPolicies(),
          thirdPartyProcessors: ['Google Gemini AI']
        },
        createdAt: new Date()
      };

      // Generate download URL (implementation depends on file storage system)
      exportPackage.downloadUrl = await this.generateSecureDownloadUrl(exportPackage);

      this.logger.log(`Data access request processed for user: ${userId}`);
      return exportPackage;

    } catch (error) {
      this.logger.error(`Failed to process data access request for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process data erasure request (Article 17 - Right to be forgotten)
   */
  async processDataErasureRequest(userId: string, specificCategories?: string[]): Promise<void> {
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
      this.logger.error(`Failed to process data erasure request for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * PRIVATE HELPER METHODS
   */

  private getDefaultDataCategories(purpose: ConsentPurpose): string[] {
    const categoryMap = {
      [ConsentPurpose.ESSENTIAL_SERVICES]: ['authentication', 'profile_information'],
      [ConsentPurpose.BEHAVIORAL_ANALYTICS]: ['behavioral_data', 'device_information'],
      [ConsentPurpose.MARKETING_COMMUNICATIONS]: ['communication_preferences', 'profile_information'],
      [ConsentPurpose.FUNCTIONAL_ANALYTICS]: ['system_logs', 'performance_data'],
      [ConsentPurpose.THIRD_PARTY_SHARING]: ['resume_content', 'job_preferences'],
      [ConsentPurpose.PERSONALIZATION]: ['profile_information', 'job_preferences'],
      [ConsentPurpose.PERFORMANCE_MONITORING]: ['system_logs']
    };

    return categoryMap[purpose] || ['general'];
  }

  private getLegalBasisForPurpose(purpose: ConsentPurpose): string {
    const legalBasisMap = {
      [ConsentPurpose.ESSENTIAL_SERVICES]: 'Article 6(1)(b) - Contract performance',
      [ConsentPurpose.BEHAVIORAL_ANALYTICS]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.MARKETING_COMMUNICATIONS]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.FUNCTIONAL_ANALYTICS]: 'Article 6(1)(f) - Legitimate interests',
      [ConsentPurpose.THIRD_PARTY_SHARING]: 'Article 6(1)(a) - Consent',
      [ConsentPurpose.PERSONALIZATION]: 'Article 6(1)(f) - Legitimate interests',
      [ConsentPurpose.PERFORMANCE_MONITORING]: 'Article 6(1)(f) - Legitimate interests'
    };

    return legalBasisMap[purpose] || 'Article 6(1)(f) - Legitimate interests';
  }

  private hasConsentForEssentialProcessing(records: ConsentRecord[]): boolean {
    const essential = records.find(r => r.purpose === ConsentPurpose.ESSENTIAL_SERVICES);
    return essential?.status === ConsentStatus.GRANTED;
  }

  private hasConsentForMarketing(records: ConsentRecord[]): boolean {
    const marketing = records.find(r => r.purpose === ConsentPurpose.MARKETING_COMMUNICATIONS);
    return marketing?.status === ConsentStatus.GRANTED;
  }

  private hasConsentForAnalytics(records: ConsentRecord[]): boolean {
    const analytics = records.find(r => r.purpose === ConsentPurpose.BEHAVIORAL_ANALYTICS);
    return analytics?.status === ConsentStatus.GRANTED;
  }

  private checkConsentRenewalNeeded(userProfile: UserProfileDocument): boolean {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return ((userProfile as any).updatedAt || new Date()) < oneYearAgo;
  }

  private async cascadeConsentWithdrawal(userId: string, purpose: ConsentPurpose): Promise<void> {
    // TODO: Implement consent withdrawal cascading
    // - Stop analytics collection
    // - Remove from marketing lists
    // - Update processing flags across services
    this.logger.log(`Cascading consent withdrawal for user ${userId}, purpose: ${purpose}`);
  }

  private async startAutomatedRightsProcessing(request: DataSubjectRightsRequest): Promise<void> {
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
    // TODO: Implement comprehensive data collection across all services
    const userData = [];
    
    // User profile data
    const profile = await this.userProfileModel.findOne({ userId });
    if (profile) {
      userData.push({
        category: 'User Profile',
        description: 'Account information and preferences',
        data: {
          userId: profile.userId,
          email: profile.email,
          displayName: profile.displayName,
          preferences: profile.preferences,
          createdAt: (profile as any).createdAt || new Date()
        },
        sources: ['app-gateway'],
        legalBasis: 'Contract performance',
        retentionPeriod: 'Until account deletion'
      });
    }

    // TODO: Collect data from other services
    // - Resume data from resume-parser-svc
    // - Job applications from jobs service
    // - Analytics data from analytics service

    return userData;
  }

  private async generateSecureDownloadUrl(exportPackage: DataExportPackage): Promise<string> {
    // TODO: Implement secure file storage and download URL generation
    const downloadId = uuidv4();
    return `/api/privacy/download/${downloadId}`;
  }

  private async getRetentionPolicies(): Promise<Record<string, string>> {
    // TODO: Implement retention policy lookup
    return {
      'user_profiles': '7 years after account deletion',
      'resume_data': '2 years after last application',
      'analytics_data': '2 years from collection',
      'system_logs': '1 year from creation'
    };
  }

  private async checkErasureEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
    // TODO: Implement erasure eligibility checks
    // - Active job applications
    // - Legal hold requirements
    // - Outstanding financial obligations
    
    return { eligible: true };
  }

  private async cascadeDataDeletion(userId: string, specificCategories?: string[]): Promise<void> {
    // TODO: Implement comprehensive data deletion across all services
    this.logger.log(`Cascading data deletion for user: ${userId}`, { specificCategories });
    
    // Delete user profile
    await this.userProfileModel.deleteOne({ userId });
    
    // TODO: Delete from other services:
    // - Resume data
    // - Job applications  
    // - Analytics events
    // - System logs (where legally permissible)
  }
}