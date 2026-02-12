import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type {
  UserDataCollectionItem,
  NatsClient,
  MongoModel,
} from '@ai-recruitment-clerk/shared-dtos';
import type { UserProfileDocument } from '../../schemas/user-profile.schema';
import { UserProfile } from '../../schemas/user-profile.schema';

/**
 * Data Collection Service
 * Collects user data from all microservices for GDPR data access requests
 */
@Injectable()
export class DataCollectionService {
  private readonly logger = new Logger(DataCollectionService.name);

  constructor(
    @InjectModel(UserProfile.name)
    private readonly userProfileModel: Model<UserProfileDocument>,
    // These models will be properly injected via module configuration
    private readonly consentRecordModel?: MongoModel,
    private readonly dataSubjectRightsModel?: MongoModel,
  ) {}

  /**
   * Collect all user data from across all services
   * Calls data collection endpoints on all microservices
   */
  public async collectUserData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    const collectedData: UserDataCollectionItem[] = [];

    try {
      this.logger.log(
        `Starting comprehensive data collection for user: ${userId}`,
      );

      // Collect data from all services in parallel
      const dataCollectionPromises = [
        this.collectGatewayData(userId),
        this.collectResumeParserData(userId, natsClient),
        this.collectScoringEngineData(userId, natsClient),
        this.collectReportGeneratorData(userId, natsClient),
        this.collectJdExtractorData(userId, natsClient),
        this.collectAnalyticsData(userId, natsClient),
        this.collectMarketingData(userId, natsClient),
        this.collectUserManagementData(userId, natsClient),
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

  /**
   * Collect user data from the app-gateway local database
   */
  public async collectGatewayData(
    userId: string,
  ): Promise<UserDataCollectionItem[]> {
    try {
      const data: UserDataCollectionItem[] = [];

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
      if (this.consentRecordModel) {
        const consentRecords = await this.consentRecordModel
          .find({ userId })
          .lean();
        if (Array.isArray(consentRecords) && consentRecords.length > 0) {
          data.push({
            service: 'app-gateway',
            dataType: 'consent_records',
            data: consentRecords,
            collectedAt: new Date().toISOString(),
          });
        }
      }

      // Collect data subject rights requests
      if (this.dataSubjectRightsModel) {
        const rightsRequests = await this.dataSubjectRightsModel
          .find({ userId })
          .lean();
        if (Array.isArray(rightsRequests) && rightsRequests.length > 0) {
          data.push({
            service: 'app-gateway',
            dataType: 'rights_requests',
            data: rightsRequests,
            collectedAt: new Date().toISOString(),
          });
        }
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

  /**
   * Collect user data from resume-parser service
   */
  public async collectResumeParserData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request data from resume parser service via NATS
      const response = await natsClient.request(
        'resume-parser.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect resume parser data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user data from scoring-engine service
   */
  public async collectScoringEngineData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request data from scoring engine service via NATS
      const response = await natsClient.request(
        'scoring-engine.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect scoring engine data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user data from report-generator service
   */
  public async collectReportGeneratorData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request data from report generator service via NATS
      const response = await natsClient.request(
        'report-generator.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect report generator data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user data from jd-extractor service
   */
  public async collectJdExtractorData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request data from JD extractor service via NATS
      const response = await natsClient.request(
        'jd-extractor.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect JD extractor data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user analytics data
   */
  public async collectAnalyticsData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request analytics data via NATS
      const response = await natsClient.request(
        'analytics.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect analytics data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user marketing data
   */
  public async collectMarketingData(
    userId: string,
    natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request marketing data via NATS
      const response = await natsClient.request(
        'marketing.data.collect',
        { userId },
        5000,
      );
      return response ? [response as UserDataCollectionItem] : [];
    } catch (error) {
      this.logger.error(
        `Failed to collect marketing data for user ${userId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Collect user management data
   */
  public async collectUserManagementData(
    _userId: string,
    _natsClient: NatsClient,
  ): Promise<UserDataCollectionItem[]> {
    try {
      // Request user management data via NATS
      // const response = await _natsClient.request('user-management.data.collect', { _userId }, 5000);
      // return response ? [response as UserDataCollectionItem] : [];

      // Fallback implementation until NATS client is properly injected
      return [];
    } catch (error) {
      this.logger.error(
        `Failed to collect user management data for user ${_userId}:`,
        error,
      );
      return [];
    }
  }
}
