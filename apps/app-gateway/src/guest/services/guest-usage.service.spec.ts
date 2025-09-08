import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GuestUsageService } from './guest-usage.service';
import { GuestUsage, GuestUsageDocument } from '../schemas/guest-usage.schema';
import { BadRequestException } from '@nestjs/common';

describe('GuestUsageService', () => {
  let service: GuestUsageService;
  let model: Model<GuestUsageDocument>;

  const mockGuestUsageModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockGuestUsage = {
    deviceId: 'test-device-123',
    usageCount: 2,
    feedbackCode: null,
    feedbackCodeStatus: null,
    lastUsed: new Date(),
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestUsageService,
        {
          provide: getModelToken(GuestUsage.name),
          useValue: mockGuestUsageModel,
        },
      ],
    }).compile();

    service = module.get<GuestUsageService>(GuestUsageService);
    model = module.get<Model<GuestUsageDocument>>(
      getModelToken(GuestUsage.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canUse', () => {
    it('should create new user and return true for first-time user', async () => {
      mockGuestUsageModel.findOne.mockResolvedValue(null);
      mockGuestUsageModel.create.mockResolvedValue(mockGuestUsage);

      const result = await service.canUse('test-device-123');

      expect(result).toBe(true);
      expect(mockGuestUsageModel.findOne).toHaveBeenCalledWith({
        deviceId: 'test-device-123',
      });
      expect(mockGuestUsageModel.create).toHaveBeenCalledWith({
        deviceId: 'test-device-123',
        usageCount: 1,
        lastUsed: expect.any(Date),
      });
    });

    it('should increment usage and return true when under limit', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 3 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);
      mockGuestUsageModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.canUse('test-device-123');

      expect(result).toBe(true);
      expect(mockGuestUsageModel.updateOne).toHaveBeenCalledWith(
        { deviceId: 'test-device-123' },
        {
          $inc: { usageCount: 1 },
          $set: { lastUsed: expect.any(Date) },
        },
      );
    });

    it('should return false when usage limit exceeded', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 5 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);

      const result = await service.canUse('test-device-123');

      expect(result).toBe(false);
      expect(mockGuestUsageModel.updateOne).not.toHaveBeenCalled();
    });

    it('should reset usage when feedback code is redeemed', async () => {
      const mockUser = {
        ...mockGuestUsage,
        usageCount: 5,
        feedbackCode: 'fb-code-123',
        feedbackCodeStatus: 'redeemed',
      };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);
      mockGuestUsageModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.canUse('test-device-123');

      expect(result).toBe(true);
      expect(mockGuestUsageModel.updateOne).toHaveBeenCalledWith(
        { deviceId: 'test-device-123' },
        {
          $set: {
            usageCount: 1,
            feedbackCode: null,
            feedbackCodeStatus: null,
            lastUsed: expect.any(Date),
          },
        },
      );
    });
  });

  describe('generateFeedbackCode', () => {
    it('should generate feedback code when usage limit reached', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 5 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);
      mockGuestUsageModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.generateFeedbackCode('test-device-123');

      expect(result).toMatch(/^fb-/);
      expect(mockGuestUsageModel.updateOne).toHaveBeenCalledWith(
        { deviceId: 'test-device-123' },
        {
          $set: {
            feedbackCode: expect.stringMatching(/^fb-/),
            feedbackCodeStatus: 'generated',
            updatedAt: expect.any(Date),
          },
        },
      );
    });

    it('should return existing feedback code if already generated', async () => {
      const existingCode = 'fb-existing-code';
      const mockUser = {
        ...mockGuestUsage,
        usageCount: 5,
        feedbackCode: existingCode,
        feedbackCodeStatus: 'generated',
      };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);

      const result = await service.generateFeedbackCode('test-device-123');

      expect(result).toBe(existingCode);
      expect(mockGuestUsageModel.updateOne).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      mockGuestUsageModel.findOne.mockResolvedValue(null);

      await expect(
        service.generateFeedbackCode('test-device-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if usage limit not reached', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 3 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);

      await expect(
        service.generateFeedbackCode('test-device-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('redeemFeedbackCode', () => {
    it('should successfully redeem valid feedback code', async () => {
      const mockUser = {
        ...mockGuestUsage,
        feedbackCode: 'fb-valid-code',
        feedbackCodeStatus: 'generated',
      };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);
      mockGuestUsageModel.updateOne.mockResolvedValue({ acknowledged: true });

      const result = await service.redeemFeedbackCode('fb-valid-code');

      expect(result).toBe(true);
      expect(mockGuestUsageModel.updateOne).toHaveBeenCalledWith(
        { feedbackCode: 'fb-valid-code' },
        {
          $set: {
            feedbackCodeStatus: 'redeemed',
            updatedAt: expect.any(Date),
          },
        },
      );
    });

    it('should throw error for invalid feedback code', async () => {
      mockGuestUsageModel.findOne.mockResolvedValue(null);

      await expect(service.redeemFeedbackCode('invalid-code')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUsageStatus', () => {
    it('should return status for new user', async () => {
      mockGuestUsageModel.findOne.mockResolvedValue(null);

      const result = await service.getUsageStatus('test-device-123');

      expect(result).toEqual({
        canUse: true,
        remainingCount: 5,
        needsFeedbackCode: false,
      });
    });

    it('should return status for existing user', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 3 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);

      const result = await service.getUsageStatus('test-device-123');

      expect(result).toEqual({
        canUse: true,
        remainingCount: 2,
        needsFeedbackCode: false,
      });
    });

    it('should return status for user at limit', async () => {
      const mockUser = { ...mockGuestUsage, usageCount: 5 };
      mockGuestUsageModel.findOne.mockResolvedValue(mockUser);

      const result = await service.getUsageStatus('test-device-123');

      expect(result).toEqual({
        canUse: false,
        remainingCount: 0,
        needsFeedbackCode: true,
      });
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete old records', async () => {
      mockGuestUsageModel.deleteMany.mockResolvedValue({ deletedCount: 5 });

      const result = await service.cleanupOldRecords(30);

      expect(result).toBe(5);
      expect(mockGuestUsageModel.deleteMany).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) },
        feedbackCodeStatus: { $ne: 'generated' },
      });
    });
  });

  describe('getServiceStats', () => {
    it('should return service statistics', async () => {
      mockGuestUsageModel.countDocuments
        .mockResolvedValueOnce(100) // totalGuests
        .mockResolvedValueOnce(50) // activeGuests
        .mockResolvedValueOnce(10) // pendingFeedbackCodes
        .mockResolvedValueOnce(25); // redeemedFeedbackCodes

      const result = await service.getServiceStats();

      expect(result).toEqual({
        totalGuests: 100,
        activeGuests: 50,
        pendingFeedbackCodes: 10,
        redeemedFeedbackCodes: 25,
      });
    });
  });
});
