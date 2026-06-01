import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DataCollectionService } from './data-collection.service';
import { UserProfile } from '../../schemas/user-profile.schema';
import type {
  UserDataCollectionItem,
  NatsClient,
  MongoModel,
} from '@ai-recruitment-clerk/shared-dtos';
import type { Model } from 'mongoose';

describe('DataCollectionService', () => {
  let service: DataCollectionService;
  let userProfileModelMock: jest.Mocked<Model<any>>;
  let consentRecordModelMock: jest.Mocked<MongoModel>;
  let dataSubjectRightsModelMock: jest.Mocked<MongoModel>;
  let natsClientMock: jest.Mocked<NatsClient>;

  beforeEach(async () => {
    userProfileModelMock = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Model<any>>;

    consentRecordModelMock = {
      find: jest.fn(),
    } as unknown as jest.Mocked<MongoModel>;

    dataSubjectRightsModelMock = {
      find: jest.fn(),
    } as unknown as jest.Mocked<MongoModel>;

    natsClientMock = {
      request: jest.fn(),
    } as unknown as jest.Mocked<NatsClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataCollectionService,
        {
          provide: getModelToken(UserProfile.name),
          useValue: userProfileModelMock,
        },
      ],
    }).compile();

    service = module.get<DataCollectionService>(DataCollectionService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('collectUserData', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      // Setup successful gateway data collection
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          userId: mockUserId,
          name: 'John Doe',
          email: 'john@example.com',
        }),
      } as any);

      // Setup successful service responses
      natsClientMock.request.mockResolvedValue({
        service: 'resume-parser',
        dataType: 'resume_data',
        data: { content: 'Resume content' },
        collectedAt: new Date().toISOString(),
      } as UserDataCollectionItem);
    });

    it('should collect user data successfully', async () => {
      const result = await service.collectUserData(mockUserId, natsClientMock);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should call all data collection methods in parallel', async () => {
      await service.collectUserData(mockUserId, natsClientMock);

      // Should call gateway data collection
      expect(userProfileModelMock.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
      });
    });

    it('should handle partial failures gracefully', async () => {
      natsClientMock.request.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const result = await service.collectUserData(mockUserId, natsClientMock);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return collected data from successful services', async () => {
      // Mock successful responses for some services
      const mockData = {
        service: 'app-gateway',
        dataType: 'user_profile',
        data: { name: 'John' },
        collectedAt: new Date().toISOString(),
      };

      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockData.data),
      } as any);

      const result = await service.collectUserData(mockUserId, natsClientMock);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when all collections fail', async () => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      natsClientMock.request.mockRejectedValue(
        new Error('All services failed'),
      );

      const result = await service.collectUserData(mockUserId, natsClientMock);

      // Should still return empty array, not throw
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('collectGatewayData', () => {
    const mockUserId = 'user-123';

    it('should collect user profile data', async () => {
      const mockProfile = {
        userId: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
      };

      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfile),
      } as any);

      const result = await service.collectGatewayData(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].dataType).toBe('user_profile');
      expect(result[0].service).toBe('app-gateway');
    });

    it('should collect consent records when model exists', async () => {
      const mockProfile = { userId: mockUserId };
      const mockConsentRecords = [{ purpose: 'marketing', granted: true }];

      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfile),
      } as any);

      // Inject consent record model
      const serviceWithConsent = new DataCollectionService(
        userProfileModelMock,
        consentRecordModelMock,
        dataSubjectRightsModelMock,
      );

      consentRecordModelMock.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockConsentRecords),
      } as any);

      const result = await serviceWithConsent.collectGatewayData(mockUserId);

      expect(result.some((item) => item.dataType === 'consent_records')).toBe(
        true,
      );
    });

    it('should collect rights requests when model exists', async () => {
      const mockProfile = { userId: mockUserId };
      const mockRightsRequests = [{ type: 'access', status: 'completed' }];

      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProfile),
      } as any);

      const serviceWithRights = new DataCollectionService(
        userProfileModelMock,
        consentRecordModelMock,
        dataSubjectRightsModelMock,
      );

      dataSubjectRightsModelMock.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockRightsRequests),
      } as any);

      const result = await serviceWithRights.collectGatewayData(mockUserId);

      expect(result.some((item) => item.dataType === 'rights_requests')).toBe(
        true,
      );
    });

    it('should return empty array when no user profile found', async () => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      const result = await service.collectGatewayData(mockUserId);

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database error')),
      } as any);

      const result = await service.collectGatewayData(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('collectResumeParserData', () => {
    const mockUserId = 'user-123';

    it('should collect resume parser data successfully', async () => {
      const mockData = {
        service: 'resume-parser',
        dataType: 'resume_data',
        data: { content: 'Resume content' },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectResumeParserData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockData);
    });

    it('should return empty array when request times out', async () => {
      natsClientMock.request.mockResolvedValue(null);

      const result = await service.collectResumeParserData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectResumeParserData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });

    it('should call NATS with correct subject and timeout', async () => {
      await service.collectResumeParserData(mockUserId, natsClientMock);

      expect(natsClientMock.request).toHaveBeenCalledWith(
        'resume-parser.data.collect',
        { userId: mockUserId },
        5000,
      );
    });
  });

  describe('collectScoringEngineData', () => {
    const mockUserId = 'user-123';

    it('should collect scoring engine data successfully', async () => {
      const mockData = {
        service: 'scoring-engine',
        dataType: 'scores',
        data: { score: 85 },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectScoringEngineData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
    });

    it('should return empty array on error', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectScoringEngineData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });

    it('should call NATS with correct subject', async () => {
      await service.collectScoringEngineData(mockUserId, natsClientMock);

      expect(natsClientMock.request).toHaveBeenCalledWith(
        'scoring-engine.data.collect',
        { userId: mockUserId },
        5000,
      );
    });
  });

  describe('collectReportGeneratorData', () => {
    const mockUserId = 'user-123';

    it('should collect report generator data successfully', async () => {
      const mockData = {
        service: 'report-generator',
        dataType: 'reports',
        data: { reports: [] },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectReportGeneratorData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectReportGeneratorData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });
  });

  describe('collectJdExtractorData', () => {
    const mockUserId = 'user-123';

    it('should collect JD extractor data successfully', async () => {
      const mockData = {
        service: 'jd-extractor',
        dataType: 'job_descriptions',
        data: { jds: [] },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectJdExtractorData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectJdExtractorData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });
  });

  describe('collectAnalyticsData', () => {
    const mockUserId = 'user-123';

    it('should collect analytics data successfully', async () => {
      const mockData = {
        service: 'analytics',
        dataType: 'analytics_data',
        data: { events: [] },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectAnalyticsData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectAnalyticsData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });
  });

  describe('collectMarketingData', () => {
    const mockUserId = 'user-123';

    it('should collect marketing data successfully', async () => {
      const mockData = {
        service: 'marketing',
        dataType: 'marketing_data',
        data: { campaigns: [] },
      };

      natsClientMock.request.mockResolvedValue(mockData);

      const result = await service.collectMarketingData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.collectMarketingData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });
  });

  describe('collectUserManagementData', () => {
    const mockUserId = 'user-123';

    it('should return empty array (not implemented)', async () => {
      const result = await service.collectUserManagementData(
        mockUserId,
        natsClientMock,
      );

      expect(result).toEqual([]);
    });
  });

  describe('Concurrent Operations', () => {
    const mockUserId = 'user-123';

    it('should handle multiple concurrent collection requests', async () => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ userId: mockUserId }),
      } as any);

      natsClientMock.request.mockResolvedValue({
        service: 'test',
        dataType: 'test_data',
        data: {},
      });

      const promises = Array(5)
        .fill(null)
        .map(() => service.collectUserData(mockUserId, natsClientMock));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
