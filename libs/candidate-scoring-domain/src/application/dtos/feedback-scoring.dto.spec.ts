import type {
  FeedbackCodeDto,
  CreateFeedbackCodeDto,
  MarkFeedbackCodeUsedDto,
  PaymentRequestDto,
  MarketingStatsDto,
} from './feedback-scoring.dto';

describe('FeedbackScoringDto', () => {
  describe('FeedbackCodeDto', () => {
    it('should accept valid feedback code with all fields', () => {
      const dto: FeedbackCodeDto = {
        id: 'feedback-123',
        code: 'FB-2024-001',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
        qualityScore: 85,
        paymentAmount: 100,
        createdBy: 'user-123',
      };

      expect(dto.id).toBe('feedback-123');
      expect(dto.code).toBe('FB-2024-001');
      expect(dto.isUsed).toBe(false);
      expect(dto.paymentStatus).toBe('pending');
      expect(dto.qualityScore).toBe(85);
    });

    it('should accept feedback code with used status', () => {
      const dto: FeedbackCodeDto = {
        code: 'FB-2024-002',
        generatedAt: new Date(),
        isUsed: true,
        usedAt: new Date(),
        paymentStatus: 'paid',
        qualityScore: 90,
        paymentAmount: 150,
      };

      expect(dto.isUsed).toBe(true);
      expect(dto.usedAt).toBeDefined();
      expect(dto.paymentStatus).toBe('paid');
    });

    it('should accept feedback code with minimal fields', () => {
      const dto: FeedbackCodeDto = {
        code: 'FB-2024-003',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
      };

      expect(dto.code).toBe('FB-2024-003');
      expect(dto.id).toBeUndefined();
      expect(dto.qualityScore).toBeUndefined();
    });

    it('should accept feedback code with questionnaire data', () => {
      const dto: FeedbackCodeDto = {
        code: 'FB-2024-004',
        generatedAt: new Date(),
        isUsed: true,
        usedAt: new Date(),
        alipayAccount: 'account@example.com',
        questionnaireData: {
          satisfaction: 5,
          feedback: 'Great service',
          rating: 4.5,
        },
        paymentStatus: 'paid',
        qualityScore: 95,
      };

      expect(dto.questionnaireData).toBeDefined();
      expect(dto.questionnaireData?.satisfaction).toBe(5);
      expect(dto.alipayAccount).toBe('account@example.com');
    });

    it('should accept rejected payment status', () => {
      const dto: FeedbackCodeDto = {
        code: 'FB-2024-005',
        generatedAt: new Date(),
        isUsed: true,
        paymentStatus: 'rejected',
        qualityScore: 30,
      };

      expect(dto.paymentStatus).toBe('rejected');
      expect(dto.qualityScore).toBe(30);
    });

    it('should accept various quality scores', () => {
      const lowQuality: FeedbackCodeDto = {
        code: 'FB-001',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
        qualityScore: 0,
      };

      const highQuality: FeedbackCodeDto = {
        code: 'FB-002',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
        qualityScore: 100,
      };

      expect(lowQuality.qualityScore).toBe(0);
      expect(highQuality.qualityScore).toBe(100);
    });
  });

  describe('CreateFeedbackCodeDto', () => {
    it('should accept valid create dto', () => {
      const dto: CreateFeedbackCodeDto = {
        code: 'NEW-FB-001',
      };

      expect(dto.code).toBe('NEW-FB-001');
    });

    it('should accept various code formats', () => {
      const dto1: CreateFeedbackCodeDto = { code: 'simple' };
      const dto2: CreateFeedbackCodeDto = { code: 'FB-2024-001' };
      const dto3: CreateFeedbackCodeDto = { code: '12345' };

      expect(dto1.code).toBe('simple');
      expect(dto2.code).toBe('FB-2024-001');
      expect(dto3.code).toBe('12345');
    });
  });

  describe('MarkFeedbackCodeUsedDto', () => {
    it('should accept valid mark used dto', () => {
      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-2024-001',
        alipayAccount: 'alipay@example.com',
        questionnaireData: {
          rating: 5,
          comments: 'Excellent',
        },
      };

      expect(dto.code).toBe('FB-2024-001');
      expect(dto.alipayAccount).toBe('alipay@example.com');
      expect(dto.questionnaireData.rating).toBe(5);
    });

    it('should accept empty questionnaire data', () => {
      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-2024-002',
        alipayAccount: 'alipay2@example.com',
        questionnaireData: {},
      };

      expect(dto.questionnaireData).toEqual({});
    });

    it('should accept complex questionnaire data', () => {
      const questionnaireData = {
        categories: {
          service: 5,
          quality: 4,
          delivery: 5,
        },
        nested: {
          deep: {
            value: 'test',
          },
        },
        array: [1, 2, 3],
      };

      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-2024-003',
        alipayAccount: 'alipay3@example.com',
        questionnaireData,
      };

      expect((dto.questionnaireData as any).categories.service).toBe(5);
      expect((dto.questionnaireData as any).nested.deep.value).toBe('test');
      expect((dto.questionnaireData as any).array).toEqual([1, 2, 3]);
    });
  });

  describe('PaymentRequestDto', () => {
    it('should accept valid payment request', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FB-2024-001',
        alipayAccount: 'alipay@example.com',
        amount: 100.5,
        qualityScore: 85,
      };

      expect(dto.feedbackCode).toBe('FB-2024-001');
      expect(dto.alipayAccount).toBe('alipay@example.com');
      expect(dto.amount).toBe(100.5);
      expect(dto.qualityScore).toBe(85);
    });

    it('should accept zero amount', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FB-2024-002',
        alipayAccount: 'alipay@example.com',
        amount: 0,
        qualityScore: 50,
      };

      expect(dto.amount).toBe(0);
    });

    it('should accept various quality scores', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FB-2024-003',
        alipayAccount: 'alipay@example.com',
        amount: 75.25,
        qualityScore: 99.5,
      };

      expect(dto.qualityScore).toBe(99.5);
    });

    it('should accept large amounts', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FB-2024-004',
        alipayAccount: 'alipay@example.com',
        amount: 999999.99,
        qualityScore: 100,
      };

      expect(dto.amount).toBe(999999.99);
    });
  });

  describe('MarketingStatsDto', () => {
    it('should accept valid marketing stats', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 1000,
        usedCodes: 500,
        pendingPayments: 50,
        totalPaid: 450,
        averageQualityScore: 78.5,
      };

      expect(dto.totalCodes).toBe(1000);
      expect(dto.usedCodes).toBe(500);
      expect(dto.pendingPayments).toBe(50);
      expect(dto.totalPaid).toBe(450);
      expect(dto.averageQualityScore).toBe(78.5);
    });

    it('should accept zero values', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 0,
        usedCodes: 0,
        pendingPayments: 0,
        totalPaid: 0,
        averageQualityScore: 0,
      };

      expect(dto.totalCodes).toBe(0);
      expect(dto.averageQualityScore).toBe(0);
    });

    it('should accept perfect average quality score', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 100,
        usedCodes: 100,
        pendingPayments: 0,
        totalPaid: 100,
        averageQualityScore: 100,
      };

      expect(dto.averageQualityScore).toBe(100);
    });

    it('should accept decimal quality scores', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 33,
        usedCodes: 10,
        pendingPayments: 5,
        totalPaid: 5,
        averageQualityScore: 87.654,
      };

      expect(dto.averageQualityScore).toBe(87.654);
    });

    it('should calculate percentages from stats', () => {
      const dto: MarketingStatsDto = {
        totalCodes: 1000,
        usedCodes: 250,
        pendingPayments: 50,
        totalPaid: 200,
        averageQualityScore: 75,
      };

      const usageRate = (dto.usedCodes / dto.totalCodes) * 100;
      expect(usageRate).toBe(25);
    });
  });

  describe('Data consistency', () => {
    it('should maintain consistency between isUsed and usedAt', () => {
      const unusedDto: FeedbackCodeDto = {
        code: 'FB-001',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
      };

      const usedDto: FeedbackCodeDto = {
        code: 'FB-002',
        generatedAt: new Date(),
        isUsed: true,
        usedAt: new Date(),
        paymentStatus: 'paid',
      };

      expect(unusedDto.isUsed).toBe(false);
      expect(unusedDto.usedAt).toBeUndefined();

      expect(usedDto.isUsed).toBe(true);
      expect(usedDto.usedAt).toBeDefined();
    });

    it('should maintain consistency between paymentStatus and paymentAmount', () => {
      const pendingDto: FeedbackCodeDto = {
        code: 'FB-001',
        generatedAt: new Date(),
        isUsed: false,
        paymentStatus: 'pending',
      };

      const paidDto: FeedbackCodeDto = {
        code: 'FB-002',
        generatedAt: new Date(),
        isUsed: true,
        usedAt: new Date(),
        paymentStatus: 'paid',
        paymentAmount: 100,
      };

      expect(pendingDto.paymentAmount).toBeUndefined();
      expect(paidDto.paymentAmount).toBeDefined();
    });

    it('should allow qualityScore without payment for rejected status', () => {
      const rejectedDto: FeedbackCodeDto = {
        code: 'FB-001',
        generatedAt: new Date(),
        isUsed: true,
        usedAt: new Date(),
        paymentStatus: 'rejected',
        qualityScore: 20,
      };

      expect(rejectedDto.paymentStatus).toBe('rejected');
      expect(rejectedDto.qualityScore).toBe(20);
      expect(rejectedDto.paymentAmount).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle very long code strings', () => {
      const longCode = 'A'.repeat(1000);
      const dto: CreateFeedbackCodeDto = { code: longCode };

      expect(dto.code.length).toBe(1000);
    });

    it('should handle unicode in alipay account', () => {
      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-001',
        alipayAccount: '用户@alipay.com',
        questionnaireData: {},
      };

      expect(dto.alipayAccount).toBe('用户@alipay.com');
    });

    it('should handle special characters in questionnaire', () => {
      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-001',
        alipayAccount: 'test@example.com',
        questionnaireData: {
          'special-key': 'value with "quotes" and \\ backslash',
          array: ['item1', 'item2'],
        },
      };

      expect(dto.questionnaireData['special-key']).toBe(
        'value with "quotes" and \\ backslash',
      );
    });

    it('should handle negative quality scores', () => {
      const dto: PaymentRequestDto = {
        feedbackCode: 'FB-001',
        alipayAccount: 'test@example.com',
        amount: 50,
        qualityScore: -5,
      };

      expect(dto.qualityScore).toBe(-5);
    });

    it('should handle null in questionnaire data', () => {
      const questionnaireData = {
        nullValue: null,
        nested: {
          nullNested: null,
        },
      };

      const dto: MarkFeedbackCodeUsedDto = {
        code: 'FB-001',
        alipayAccount: 'test@example.com',
        questionnaireData,
      };

      expect((dto.questionnaireData as any).nullValue).toBeNull();
      expect((dto.questionnaireData as any).nested.nullNested).toBeNull();
    });
  });
});
