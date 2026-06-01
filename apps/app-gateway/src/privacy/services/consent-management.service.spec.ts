import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConsentManagementService } from './consent-management.service';
import { UserProfile } from '../../schemas/user-profile.schema';
import {
  ConsentStatus,
  ConsentPurpose,
  DataCategory
} from '@ai-recruitment-clerk/shared-dtos';
import type {
  CaptureConsentDto,
  WithdrawConsentDto,

  ConsentRecord} from '@ai-recruitment-clerk/shared-dtos';
import type { Model } from 'mongoose';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ConsentManagementService', () => {
  let service: ConsentManagementService;
  let userProfileModelMock: jest.Mocked<Model<any>>;

  const mockUserProfile = {
    userId: 'user-123',
    dataProcessingConsent: ConsentStatus.GRANTED,
    marketingConsent: ConsentStatus.GRANTED,
    analyticsConsent: ConsentStatus.GRANTED,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    userProfileModelMock = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserProfile),
      }),
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as jest.Mocked<Model<any>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentManagementService,
        {
          provide: getModelToken(UserProfile.name),
          useValue: userProfileModelMock,
        },
      ],
    }).compile();

    service = module.get<ConsentManagementService>(ConsentManagementService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have userProfileModel injected', () => {
      expect(userProfileModelMock).toBeDefined();
    });
  });

  describe('captureConsent', () => {
    const mockNatsClient = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const mockCaptureConsentDto: CaptureConsentDto = {
      userId: 'user-123',
      consents: [
        {
          purpose: ConsentPurpose.ESSENTIAL_SERVICES,
          granted: true,
          method: 'explicit',
          dataCategories: [DataCategory.AUTHENTICATION],
          consentText: 'I consent to essential services',
        },
        {
          purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
          granted: true,
          method: 'explicit',
        },
      ],
      consentVersion: '1.0',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    beforeEach(() => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUserProfile),
      } as any);
    });

    it('should capture consent successfully', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockCaptureConsentDto.userId);
      expect(result.consentRecords).toHaveLength(2);
    });

    it('should throw NotFoundException when user profile not found', async () => {
      userProfileModelMock.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.captureConsent(mockCaptureConsentDto, mockNatsClient as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create consent records with correct data', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      const essentialRecord = result.consentRecords.find(
        (r) => r.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
      );
      expect(essentialRecord).toBeDefined();
      expect(essentialRecord?.status).toBe(ConsentStatus.GRANTED);
      expect(essentialRecord?.dataCategories).toContain(
        DataCategory.AUTHENTICATION,
      );
    });

    it('should use default data categories when not provided', async () => {
      const dtoWithoutCategories = {
        ...mockCaptureConsentDto,
        consents: [
          {
            purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
            granted: true,
          },
        ],
      };

      const result = await service.captureConsent(
        dtoWithoutCategories as CaptureConsentDto,
        mockNatsClient as any,
      );

      expect(result.consentRecords[0].dataCategories).toBeDefined();
      expect(result.consentRecords[0].dataCategories.length).toBeGreaterThan(0);
    });

    it('should set correct legal basis for each purpose', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      const essentialRecord = result.consentRecords.find(
        (r) => r.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
      );
      expect(essentialRecord?.legalBasis).toContain('Article 6(1)(b)');
    });

    it('should update user profile consent status', async () => {
      await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(mockUserProfile.save).toHaveBeenCalled();
    });

    it('should publish consent captured event', async () => {
      await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(mockNatsClient.publish).toHaveBeenCalledWith(
        'consent.captured',
        expect.objectContaining({
          userId: mockCaptureConsentDto.userId,
          consentRecords: expect.any(Array),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle denied consent correctly', async () => {
      const deniedConsentDto: CaptureConsentDto = {
        ...mockCaptureConsentDto,
        consents: [
          {
            purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
            granted: false,
          },
        ],
      };

      const result = await service.captureConsent(
        deniedConsentDto,
        mockNatsClient as any,
      );

      expect(result.consentRecords[0].status).toBe(ConsentStatus.DENIED);
    });

    it('should set consent version in response', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(result.consentVersion).toBe('1.0');
    });

    it('should provide hasValidConsent function in response', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(typeof result.hasValidConsent).toBe('function');
      expect(result.hasValidConsent(ConsentPurpose.ESSENTIAL_SERVICES)).toBe(
        true,
      );
    });

    it('should provide getGrantedPurposes function in response', async () => {
      const result = await service.captureConsent(
        mockCaptureConsentDto,
        mockNatsClient as any,
      );

      expect(typeof result.getGrantedPurposes).toBe('function');
      const granted = result.getGrantedPurposes();
      expect(granted).toContain(ConsentPurpose.ESSENTIAL_SERVICES);
    });

    it('should handle errors during save', async () => {
      mockUserProfile.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.captureConsent(mockCaptureConsentDto, mockNatsClient as any),
      ).rejects.toThrow('Database error');
    });

    it('should handle multiple consent records', async () => {
      const multiConsentDto: CaptureConsentDto = {
        ...mockCaptureConsentDto,
        consents: [
          { purpose: ConsentPurpose.ESSENTIAL_SERVICES, granted: true },
          { purpose: ConsentPurpose.MARKETING_COMMUNICATIONS, granted: true },
          { purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS, granted: true },
        ],
      };

      const result = await service.captureConsent(
        multiConsentDto,
        mockNatsClient as any,
      );

      expect(result.consentRecords).toHaveLength(3);
    });
  });

  describe('withdrawConsent', () => {
    const mockWithdrawConsentDto: WithdrawConsentDto = {
      userId: 'user-123',
      purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
      reason: 'User requested withdrawal',
    };

    beforeEach(() => {
      userProfileModelMock.findOne.mockResolvedValue(mockUserProfile);
    });

    it('should withdraw consent successfully', async () => {
      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException when user profile not found', async () => {
      userProfileModelMock.findOne.mockResolvedValue(null);

      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update marketing consent status', async () => {
      await service.withdrawConsent(mockWithdrawConsentDto);

      expect(mockUserProfile.marketingConsent).toBe(ConsentStatus.WITHDRAWN);
      expect(mockUserProfile.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for essential services', async () => {
      const essentialWithdrawal: WithdrawConsentDto = {
        ...mockWithdrawConsentDto,
        purpose: ConsentPurpose.ESSENTIAL_SERVICES,
      };

      await expect(
        service.withdrawConsent(essentialWithdrawal),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update analytics consent status', async () => {
      const analyticsWithdrawal: WithdrawConsentDto = {
        ...mockWithdrawConsentDto,
        purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
      };

      await service.withdrawConsent(analyticsWithdrawal);

      expect(mockUserProfile.analyticsConsent).toBe(ConsentStatus.WITHDRAWN);
    });

    it('should handle save errors', async () => {
      mockUserProfile.save.mockRejectedValue(new Error('Save failed'));

      await expect(
        service.withdrawConsent(mockWithdrawConsentDto),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('getConsentStatus', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      userProfileModelMock.findOne.mockResolvedValue(mockUserProfile);
    });

    it('should get consent status successfully', async () => {
      const result = await service.getConsentStatus(mockUserId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(mockUserId);
    });

    it('should throw NotFoundException when user not found', async () => {
      userProfileModelMock.findOne.mockResolvedValue(null);

      await expect(service.getConsentStatus(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return purposes with correct structure', async () => {
      const result = await service.getConsentStatus(mockUserId);

      expect(result.purposes).toBeDefined();
      expect(Array.isArray(result.purposes)).toBe(true);
      expect(result.purposes.length).toBeGreaterThan(0);
    });

    it('should mark essential services as non-withdrawable', async () => {
      const result = await service.getConsentStatus(mockUserId);

      const essentialPurpose = result.purposes.find(
        (p) => p.purpose === ConsentPurpose.ESSENTIAL_SERVICES,
      );
      expect(essentialPurpose?.canWithdraw).toBe(false);
    });

    it('should mark marketing as withdrawable', async () => {
      const result = await service.getConsentStatus(mockUserId);

      const marketingPurpose = result.purposes.find(
        (p) => p.purpose === ConsentPurpose.MARKETING_COMMUNICATIONS,
      );
      expect(marketingPurpose?.canWithdraw).toBe(true);
    });

    it('should include lastUpdated timestamp', async () => {
      const result = await service.getConsentStatus(mockUserId);

      expect(result.lastUpdated).toBeDefined();
      expect(result.lastUpdated instanceof Date).toBe(true);
    });

    it('should include needsRenewal flag', async () => {
      const result = await service.getConsentStatus(mockUserId);

      expect(typeof result.needsRenewal).toBe('boolean');
    });
  });

  describe('getDefaultDataCategories', () => {
    it('should return categories for ESSENTIAL_SERVICES', () => {
      const categories = service.getDefaultDataCategories(
        ConsentPurpose.ESSENTIAL_SERVICES,
      );

      expect(categories).toContain(DataCategory.AUTHENTICATION);
      expect(categories).toContain(DataCategory.PROFILE_INFORMATION);
    });

    it('should return categories for MARKETING_COMMUNICATIONS', () => {
      const categories = service.getDefaultDataCategories(
        ConsentPurpose.MARKETING_COMMUNICATIONS,
      );

      expect(categories).toContain(DataCategory.COMMUNICATION_PREFERENCES);
      expect(categories).toContain(DataCategory.PROFILE_INFORMATION);
    });

    it('should return categories for BEHAVIORAL_ANALYTICS', () => {
      const categories = service.getDefaultDataCategories(
        ConsentPurpose.BEHAVIORAL_ANALYTICS,
      );

      expect(categories).toContain(DataCategory.BEHAVIORAL_DATA);
      expect(categories).toContain(DataCategory.DEVICE_INFORMATION);
    });

    it('should return GENERAL for unknown purposes', () => {
      const categories = service.getDefaultDataCategories(
        'unknown_purpose' as ConsentPurpose,
      );

      expect(categories).toContain(DataCategory.GENERAL);
    });

    it('should return all defined purposes', () => {
      const purposes = Object.values(ConsentPurpose);
      purposes.forEach((purpose) => {
        const categories = service.getDefaultDataCategories(purpose);
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getLegalBasisForPurpose', () => {
    it('should return Article 6(1)(b) for essential services', () => {
      const basis = service.getLegalBasisForPurpose(
        ConsentPurpose.ESSENTIAL_SERVICES,
      );

      expect(basis).toContain('Article 6(1)(b)');
    });

    it('should return Article 6(1)(a) for consent-based purposes', () => {
      const basis = service.getLegalBasisForPurpose(
        ConsentPurpose.BEHAVIORAL_ANALYTICS,
      );

      expect(basis).toContain('Article 6(1)(a)');
    });

    it('should return Article 6(1)(f) for legitimate interests', () => {
      const basis = service.getLegalBasisForPurpose(
        ConsentPurpose.FUNCTIONAL_ANALYTICS,
      );

      expect(basis).toContain('Article 6(1)(f)');
    });

    it('should return default for unknown purposes', () => {
      const basis = service.getLegalBasisForPurpose(
        'unknown' as ConsentPurpose,
      );

      expect(basis).toContain('Article 6(1)(f)');
    });
  });

  describe('hasConsentForEssentialProcessing', () => {
    it('should return true when essential consent is granted', () => {
      const records = [
        {
          purpose: ConsentPurpose.ESSENTIAL_SERVICES,
          status: ConsentStatus.GRANTED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForEssentialProcessing(records)).toBe(true);
    });

    it('should return false when essential consent is denied', () => {
      const records = [
        {
          purpose: ConsentPurpose.ESSENTIAL_SERVICES,
          status: ConsentStatus.DENIED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForEssentialProcessing(records)).toBe(false);
    });

    it('should return false when no essential record exists', () => {
      const records = [
        {
          purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
          status: ConsentStatus.GRANTED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForEssentialProcessing(records)).toBe(false);
    });

    it('should return false for empty records', () => {
      expect(service.hasConsentForEssentialProcessing([])).toBe(false);
    });
  });

  describe('hasConsentForMarketing', () => {
    it('should return true when marketing consent is granted', () => {
      const records = [
        {
          purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
          status: ConsentStatus.GRANTED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForMarketing(records)).toBe(true);
    });

    it('should return false when marketing consent is denied', () => {
      const records = [
        {
          purpose: ConsentPurpose.MARKETING_COMMUNICATIONS,
          status: ConsentStatus.DENIED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForMarketing(records)).toBe(false);
    });
  });

  describe('hasConsentForAnalytics', () => {
    it('should return true when analytics consent is granted', () => {
      const records = [
        {
          purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
          status: ConsentStatus.GRANTED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForAnalytics(records)).toBe(true);
    });

    it('should return false when analytics consent is denied', () => {
      const records = [
        {
          purpose: ConsentPurpose.BEHAVIORAL_ANALYTICS,
          status: ConsentStatus.DENIED,
        },
      ] as ConsentRecord[];

      expect(service.hasConsentForAnalytics(records)).toBe(false);
    });
  });

  describe('checkConsentRenewalNeeded', () => {
    it('should return false for recently updated profile', () => {
      const profile = {
        updatedAt: new Date(),
      };

      expect(service.checkConsentRenewalNeeded(profile as any)).toBe(false);
    });

    it('should return true for profile updated more than a year ago', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);

      const profile = {
        updatedAt: oldDate,
      };

      expect(service.checkConsentRenewalNeeded(profile as any)).toBe(true);
    });

    it('should return false for profile exactly one year old', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const profile = {
        updatedAt: oneYearAgo,
      };

      expect(service.checkConsentRenewalNeeded(profile as any)).toBe(false);
    });
  });
});
