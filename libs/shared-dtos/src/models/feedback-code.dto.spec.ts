import {
  FeedbackCodeDto,
  CreateFeedbackCodeDto,
  MarkFeedbackCodeUsedDto,
  PaymentRequestDto,
  MarketingStatsDto,
} from './feedback-code.dto';

describe('FeedbackCodeDto', () => {
  describe('FeedbackCodeDto interface', () => {
    it('should accept valid feedback code', () => {
      const dto: FeedbackCodeDto = {
        id: 'feedback-123',
        code: 'REWARD2024',
        generatedAt: new Date('2024-01-01'),
        isUsed: false,
        paymentStatus: 'pending',
        createdBy: 'admin',
      };

      expect(dto.code).toBe('REWARD2024');
      expect(dto.isUsed).toBe(false);
      expect(dto.paymentStatus).toBe('pending');
    });

    it('should accept used feedback code', () => {
      const dto: FeedbackCodeDto = {
        id: 'feedback-456',
        code: 'REWARD2023',
        generatedAt: new Date('2023-12-01'),
        isUsed: true,
        usedAt: new Date('2024-01-15'),
        alipayAccount: '138****1234',
        questionnaireData: { score: 95, answers: ['A', 'B'] },
        paymentStatus: 'paid',
        qualityScore: 0.95,
        paymentAmount: 50,
      };

      expect(dto.isUsed).toBe(true);
      expect(dto.paymentStatus).toBe('paid');
      expect(dto.alipayAccount).toBe('138****1234');
    });

    it('should accept rejected feedback code', () => {
      const dto: FeedbackCodeDto = {
        code: 'REJECTED01',
        generatedAt: new Date(),
        isUsed: true,
        paymentStatus: 'rejected',
      };

      expect(dto.paymentStatus).toBe('rejected');
    });

    it('should allow optional fields', () => {
      const dto: FeedbackCodeDto = {
        code: 'MINIMAL01',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
      };

      expect(dto.id).toBeUndefined();
      expect(dto.alipayAccount).toBeUndefined();
      expect(dto.qualityScore).toBeUndefined();
      expect(dto.paymentAmount).toBeUndefined();
    });
  });

  describe('CreateFeedbackCodeDto interface', () => {
    it('should accept valid create request', () => {
      const dto: CreateFeedbackCodeDto = {
        code: 'NEW_CODE_2024',
      };

      expect(dto.code).toBe('NEW_CODE_2024');
    });
  });

  describe('MarkFeedbackCodeUsedDto interface', () => {
    it('should accept valid mark used request', () => {
      const dto: MarkFeedbackCodeUsedDto = {
        code: 'CODE123',
        alipayAccount: 'alipay@example.com',
        questionnaireData: { completed: true, score: 100 },
      };

      expect(dto.code).toBe('CODE123');
      expect(dto.alipayAccount).toBe('alipay@example.com');
      expect(dto.questionnaireData.score).toBe(100);
    });
  });

  describe('PaymentRequestDto interface', () => {
    it('should accept valid payment request', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'PAYMENT123',
        alipayAccount: '13800138000',
        amount: 100.5,
        qualityScore: 0.92,
      };

      expect(dto.feedbackCode).toBe('PAYMENT123');
      expect(dto.amount).toBe(100.5);
      expect(dto.qualityScore).toBe(0.92);
    });

    it('should accept zero amount', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FREE01',
        alipayAccount: 'test@test.com',
        amount: 0,
        qualityScore: 0,
      };

      expect(dto.amount).toBe(0);
    });
  });

  describe('MarketingStatsDto interface', () => {
    it('should accept valid marketing stats', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 1000,
        usedCodes: 750,
        pendingPayments: 25,
        totalPaid: 50000,
        averageQualityScore: 0.87,
      };

      expect(dto.totalCodes).toBe(1000);
      expect(dto.usedCodes).toBe(750);
      expect(dto.pendingPayments).toBe(25);
      expect(dto.totalPaid).toBe(50000);
      expect(dto.averageQualityScore).toBe(0.87);
    });

    it('should accept zero stats', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 0,
        usedCodes: 0,
        pendingPayments: 0,
        totalPaid: 0,
        averageQualityScore: 0,
      };

      expect(dto.totalCodes).toBe(0);
      expect(dto.totalPaid).toBe(0);
    });
  });
});
