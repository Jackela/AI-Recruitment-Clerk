import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { DataErasureService } from './data-erasure.service';
import { UserProfile } from '../../schemas/user-profile.schema';
import type {
  NatsClient,
  ErasureEligibilityResult,
} from '@ai-recruitment-clerk/shared-dtos';
import type { Model } from 'mongoose';
import { ForbiddenException } from '@nestjs/common';

describe('DataErasureService', () => {
  let service: DataErasureService;
  let userProfileModelMock: jest.Mocked<Model<any>>;
  let natsClientMock: jest.Mocked<NatsClient>;

  beforeEach(async () => {
    userProfileModelMock = {
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    } as unknown as jest.Mocked<Model<any>>;

    natsClientMock = {
      publish: jest.fn().mockResolvedValue(undefined),
      request: jest.fn(),
    } as unknown as jest.Mocked<NatsClient>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataErasureService,
        {
          provide: getModelToken(UserProfile.name),
          useValue: userProfileModelMock,
        },
      ],
    }).compile();

    service = module.get<DataErasureService>(DataErasureService);
  });

  describe('Service Creation', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('cascadeDataDeletion', () => {
    const mockUserId = 'user-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cascade data deletion successfully', async () => {
      await service.cascadeDataDeletion(mockUserId, undefined, natsClientMock);

      expect(userProfileModelMock.deleteOne).toHaveBeenCalledWith({
        userId: mockUserId,
      });
    });

    it('should delete user profile from gateway', async () => {
      await service.cascadeDataDeletion(mockUserId, undefined, natsClientMock);

      expect(userProfileModelMock.deleteOne).toHaveBeenCalledTimes(1);
    });

    it('should notify all services when NATS client provided', async () => {
      await service.cascadeDataDeletion(mockUserId, undefined, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'user.data.delete',
        expect.objectContaining({
          userId: mockUserId,
          specificCategories: undefined,
        }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'resume-parser.data.delete',
        expect.objectContaining({ userId: mockUserId }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'scoring-engine.data.delete',
        expect.objectContaining({ userId: mockUserId }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'report-generator.data.delete',
        expect.objectContaining({ userId: mockUserId }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'jd-extractor.data.delete',
        expect.objectContaining({ userId: mockUserId }),
      );
      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'analytics.data.delete',
        expect.objectContaining({ userId: mockUserId }),
      );
    });

    it('should notify services with specific categories', async () => {
      const categories = ['user_profile', 'resume_data'];
      await service.cascadeDataDeletion(mockUserId, categories, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'user.data.delete',
        expect.objectContaining({
          userId: mockUserId,
          specificCategories: categories,
        }),
      );
    });

    it('should log data erasure for audit', async () => {
      await service.cascadeDataDeletion(mockUserId, undefined, natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'audit.data_erasure',
        expect.objectContaining({
          userId: mockUserId,
          specificCategories: undefined,
          timestamp: expect.any(String),
          action: 'data_deleted',
        }),
      );
    });

    it('should not notify services when NATS client is undefined', async () => {
      await service.cascadeDataDeletion(mockUserId);

      expect(natsClientMock.publish).not.toHaveBeenCalled();
    });

    it('should throw error when delete operation fails', async () => {
      userProfileModelMock.deleteOne.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.cascadeDataDeletion(mockUserId, undefined, natsClientMock),
      ).rejects.toThrow('Database error');
    });

    it('should throw error when NATS publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('NATS error'));

      await expect(
        service.cascadeDataDeletion(mockUserId, undefined, natsClientMock),
      ).rejects.toThrow('NATS error');
    });
  });

  describe('checkErasureEligibility', () => {
    const mockUserId = 'user-123';

    it('should return eligible when no blockers', async () => {
      natsClientMock.request.mockResolvedValue(null);

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(true);
    });

    it('should return eligible without NATS client', async () => {
      const result = await service.checkErasureEligibility(mockUserId);

      expect(result.eligible).toBe(true);
    });

    it('should check with other services via NATS', async () => {
      await service.checkErasureEligibility(mockUserId, natsClientMock);

      expect(natsClientMock.request).toHaveBeenCalledWith(
        'erasure.eligibility.check',
        { userId: mockUserId },
        5000,
      );
    });

    it('should return not eligible when service returns ineligible', async () => {
      natsClientMock.request.mockResolvedValue({
        eligible: false,
        reason: 'Active subscription',
      });

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Active subscription');
    });

    it('should return not eligible with default reason when service returns ineligible without reason', async () => {
      natsClientMock.request.mockResolvedValue({
        eligible: false,
      });

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Eligibility check failed');
    });

    it('should return not eligible on error', async () => {
      natsClientMock.request.mockRejectedValue(new Error('Service error'));

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Unable to verify eligibility');
    });

    it('should handle non-object responses', async () => {
      natsClientMock.request.mockResolvedValue('invalid response');

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(true);
    });

    it('should handle null response', async () => {
      natsClientMock.request.mockResolvedValue(null);

      const result = await service.checkErasureEligibility(
        mockUserId,
        natsClientMock,
      );

      expect(result.eligible).toBe(true);
    });
  });

  describe('checkCategoryErasureEligibility', () => {
    const mockUserId = 'user-123';

    it('should return eligible for regular categories', async () => {
      const result = await service.checkCategoryErasureEligibility(
        mockUserId,
        'user_profile',
        natsClientMock,
      );

      expect(result.eligible).toBe(true);
    });

    it('should return not eligible for protected categories', async () => {
      const protectedCategories = [
        'transaction_records',
        'legal_documents',
        'audit_logs',
      ];

      for (const category of protectedCategories) {
        const result = await service.checkCategoryErasureEligibility(
          mockUserId,
          category,
          natsClientMock,
        );

        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('protected');
      }
    });

    it('should notify services when checking category', async () => {
      await service.checkCategoryErasureEligibility(
        mockUserId,
        'user_profile',
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'erasure.category.check',
        {
          userId: mockUserId,
          category: 'user_profile',
        },
      );
    });

    it('should not notify services when NATS client undefined', async () => {
      await service.checkCategoryErasureEligibility(mockUserId, 'user_profile');

      expect(natsClientMock.publish).not.toHaveBeenCalled();
    });

    it('should return not eligible on error', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Service error'));

      const result = await service.checkCategoryErasureEligibility(
        mockUserId,
        'user_profile',
        natsClientMock,
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Unable to verify category eligibility');
    });
  });

  describe('deleteSpecificCategories', () => {
    const mockUserId = 'user-123';
    const mockCategories = ['user_profile', 'resume_data'];

    it('should delete specific categories successfully', async () => {
      await service.deleteSpecificCategories(
        mockUserId,
        mockCategories,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'user.data.categories.delete',
        {
          userId: mockUserId,
          categories: mockCategories,
        },
      );
    });

    it('should not notify when NATS client undefined', async () => {
      await service.deleteSpecificCategories(mockUserId, mockCategories);

      expect(natsClientMock.publish).not.toHaveBeenCalled();
    });

    it('should throw error when publish fails', async () => {
      natsClientMock.publish.mockRejectedValue(new Error('Publish error'));

      await expect(
        service.deleteSpecificCategories(
          mockUserId,
          mockCategories,
          natsClientMock,
        ),
      ).rejects.toThrow('Publish error');
    });

    it('should handle empty categories array', async () => {
      await service.deleteSpecificCategories(mockUserId, [], natsClientMock);

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'user.data.categories.delete',
        {
          userId: mockUserId,
          categories: [],
        },
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      userProfileModelMock.deleteOne.mockRejectedValue(
        new Error('Connection lost'),
      );

      await expect(
        service.cascadeDataDeletion('user-123', undefined, natsClientMock),
      ).rejects.toThrow('Connection lost');
    });

    it('should handle non-Error exceptions', async () => {
      userProfileModelMock.deleteOne.mockImplementation(() => {
        throw 'String error';
      });

      await expect(
        service.cascadeDataDeletion('user-123', undefined, natsClientMock),
      ).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user ID with special characters', async () => {
      const specialUserId = 'user-123@test.com';

      await service.cascadeDataDeletion(
        specialUserId,
        undefined,
        natsClientMock,
      );

      expect(userProfileModelMock.deleteOne).toHaveBeenCalledWith({
        userId: specialUserId,
      });
    });

    it('should handle very long category list', async () => {
      const longCategoryList = Array(100).fill('category');

      await service.deleteSpecificCategories(
        'user-123',
        longCategoryList,
        natsClientMock,
      );

      expect(natsClientMock.publish).toHaveBeenCalledWith(
        'user.data.categories.delete',
        expect.objectContaining({
          categories: longCategoryList,
        }),
      );
    });
  });
});
