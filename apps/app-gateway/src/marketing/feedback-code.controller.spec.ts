import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackCodeController } from './feedback-code.controller';
import type { FeedbackCodeService } from './feedback-code.service';
import type {
  CreateFeedbackCodeDto,
  MarkFeedbackCodeUsedDto,
} from './feedback-code.service';

interface MockRequest {
  get: jest.Mock;
  connection: { remoteAddress: string };
  socket: { remoteAddress: string };
  [key: string]: unknown;
}

const createRequest = (overrides: Record<string, unknown> = {}): MockRequest =>
  ({
    get: jest.fn().mockImplementation((header: string) => {
      if (header === 'User-Agent') {
        return 'jest-agent';
      }
      if (header === 'X-Forwarded-For') {
        return undefined;
      }
      return null;
    }),
    connection: { remoteAddress: '192.0.2.1' },
    socket: { remoteAddress: '192.0.2.1' },
    ...overrides,
  });

const createService = (): jest.Mocked<FeedbackCodeService> =>
  ({
    recordFeedbackCode: jest.fn(),
    validateFeedbackCode: jest.fn(),
    markFeedbackCodeAsUsed: jest.fn(),
    markAsUsed: jest.fn(),
    getFeedbackCodeDetails: jest.fn(),
    getMarketingStats: jest.fn(),
    handleFeedbackWebhook: jest.fn(),
  } as unknown as jest.Mocked<FeedbackCodeService>);

describe('FeedbackCodeController (lightweight)', () => {
  let controller: FeedbackCodeController;
  let service: jest.Mocked<FeedbackCodeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
    controller = new FeedbackCodeController(service);
  });

  describe('recordFeedbackCode', () => {
    const dto: CreateFeedbackCodeDto = { code: 'FB123456789ABCD' };

    it('records code with client metadata', async () => {
      const request = createRequest({
        get: jest
          .fn()
          .mockImplementation((header: string) =>
            header === 'User-Agent' ? 'jest-agent' : '198.51.100.5',
          ),
      });
      interface FeedbackCodeRecord {
        id: string;
        code: string;
        generatedAt: Date;
        isUsed: boolean;
        paymentStatus: string;
      }
      service.recordFeedbackCode.mockResolvedValue({
        id: 'doc-1',
        code: dto.code,
        generatedAt: new Date('2024-01-01T00:00:00Z'),
        isUsed: false,
        paymentStatus: 'pending',
      } as any);

      const result = await controller.recordFeedbackCode(dto, request as any);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe(dto.code);
      expect(service.recordFeedbackCode).toHaveBeenCalledWith(
        dto,
        expect.objectContaining({
          ipAddress: expect.stringContaining('198.51.100.5'),
          userAgent: 'jest-agent',
        }),
      );
    });

    it('rejects invalid request payloads', async () => {
      await expect(
        controller.recordFeedbackCode(
          { code: '123' },
          createRequest() as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('surfacing service errors', async () => {
      service.recordFeedbackCode.mockRejectedValue(new Error('db error'));

      await expect(
        controller.recordFeedbackCode(dto, createRequest() as any),
      ).rejects.toThrow('db error');
    });
  });

  describe('validateFeedbackCode', () => {
    it('returns validation outcome from service', async () => {
      service.validateFeedbackCode.mockResolvedValue(true);

      const result = await controller.validateFeedbackCode('FB-OK');

      expect(result).toEqual(
        expect.objectContaining({ code: 'FB-OK', valid: true }),
      );
      expect(service.validateFeedbackCode).toHaveBeenCalledWith('FB-OK');
    });

    it('handles invalid codes', async () => {
      service.validateFeedbackCode.mockResolvedValue(false);

      const result = await controller.validateFeedbackCode('FB-BAD');

      expect(result.valid).toBe(false);
    });
  });

  describe('markFeedbackCodeAsUsed', () => {
    const dto: MarkFeedbackCodeUsedDto = {
      code: 'FB123456789ABCD',
      alipayAccount: 'user@example.com',
    };

    it('marks a code as used and returns summary', async () => {
      interface MarkUsedResult {
        code: string;
        paymentStatus: string;
        qualityScore: number;
      }
      service.markFeedbackCodeAsUsed.mockResolvedValue({
        code: dto.code,
        paymentStatus: 'pending',
        qualityScore: 0.9,
        generatedAt: new Date('2024-01-01T00:00:00Z'),
        isUsed: true,
      } as any);

      const result = await controller.markFeedbackCodeAsUsed(dto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe(dto.code);
      expect(service.markFeedbackCodeAsUsed).toHaveBeenCalledWith(dto);
    });

    it('translates service failures into NotFoundException', async () => {
      service.markFeedbackCodeAsUsed.mockRejectedValue(
        new Error('无效或已使用'),
      );

      await expect(
        controller.markFeedbackCodeAsUsed(dto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsUsed alias', () => {
    const dto: MarkFeedbackCodeUsedDto = {
      code: 'FB0001',
      alipayAccount: '13800138000',
    };

    it('uses simplified alias handler', async () => {
      (service.markAsUsed as any).mockResolvedValue({
        code: dto.code,
        qualityScore: 0.6,
        paymentStatus: 'pending',
      });

      const result = await controller.markAsUsed(dto);

      expect(result.success).toBe(true);
      expect(result.data.code).toBe(dto.code);
      expect(service.markAsUsed).toHaveBeenCalledWith(dto);
    });

    it('validates required fields', async () => {
      await expect(
        controller.markAsUsed({ code: '', alipayAccount: '' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPublicStats', () => {
    it('returns stats from service', async () => {
      service.getMarketingStats.mockResolvedValue({
        totalCodes: 10,
        usedCodes: 5,
        pendingPayments: 2,
        totalPaid: 6,
        averageQualityScore: 0.8,
      });

      const result = await controller.getPublicStats();

      expect(result.totalParticipants).toBe(5);
      expect(service.getMarketingStats).toHaveBeenCalled();
    });
  });

  describe('helpers', () => {
    it('derives session id from code suffix', () => {
      const sessionId = (controller as any).extractSessionId('FB123456');
      expect(sessionId).toBe('3456');
    });

    it('validates simple alipay patterns', () => {
      expect((controller as any).isValidAlipayAccount('user@example.com')).toBe(
        true,
      );
      expect((controller as any).isValidAlipayAccount('13800138000')).toBe(
        true,
      );
      expect((controller as any).isValidAlipayAccount('bad-account')).toBe(
        false,
      );
    });
  });
});
