import { Test, TestingModule } from '@nestjs/testing';
import { PrivacyComplianceService } from './privacy-compliance.service';
import type { ConsentManagementService } from './services/consent-management.service';
import type { ConsentCascadeService } from './services/consent-cascade.service';
import type { DataSubjectRightsService } from './services/data-subject-rights.service';
import type { DataCollectionService } from './services/data-collection.service';
import type { DataExportService } from './services/data-export.service';
import type { DataErasureService } from './services/data-erasure.service';
import {
  DataExportFormat,
  ConsentPurpose,
  ConsentStatus,
} from '@ai-recruitment-clerk/shared-dtos';
import type {
  CaptureConsentDto,
  WithdrawConsentDto,
  CreateRightsRequestDto,
  UserDataCollectionItem,
  DataCategoryExport,
  DataSubjectRightsRequest,
  ErasureEligibilityResult,
} from '@ai-recruitment-clerk/shared-dtos';

describe('PrivacyComplianceService', () => {
  let service: PrivacyComplianceService;
  let consentManagementServiceMock: jest.Mocked<ConsentManagementService>;
  let consentCascadeServiceMock: jest.Mocked<ConsentCascadeService>;
  let dataSubjectRightsServiceMock: jest.Mocked<DataSubjectRightsService>;
  let dataCollectionServiceMock: jest.Mocked<DataCollectionService>;
  let dataExportServiceMock: jest.Mocked<DataExportService>;
  let dataErasureServiceMock: jest.Mocked<DataErasureService>;

  beforeEach(async () => {
    consentManagementServiceMock = {
      captureConsent: jest.fn(),
      withdrawConsent: jest.fn(),
      getConsentStatus: jest.fn(),
    } as unknown as jest.Mocked<ConsentManagementService>;

    consentCascadeServiceMock = {
      cascadeConsentWithdrawal: jest.fn(),
    } as unknown as jest.Mocked<ConsentCascadeService>;

    dataSubjectRightsServiceMock = {
      createRightsRequest: jest.fn(),
    } as unknown as jest.Mocked<DataSubjectRightsService>;

    dataCollectionServiceMock = {
      collectUserData: jest.fn(),
    } as unknown as jest.Mocked<DataCollectionService>;

    dataExportServiceMock = {
      generateSecureDownloadUrl: jest.fn(),
      getRetentionPolicies: jest.fn(),
    } as unknown as jest.Mocked<DataExportService>;

    dataErasureServiceMock = {
      checkErasureEligibility: jest.fn(),
      cascadeDataDeletion: jest.fn(),
    } as unknown as jest.Mocked<DataErasureService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyComplianceService,
        {
          provide: ConsentManagementService,
          useValue: consentManagementServiceMock,
        },
        {
          provide: ConsentCascadeService,
          useValue: consentCascadeServiceMock,
        },
        {
          provide: DataSubjectRightsService,
          useValue: dataSubjectRightsServiceMock,
        },
        {
          provide: DataCollectionService,
          useValue: dataCollectionServiceMock,
        },
        {
          provide: DataExportService,
          useValue: dataExportServiceMock,
        },
        {
          provide: DataErasureService,
          useValue: dataErasureServiceMock,
        },
      ],
    }).compile();

    service = module.get<PrivacyComplianceService>(PrivacyComplianceService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(consentManagementServiceMock).toBeDefined();
      expect(consentCascadeServiceMock).toBeDefined();
      expect(dataSubjectRightsServiceMock).toBeDefined();
      expect(dataCollectionServiceMock).toBeDefined();
      expect(dataExportServiceMock).toBeDefined();
      expect(dataErasureServiceMock).toBeDefined();
    });
  });

  describe('captureConsent', () => {
    const mockCaptureConsentDto: CaptureConsentDto = {
      userId: 'user-123',
      consents: [
        {
          purpose: ConsentPurpose.ESSENTIAL_SERVICES,
          granted: true,
          method: 'explicit',
          dataCategories: [],
        },
      ],
      consentVersion: '1.0',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    const mockConsentProfile = {
      userId: 'user-123',
      consentRecords: [],
      lastConsentUpdate: new Date(),
      consentVersion: '1.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      hasValidConsent: jest.fn().mockReturnValue(true),
      getGrantedPurposes: jest
        .fn()
        .mockReturnValue([ConsentPurpose.ESSENTIAL_SERVICES]),
      needsConsentRenewal: jest.fn().mockReturnValue(false),
    };

    it('should capture consent successfully', async () => {
      consentManagementServiceMock.captureConsent.mockResolvedValue(
        mockConsentProfile,
      );

      const result = await service.captureConsent(mockCaptureConsentDto);

      expect(result).toEqual(mockConsentProfile);
      expect(consentManagementServiceMock.captureConsent).toHaveBeenCalledWith(
        mockCaptureConsentDto,
        expect.any(Object), // natsClient
      );
    });

    it('should delegate to ConsentManagementService', async () => {
      consentManagementServiceMock.captureConsent.mockResolvedValue(
        mockConsentProfile,
      );

      await service.captureConsent(mockCaptureConsentDto);

      expect(consentManagementServiceMock.captureConsent).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should pass NATS client to service', async () => {
      consentManagementServiceMock.captureConsent.mockResolvedValue(
        mockConsentProfile,
      );

      await service.captureConsent(mockCaptureConsentDto);

      expect(consentManagementServiceMock.captureConsent).toHaveBeenCalledWith(
        mockCaptureConsentDto,
        expect.objectContaining({
          publish: expect.any(Function),
          request: expect.any(Function),
        }),
      );
    });

    it('should throw error when service fails', async () => {
      consentManagementServiceMock.captureConsent.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.captureConsent(mockCaptureConsentDto),
      ).rejects.toThrow('Database error');
    });
  });

  describe('withdrawConsent', () => {
    const mockWithdrawConsentDto: WithdrawConsentDto = {
      userId: 'user-123',
      purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
      reason: 'User requested',
    };

    beforeEach(() => {
      consentManagementServiceMock.withdrawConsent.mockResolvedValue(undefined);
      consentCascadeServiceMock.cascadeConsentWithdrawal.mockResolvedValue(
        undefined,
      );
    });

    it('should withdraw consent successfully', async () => {
      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).resolves.not.toThrow();
    });

    it('should call consent management service first', async () => {
      await service.withdrawConsent(mockWithdrawConsentDto);

      expect(consentManagementServiceMock.withdrawConsent).toHaveBeenCalledWith(
        mockWithdrawConsentDto,
      );
    });

    it('should cascade consent withdrawal after withdrawal', async () => {
      await service.withdrawConsent(mockWithdrawConsentDto);

      expect(
        consentCascadeServiceMock.cascadeConsentWithdrawal,
      ).toHaveBeenCalledWith(
        mockWithdrawConsentDto.userId,
        mockWithdrawConsentDto.purpose,
        expect.any(Object),
      );
    });

    it('should call cascade after withdrawal completes', async () => {
      const callOrder: string[] = [];
      consentManagementServiceMock.withdrawConsent.mockImplementation(
        async () => {
          callOrder.push('withdraw');
        },
      );
      consentCascadeServiceMock.cascadeConsentWithdrawal.mockImplementation(
        async () => {
          callOrder.push('cascade');
        },
      );

      await service.withdrawConsent(mockWithdrawConsentDto);

      expect(callOrder).toEqual(['withdraw', 'cascade']);
    });

    it('should throw error when withdraw fails', async () => {
      consentManagementServiceMock.withdrawConsent.mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).rejects.toThrow('Permission denied');
    });

    it('should throw error when cascade fails', async () => {
      consentCascadeServiceMock.cascadeConsentWithdrawal.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('getConsentStatus', () => {
    const mockUserId = 'user-123';
    const mockConsentStatus = {
      userId: mockUserId,
      purposes: [
        {
          purpose: ConsentPurpose.ESSENTIAL_SERVICES,
          status: ConsentStatus.GRANTED,
          grantedAt: new Date(),
          canWithdraw: false,
        },
      ],
      needsRenewal: false,
      lastUpdated: new Date(),
    };

    it('should get consent status successfully', async () => {
      consentManagementServiceMock.getConsentStatus.mockResolvedValue(
        mockConsentStatus,
      );

      const result = await service.getConsentStatus(mockUserId);

      expect(result).toEqual(mockConsentStatus);
    });

    it('should delegate to ConsentManagementService', async () => {
      consentManagementServiceMock.getConsentStatus.mockResolvedValue(
        mockConsentStatus,
      );

      await service.getConsentStatus(mockUserId);

      expect(
        consentManagementServiceMock.getConsentStatus,
      ).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw error when service fails', async () => {
      consentManagementServiceMock.getConsentStatus.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(service.getConsentStatus(mockUserId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('createRightsRequest', () => {
    const mockCreateRequestDto: CreateRightsRequestDto = {
      userId: 'user-123',
      requestType: 'access',
      description: 'Request for personal data access',
    };

    const mockRightsRequest = {
      id: 'request-456',
      userId: 'user-123',
      requestType: 'access',
      type: 'access',
      status: 'pending',
      identityVerificationStatus: 'pending',
      requestDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as DataSubjectRightsRequest;

    it('should create rights request successfully', async () => {
      dataSubjectRightsServiceMock.createRightsRequest.mockResolvedValue(
        mockRightsRequest,
      );

      const result = await service.createRightsRequest(mockCreateRequestDto);

      expect(result).toEqual(mockRightsRequest);
    });

    it('should delegate to DataSubjectRightsService', async () => {
      dataSubjectRightsServiceMock.createRightsRequest.mockResolvedValue(
        mockRightsRequest,
      );

      await service.createRightsRequest(mockCreateRequestDto);

      expect(
        dataSubjectRightsServiceMock.createRightsRequest,
      ).toHaveBeenCalledWith(mockCreateRequestDto, expect.any(Object));
    });

    it('should throw error when service fails', async () => {
      dataSubjectRightsServiceMock.createRightsRequest.mockRejectedValue(
        new Error('Invalid request type'),
      );

      await expect(
        service.createRightsRequest(mockCreateRequestDto),
      ).rejects.toThrow('Invalid request type');
    });
  });

  describe('processDataAccessRequest', () => {
    const mockUserId = 'user-123';
    const mockUserData: UserDataCollectionItem[] = [
      {
        service: 'app-gateway',
        dataType: 'user_profile',
        data: { name: 'John Doe' },
        collectedAt: new Date().toISOString(),
      },
    ];

    beforeEach(() => {
      dataCollectionServiceMock.collectUserData.mockResolvedValue(mockUserData);
      dataExportServiceMock.getRetentionPolicies.mockResolvedValue({
        user_profiles: '7 years',
      });
      dataExportServiceMock.generateSecureDownloadUrl.mockResolvedValue(
        'https://example.com/download/abc',
      );
    });

    it('should process data access request successfully', async () => {
      const result = await service.processDataAccessRequest(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
      expect(result.format).toBe(DataExportFormat.JSON);
    });

    it('should use provided format', async () => {
      const result = await service.processDataAccessRequest(
        mockUserId,
        DataExportFormat.CSV,
      );

      expect(result.format).toBe(DataExportFormat.CSV);
    });

    it('should collect user data', async () => {
      await service.processDataAccessRequest(mockUserId);

      expect(dataCollectionServiceMock.collectUserData).toHaveBeenCalledWith(
        mockUserId,
        expect.any(Object),
      );
    });

    it('should convert user data to data categories', async () => {
      const result = await service.processDataAccessRequest(mockUserId);

      expect(result.dataCategories).toBeDefined();
      expect(result.dataCategories.length).toBeGreaterThan(0);
    });

    it('should generate secure download URL', async () => {
      await service.processDataAccessRequest(mockUserId);

      expect(
        dataExportServiceMock.generateSecureDownloadUrl,
      ).toHaveBeenCalled();
    });

    it('should include metadata in export package', async () => {
      const result = await service.processDataAccessRequest(mockUserId);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.dataController).toBe('AI Recruitment Clerk');
      expect(result.metadata.privacyPolicyVersion).toBe('1.0');
    });

    it('should throw error when data collection fails', async () => {
      dataCollectionServiceMock.collectUserData.mockRejectedValue(
        new Error('Collection failed'),
      );

      await expect(
        service.processDataAccessRequest(mockUserId),
      ).rejects.toThrow('Collection failed');
    });

    it('should handle empty user data', async () => {
      dataCollectionServiceMock.collectUserData.mockResolvedValue([]);

      const result = await service.processDataAccessRequest(mockUserId);

      expect(result).toBeDefined();
      expect(result.dataCategories).toEqual([]);
    });

    it('should throw error when download URL generation fails', async () => {
      dataExportServiceMock.generateSecureDownloadUrl.mockRejectedValue(
        new Error('Storage error'),
      );

      await expect(
        service.processDataAccessRequest(mockUserId),
      ).rejects.toThrow('Storage error');
    });
  });

  describe('processDataErasureRequest', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      dataErasureServiceMock.checkErasureEligibility.mockResolvedValue({
        eligible: true,
      } as ErasureEligibilityResult);
      dataErasureServiceMock.cascadeDataDeletion.mockResolvedValue(undefined);
    });

    it('should process data erasure request successfully', async () => {
      await expect(
        service.processDataErasureRequest(mockUserId),
      ).resolves.not.toThrow();
    });

    it('should check eligibility first', async () => {
      await service.processDataErasureRequest(mockUserId);

      expect(
        dataErasureServiceMock.checkErasureEligibility,
      ).toHaveBeenCalledWith(mockUserId, expect.any(Object));
    });

    it('should cascade deletion when eligible', async () => {
      await service.processDataErasureRequest(mockUserId);

      expect(dataErasureServiceMock.cascadeDataDeletion).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        expect.any(Object),
      );
    });

    it('should cascade specific categories when provided', async () => {
      const categories = ['user_profile', 'resume_data'];
      await service.processDataErasureRequest(mockUserId, categories);

      expect(dataErasureServiceMock.cascadeDataDeletion).toHaveBeenCalledWith(
        mockUserId,
        categories,
        expect.any(Object),
      );
    });

    it('should throw ForbiddenException when not eligible', async () => {
      dataErasureServiceMock.checkErasureEligibility.mockResolvedValue({
        eligible: false,
        reason: 'Active subscription',
      } as ErasureEligibilityResult);

      await expect(
        service.processDataErasureRequest(mockUserId),
      ).rejects.toThrow('Cannot erase data: Active subscription');
    });

    it('should throw error when eligibility check fails', async () => {
      dataErasureServiceMock.checkErasureEligibility.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.processDataErasureRequest(mockUserId),
      ).rejects.toThrow('Database error');
    });

    it('should throw error when deletion fails', async () => {
      dataErasureServiceMock.cascadeDataDeletion.mockRejectedValue(
        new Error('Deletion failed'),
      );

      await expect(
        service.processDataErasureRequest(mockUserId),
      ).rejects.toThrow('Deletion failed');
    });
  });

  describe('NATS Client Fallback', () => {
    it('should create fallback NATS client', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PrivacyComplianceService,
          {
            provide: ConsentManagementService,
            useValue: consentManagementServiceMock,
          },
          {
            provide: ConsentCascadeService,
            useValue: consentCascadeServiceMock,
          },
          {
            provide: DataSubjectRightsService,
            useValue: dataSubjectRightsServiceMock,
          },
          {
            provide: DataCollectionService,
            useValue: dataCollectionServiceMock,
          },
          {
            provide: DataExportService,
            useValue: dataExportServiceMock,
          },
          {
            provide: DataErasureService,
            useValue: dataErasureServiceMock,
          },
        ],
      }).compile();

      const testService = module.get<PrivacyComplianceService>(
        PrivacyComplianceService,
      );

      // Test that fallback NATS client exists (it's private, but we can test via behavior)
      consentManagementServiceMock.captureConsent.mockResolvedValue({
        userId: 'test',
        consentRecords: [],
        lastConsentUpdate: new Date(),
        consentVersion: '1.0',
        createdAt: new Date(),
        updatedAt: new Date(),
        hasValidConsent: jest.fn(),
        getGrantedPurposes: jest.fn(),
        needsConsentRenewal: jest.fn(),
      });

      // Should not throw even though we're using the fallback client
      await expect(
        testService.captureConsent({
          userId: 'test',
          consents: [],
        } as CaptureConsentDto),
      ).resolves.not.toThrow();
    });
  });
});
