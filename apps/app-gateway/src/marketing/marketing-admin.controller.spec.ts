import { BadRequestException } from '@nestjs/common';
import { MarketingAdminController } from './marketing-admin.controller';
import { FeedbackCodeService, FeedbackCodeDto } from './feedback-code.service';

type BatchPaymentPayload = {
  codes: string[];
  action: 'approve' | 'reject';
  reason?: string;
};

const createService = (): jest.Mocked<FeedbackCodeService> =>
  ({
    getMarketingStats: jest.fn(),
    getPendingPayments: jest.fn(),
    batchUpdatePaymentStatus: jest.fn(),
    updatePaymentStatus: jest.fn(),
    cleanupExpiredCodes: jest.fn(),
    recordFeedbackCode: jest.fn(),
    validateFeedbackCode: jest.fn(),
    markFeedbackCodeAsUsed: jest.fn(),
    markAsUsed: jest.fn(),
    getFeedbackCodeDetails: jest.fn(),
  } as unknown as jest.Mocked<FeedbackCodeService>);

describe('MarketingAdminController (mocked)', () => {
  let controller: MarketingAdminController;
  let service: jest.Mocked<FeedbackCodeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createService();
    controller = new MarketingAdminController(service);
  });

  describe('getDashboardStats', () => {
    it('maps stats into dashboard response', async () => {
      service.getMarketingStats.mockResolvedValue({
        totalCodes: 100,
        usedCodes: 80,
        pendingPayments: 10,
        totalPaid: 210,
        averageQualityScore: 0.876,
      });

      const result = await controller.getDashboardStats();

      expect(result.overview.totalCodes).toBe(100);
      expect(result.overview.averageQualityScore).toBe(0.88);
      expect(result.conversion.usageRate).toBeGreaterThan(70);
      expect(service.getMarketingStats).toHaveBeenCalled();
    });
  });

  describe('getPendingPayments', () => {
    it('applies sorting and pagination', async () => {
      const pending: FeedbackCodeDto[] = [
        { code: 'B', usedAt: new Date('2024-01-02'), paymentStatus: 'pending', generatedAt: new Date(), isUsed: true },
        { code: 'A', usedAt: new Date('2024-01-03'), paymentStatus: 'pending', generatedAt: new Date(), isUsed: true },
        { code: 'C', usedAt: new Date('2024-01-01'), paymentStatus: 'pending', generatedAt: new Date(), isUsed: true },
      ];
      service.getPendingPayments.mockResolvedValue(pending);

      const result = await controller.getPendingPayments('1', '2', 'usedAt', 'desc');

      expect(result.data).toHaveLength(2);
      expect(result.data[0].code).toBe('A');
      expect(result.pagination).toEqual(
        expect.objectContaining({ total: 3, page: 1, limit: 2 }),
      );
    });
  });

  describe('processBatchPayment', () => {
    it('delegates batch update to service', async () => {
      service.batchUpdatePaymentStatus.mockResolvedValue(2);

      const response = await controller.processBatchPayment({
        codes: ['FB1', 'FB2'],
        action: 'approve',
      });

      expect(service.batchUpdatePaymentStatus).toHaveBeenCalledWith(
        ['FB1', 'FB2'],
        'paid',
        undefined,
      );
      expect(response.success).toBe(true);
      expect(response.processedCount).toBe(2);
    });

    it('validates action payload', async () => {
      const invalidPayload = { codes: ['FB'], action: 'invalid' } as unknown as BatchPaymentPayload;
      await expect(controller.processBatchPayment(invalidPayload)).rejects.toThrow(BadRequestException);
    });
  });

  describe('processSinglePayment', () => {
    it('updates status for a single code', async () => {
      service.updatePaymentStatus.mockResolvedValue({
        code: 'FB1',
        paymentStatus: 'paid',
        generatedAt: new Date(),
        isUsed: true,
      });

      const result = await controller.processSinglePayment('FB1', 'approve', 'ok');

      expect(service.updatePaymentStatus).toHaveBeenCalledWith('FB1', 'paid', 'ok');
      expect(result.data.paymentStatus).toBe('paid');
    });
  });

  describe('performMaintenance', () => {
    it('invokes cleanup with parsed days', async () => {
      service.cleanupExpiredCodes.mockResolvedValue(5);

      const result = await controller.performMaintenance(7);

      expect(service.cleanupExpiredCodes).toHaveBeenCalledWith(7);
      expect(result.deletedCount).toBe(5);
    });
  });
});
