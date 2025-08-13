import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { GuestController } from './guest.controller';
import { GuestUsageService } from '../services/guest-usage.service';
import { RequestWithDeviceId } from '../guards/guest.guard';

describe('GuestController', () => {
  let controller: GuestController;
  let guestUsageService: jest.Mocked<GuestUsageService>;

  const mockGuestUsageService = {
    generateFeedbackCode: jest.fn(),
    getUsageStatus: jest.fn(),
    getGuestStatus: jest.fn(),
    redeemFeedbackCode: jest.fn(),
    canUse: jest.fn(),
    getServiceStats: jest.fn(),
  };

  const mockRequest: RequestWithDeviceId = {
    deviceId: 'test-device-123',
    isGuest: true,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestController],
      providers: [
        {
          provide: GuestUsageService,
          useValue: mockGuestUsageService,
        },
      ],
    }).compile();

    controller = module.get<GuestController>(GuestController);
    guestUsageService = module.get(GuestUsageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateFeedbackCode', () => {
    it('should generate feedback code successfully', async () => {
      const mockFeedbackCode = 'fb-test-12345';
      const mockSurveyUrl = 'https://wj.qq.com/s2/test?code=fb-test-12345';
      
      guestUsageService.generateFeedbackCode.mockResolvedValue(mockFeedbackCode);
      process.env.GUEST_FEEDBACK_URL = 'https://wj.qq.com/s2/test';

      const result = await controller.generateFeedbackCode(mockRequest);

      expect(result).toEqual({
        feedbackCode: mockFeedbackCode,
        surveyUrl: mockSurveyUrl,
        message: '请复制此码，并点击下方链接前往问卷填写。提交成功后，您将获得奖励和新的使用次数！',
      });
      expect(guestUsageService.generateFeedbackCode).toHaveBeenCalledWith('test-device-123');
    });

    it('should handle service errors', async () => {
      guestUsageService.generateFeedbackCode.mockRejectedValue(
        new Error('Feedback code not needed')
      );

      await expect(controller.generateFeedbackCode(mockRequest))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getUsageStatus', () => {
    it('should return usage status successfully', async () => {
      const mockStatus = {
        canUse: true,
        remainingCount: 3,
        needsFeedbackCode: false,
      };

      guestUsageService.getUsageStatus.mockResolvedValue(mockStatus);

      const result = await controller.getUsageStatus(mockRequest);

      expect(result).toEqual(mockStatus);
      expect(guestUsageService.getUsageStatus).toHaveBeenCalledWith('test-device-123');
    });

    it('should handle service errors', async () => {
      guestUsageService.getUsageStatus.mockRejectedValue(new Error('Service error'));

      await expect(controller.getUsageStatus(mockRequest))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getGuestDetails', () => {
    it('should return guest details successfully', async () => {
      const mockDetails = {
        deviceId: 'test-device-123',
        usageCount: 2,
        maxUsage: 5,
        isLimited: false,
        lastUsed: new Date(),
      };

      guestUsageService.getGuestStatus.mockResolvedValue(mockDetails);

      const result = await controller.getGuestDetails(mockRequest);

      expect(result).toEqual(mockDetails);
      expect(guestUsageService.getGuestStatus).toHaveBeenCalledWith('test-device-123');
    });
  });

  describe('redeemFeedbackCode', () => {
    it('should redeem feedback code successfully', async () => {
      const redeemDto = { feedbackCode: 'fb-test-12345' };
      guestUsageService.redeemFeedbackCode.mockResolvedValue(true);

      const result = await controller.redeemFeedbackCode(redeemDto);

      expect(result).toEqual({
        success: true,
        message: '反馈码兑换成功！您已获得5次新的免费使用次数。',
      });
      expect(guestUsageService.redeemFeedbackCode).toHaveBeenCalledWith('fb-test-12345');
    });

    it('should handle invalid feedback code', async () => {
      const redeemDto = { feedbackCode: 'invalid-code' };
      guestUsageService.redeemFeedbackCode.mockRejectedValue(
        new Error('Invalid feedback code')
      );

      await expect(controller.redeemFeedbackCode(redeemDto))
        .rejects.toThrow(HttpException);
    });
  });

  describe('getServiceStats', () => {
    it('should return service statistics', async () => {
      const mockStats = {
        totalGuests: 100,
        activeGuests: 50,
        pendingFeedbackCodes: 10,
        redeemedFeedbackCodes: 25,
      };

      guestUsageService.getServiceStats.mockResolvedValue(mockStats);

      const result = await controller.getServiceStats();

      expect(result).toEqual(mockStats);
      expect(guestUsageService.getServiceStats).toHaveBeenCalled();
    });
  });

  describe('checkUsage', () => {
    it('should allow usage when under limit', async () => {
      guestUsageService.canUse.mockResolvedValue(true);

      const result = await controller.checkUsage(mockRequest);

      expect(result).toEqual({
        canUse: true,
        message: 'Service usage allowed',
      });
      expect(guestUsageService.canUse).toHaveBeenCalledWith('test-device-123');
    });

    it('should throw 429 when usage limit exceeded', async () => {
      guestUsageService.canUse.mockResolvedValue(false);

      await expect(controller.checkUsage(mockRequest))
        .rejects.toThrow(HttpException);
      
      try {
        await controller.checkUsage(mockRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(error.getResponse()).toMatchObject({
          canUse: false,
          message: '免费次数已用完！参与问卷反馈(奖励￥3现金)可再获5次使用权！',
          needsFeedbackCode: true,
        });
      }
    });

    it('should handle service errors', async () => {
      guestUsageService.canUse.mockRejectedValue(new Error('Database error'));

      await expect(controller.checkUsage(mockRequest))
        .rejects.toThrow(HttpException);
    });
  });
});