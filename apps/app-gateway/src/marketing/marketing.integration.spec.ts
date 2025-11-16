import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { FeedbackCodeController } from './feedback-code.controller';
import {
  CreateFeedbackCodeDto,
  MarkFeedbackCodeUsedDto,
  FeedbackCodeService,
} from './feedback-code.service';

type StoredCode = {
  code: string;
  generatedAt: Date;
  metadata?: Record<string, unknown>;
  isUsed: boolean;
};

const createStubService = () => {
  const store = new Map<string, StoredCode>();
  let paidCount = 0;

  return {
    async recordFeedbackCode(
      createDto: CreateFeedbackCodeDto,
      metadata?: Record<string, unknown>,
    ) {
      const existing = store.get(createDto.code);
      if (existing) {
        return { ...existing, id: existing.code };
      }
      const entry: StoredCode = {
        code: createDto.code,
        generatedAt: new Date(),
        metadata,
        isUsed: false,
      };
      store.set(createDto.code, entry);
      return { ...entry, id: createDto.code };
    },

    async validateFeedbackCode(code: string) {
      const entry = store.get(code);
      return !!entry && !entry.isUsed;
    },

    async markFeedbackCodeAsUsed(dto: MarkFeedbackCodeUsedDto) {
      const entry = store.get(dto.code);
      if (!entry || entry.isUsed) {
        throw new Error('无效或已使用');
      }
      entry.isUsed = true;
      paidCount += 1;
      return {
        code: entry.code,
        paymentStatus: 'pending',
        qualityScore: 0.8,
        alipayAccount: dto.alipayAccount,
      };
    },

    async markAsUsed(dto: MarkFeedbackCodeUsedDto) {
      return this.markFeedbackCodeAsUsed(dto);
    },

    async getMarketingStats() {
      const totalCodes = store.size;
      const usedCodes = Array.from(store.values()).filter((c) => c.isUsed).length;
      return {
        totalCodes,
        usedCodes,
        pendingPayments: usedCodes - paidCount,
        totalPaid: paidCount * 3,
        averageQualityScore: usedCodes ? 0.8 : 0,
      };
    },
  };
};

const createRequest = (): Request =>
  ({
    get: jest.fn().mockImplementation((header: string) => {
      if (header === 'User-Agent') {
        return 'jest-agent';
      }
      if (header === 'X-Forwarded-For') {
        return '198.51.100.24';
      }
      return undefined;
    }),
    connection: { remoteAddress: '198.51.100.24' },
    socket: { remoteAddress: '198.51.100.24' },
  } as unknown as Request);

describe('Marketing integration smoke tests (mocked)', () => {
  let controller: FeedbackCodeController;
  let service: ReturnType<typeof createStubService>;

  beforeEach(() => {
    service = createStubService();
    controller = new FeedbackCodeController(
      service as unknown as FeedbackCodeService,
    );
  });

  it('completes record → validate → mark flow using stub service', async () => {
    const dto: CreateFeedbackCodeDto = { code: 'FB123456789ABCD' };

    const recordResponse = await controller.recordFeedbackCode(
      dto,
      createRequest(),
    );
    expect(recordResponse.success).toBe(true);

    const validation = await controller.validateFeedbackCode(dto.code);
    expect(validation.valid).toBe(true);

    const markDto: MarkFeedbackCodeUsedDto = {
      code: dto.code,
      alipayAccount: 'user@example.com',
    };
    const markResponse = await controller.markFeedbackCodeAsUsed(markDto);
    expect(markResponse.success).toBe(true);
    expect(markResponse.data.paymentStatus).toBe('pending');

    const stats = await controller.getPublicStats();
    expect(stats.totalParticipants).toBe(1);
    expect(stats.totalRewards).toBe(3);
  });

  it('rejects invalid payloads consistently', async () => {
    await expect(
      controller.recordFeedbackCode({ code: '123' }, createRequest()),
    ).rejects.toThrow(BadRequestException);

    await expect(
      controller.markFeedbackCodeAsUsed({
        code: 'UNKNOWN',
        alipayAccount: 'user@example.com',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('ensures alias markAsUsed delegates to main handler', async () => {
    await controller.recordFeedbackCode(
      { code: 'FB0001' },
      createRequest(),
    );
    const result = await controller.markAsUsed({
      code: 'FB0001',
      alipayAccount: '13800138000',
    });

    expect(result.success).toBe(true);
    const stats = await service.getMarketingStats();
    expect(stats.usedCodes).toBe(1);
  });
});
