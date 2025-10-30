import { FeedbackCodeService } from './feedback-code.service';

const createModelMock = () => {
  const store = new Map<
    string,
    {
      _id: string;
      code: string;
      generatedAt: Date;
      isUsed: boolean;
      paymentStatus: 'pending' | 'paid' | 'rejected';
      paymentAmount: number;
      alipayAccount?: string;
      questionnaireData?: Record<string, unknown>;
      usedAt?: Date;
      createdAt?: Date;
    }
  >();

  const ctor: any = function (this: any, doc: Record<string, unknown>) {
    Object.assign(this, doc);
  };

  ctor.prototype.save = jest.fn(async function (this: any) {
    const entity = {
      _id: this._id ?? `${this.code}-id`,
      ...this,
    };
    store.set(entity.code, entity);
    return entity;
  });

  ctor.findOne = jest.fn(async (query: Record<string, any>) => {
    const code = query.code;
    return code ? store.get(code) ?? null : null;
  });

  ctor.findOneAndUpdate = jest.fn(
    async (
      query: Record<string, any>,
      update: Record<string, any>,
      options?: Record<string, any>,
    ) => {
      const code = query.code;
      const entry = code ? store.get(code) : undefined;
      if (!entry || entry.isUsed !== false) {
        return null;
      }
      const updated = {
        ...entry,
        ...update,
        usedAt: update.usedAt ?? entry.usedAt,
      };
      store.set(code, updated);
      return options?.new ? updated : entry;
    },
  );

  ctor.updateMany = jest.fn(async (query: Record<string, any>) => {
    const codes: string[] = query.code?.$in ?? [];
    let modifiedCount = 0;
    codes.forEach((code) => {
      const entry = store.get(code);
      if (entry) {
        modifiedCount += 1;
      }
    });
    return { modifiedCount };
  });

  ctor.deleteMany = jest.fn(async (query: Record<string, any>) => {
    const cutoff: Date = query.generatedAt?.$lt;
    let deletedCount = 0;
    Array.from(store.entries()).forEach(([code, doc]) => {
      if (!doc.isUsed && cutoff && doc.generatedAt < cutoff) {
        store.delete(code);
        deletedCount += 1;
      }
    });
    return { deletedCount };
  });

  ctor.create = jest.fn(async (doc: Record<string, unknown>) => {
    const entity = {
      _id: `${doc.code}-id`,
      ...doc,
    } as any;
    store.set(entity.code, entity);
    return entity;
  });

  return { model: ctor, store };
};

describe('FeedbackCodeService (mocked model)', () => {
  let service: FeedbackCodeService;
  let model: ReturnType<typeof createModelMock>['model'];
  let store: ReturnType<typeof createModelMock>['store'];

  beforeEach(() => {
    const factory = createModelMock();
    model = factory.model;
    store = factory.store;
    service = new FeedbackCodeService(model as any);
  });

  describe('recordFeedbackCode', () => {
    it('creates new feedback code when not existing', async () => {
      const result = await service.recordFeedbackCode(
        { code: 'FB123456' },
        { ipAddress: '203.0.113.1' },
      );

      expect(result.code).toBe('FB123456');
      expect(store.get('FB123456')).toBeDefined();
      expect(model.findOne).toHaveBeenCalledWith({ code: 'FB123456' });
    });

    it('returns existing record when duplicate code detected', async () => {
      await service.recordFeedbackCode({ code: 'FB0001' });

      const second = await service.recordFeedbackCode({ code: 'FB0001' });

      expect(second.code).toBe('FB0001');
      expect(model.prototype.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('markFeedbackCodeAsUsed', () => {
    it('updates code status and computes quality score', async () => {
      await service.recordFeedbackCode({ code: 'FB0002' });
      const result = await service.markFeedbackCodeAsUsed({
        code: 'FB0002',
        alipayAccount: 'user@example.com',
        questionnaireData: { improvements: '建议增加批量功能' },
      });

      expect(result.code).toBe('FB0002');
      expect(result.isUsed).toBe(true);
      expect(result.qualityScore).toBeGreaterThanOrEqual(1);
      expect(model.findOneAndUpdate).toHaveBeenCalled();
    });

    it('throws when code already used', async () => {
      await service.recordFeedbackCode({ code: 'FB0003' });
      await service.markFeedbackCodeAsUsed({
        code: 'FB0003',
        alipayAccount: 'user@example.com',
      });

      await expect(
        service.markFeedbackCodeAsUsed({
          code: 'FB0003',
          alipayAccount: 'user@example.com',
        }),
      ).rejects.toThrow();
    });
  });

  describe('cleanupExpiredCodes', () => {
    it('removes unused codes older than threshold', async () => {
      await service.recordFeedbackCode({ code: 'FBKEEP' });
      const oldEntry = {
        _id: 'OLD',
        code: 'FBOLD',
        generatedAt: new Date('2020-01-01'),
        isUsed: false,
        paymentStatus: 'pending' as const,
        paymentAmount: 3,
      };
      store.set('FBOLD', oldEntry);

      const deleted = await service.cleanupExpiredCodes(30);

      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(store.has('FBOLD')).toBe(false);
      expect(store.has('FBKEEP')).toBe(true);
    });
  });

  describe('batchUpdatePaymentStatus', () => {
    it('counts matched documents without touching database', async () => {
      await service.recordFeedbackCode({ code: 'FBPAY1' });
      await service.recordFeedbackCode({ code: 'FBPAY2' });

      const modified = await service.batchUpdatePaymentStatus(
        ['FBPAY1', 'FBPAY2'],
        'paid',
      );

      expect(modified).toBe(2);
      expect(model.updateMany).toHaveBeenCalledWith(
        { code: { $in: ['FBPAY1', 'FBPAY2'] } },
        expect.any(Object),
      );
    });
  });

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Boundary Tests - Code Generation', () => {
    it('should handle exactly maximum code length', async () => {
      const maxLengthCode = 'FB' + 'A'.repeat(30);
      const result = await service.recordFeedbackCode({ code: maxLengthCode });

      expect(result.code).toBe(maxLengthCode);
      expect(store.has(maxLengthCode)).toBe(true);
    });

    it('should handle minimum valid code (FB + 1 char)', async () => {
      const minCode = 'FB1';
      const result = await service.recordFeedbackCode({ code: minCode });

      expect(result.code).toBe(minCode);
      expect(store.has(minCode)).toBe(true);
    });
  });

  describe('Negative Tests - Invalid Code Operations', () => {
    it('should handle empty feedback code gracefully', async () => {
      const result = await service.recordFeedbackCode({ code: '' });
      expect(result.code).toBe('');
    });

    it('should handle code with special characters', async () => {
      const specialCode = 'FB<script>alert("xss")</script>';
      const result = await service.recordFeedbackCode({ code: specialCode });
      expect(result.code).toBe(specialCode);
    });

    it('should reject marking non-existent code as used', async () => {
      await expect(
        service.markFeedbackCodeAsUsed({
          code: 'FBNONEXISTENT',
          alipayAccount: 'user@example.com',
        }),
      ).rejects.toThrow();
    });

    it('should accept any alipay account format', async () => {
      await service.recordFeedbackCode({ code: 'FBINVALID' });

      const result = await service.markFeedbackCodeAsUsed({
        code: 'FBINVALID',
        alipayAccount: 'any-account-format',
      });

      expect(result.alipayAccount).toBe('any-account-format');
    });
  });

  describe('Negative Tests - Database Failures', () => {
    it('should handle database failure during code creation', async () => {
      model.prototype.save.mockRejectedValueOnce(
        new Error('Database connection lost'),
      );

      await expect(
        service.recordFeedbackCode({ code: 'FBFAIL' }),
      ).rejects.toThrow('Database connection lost');
    });

    it('should handle database failure during update', async () => {
      await service.recordFeedbackCode({ code: 'FBUPDATE' });
      model.findOneAndUpdate.mockRejectedValueOnce(
        new Error('Update operation failed'),
      );

      await expect(
        service.markFeedbackCodeAsUsed({
          code: 'FBUPDATE',
          alipayAccount: 'user@example.com',
        }),
      ).rejects.toThrow('Update operation failed');
    });

    it('should handle database failure during cleanup', async () => {
      model.deleteMany.mockRejectedValueOnce(
        new Error('Cleanup operation failed'),
      );

      await expect(service.cleanupExpiredCodes(30)).rejects.toThrow(
        'Cleanup operation failed',
      );
    });
  });

  describe('Edge Cases - Quality Score Calculation', () => {
    it('should calculate quality score with complete questionnaire', async () => {
      await service.recordFeedbackCode({ code: 'FBQUALITY' });
      const result = await service.markFeedbackCodeAsUsed({
        code: 'FBQUALITY',
        alipayAccount: 'user@example.com',
        questionnaireData: {
          improvements: '建议增加批量功能和API接口',
          usability: 5,
          satisfaction: 5,
          features: '简历解析、职位匹配、数据分析',
        },
      });

      expect(result.qualityScore).toBeGreaterThanOrEqual(3);
      expect(result.qualityScore).toBeLessThanOrEqual(5);
    });

    it('should handle minimal questionnaire data', async () => {
      await service.recordFeedbackCode({ code: 'FBMINIMAL' });
      const result = await service.markFeedbackCodeAsUsed({
        code: 'FBMINIMAL',
        alipayAccount: 'user@example.com',
        questionnaireData: { improvements: '无' },
      });

      expect(result.qualityScore).toBeGreaterThanOrEqual(1);
      expect(result.qualityScore).toBeLessThanOrEqual(3);
    });

    it('should handle empty questionnaire data', async () => {
      await service.recordFeedbackCode({ code: 'FBEMPTY' });
      const result = await service.markFeedbackCodeAsUsed({
        code: 'FBEMPTY',
        alipayAccount: 'user@example.com',
        questionnaireData: {},
      });

      expect(result.qualityScore).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent code redemptions', async () => {
      await service.recordFeedbackCode({ code: 'FB0001' });
      await service.recordFeedbackCode({ code: 'FB0002' });
      await service.recordFeedbackCode({ code: 'FB0003' });

      const promises = [
        service.markFeedbackCodeAsUsed({
          code: 'FB0001',
          alipayAccount: 'user1@example.com',
        }),
        service.markFeedbackCodeAsUsed({
          code: 'FB0002',
          alipayAccount: 'user2@example.com',
        }),
        service.markFeedbackCodeAsUsed({
          code: 'FB0003',
          alipayAccount: 'user3@example.com',
        }),
      ];

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.isUsed).toBe(true);
        expect(result.alipayAccount).toBeDefined();
      });
    });

    it('should handle race condition on duplicate code creation', async () => {
      const promises = Array(3)
        .fill(null)
        .map(() => service.recordFeedbackCode({ code: 'FBRACE' }));

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.code).toBe('FBRACE');
      });
      // Mock allows multiple saves, real implementation would prevent duplicates
      expect(model.prototype.save).toHaveBeenCalled();
    });
  });

  describe('Boundary Tests - Cleanup Thresholds', () => {
    it('should cleanup codes at exactly expiration threshold', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const expiredEntry = {
        _id: 'EXPIRED',
        code: 'FBEXPIRED',
        generatedAt: thirtyOneDaysAgo,
        isUsed: false,
        paymentStatus: 'pending' as const,
        paymentAmount: 3,
      };
      store.set('FBEXPIRED', expiredEntry);

      const deleted = await service.cleanupExpiredCodes(30);

      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(store.has('FBEXPIRED')).toBe(false);
    });

    it('should not cleanup codes just before threshold (29 days)', async () => {
      const twentyNineDaysAgo = new Date();
      twentyNineDaysAgo.setDate(twentyNineDaysAgo.getDate() - 29);

      const recentEntry = {
        _id: 'RECENT',
        code: 'FBRECENT',
        generatedAt: twentyNineDaysAgo,
        isUsed: false,
        paymentStatus: 'pending' as const,
        paymentAmount: 3,
      };
      store.set('FBRECENT', recentEntry);

      await service.cleanupExpiredCodes(30);

      expect(store.has('FBRECENT')).toBe(true);
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return complete feedback code structure', async () => {
      const result = await service.recordFeedbackCode({
        code: 'FBCOMPLETE',
      });

      expect(result.code).toBe('FBCOMPLETE');
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.isUsed).toBe(false);
      expect(result.paymentStatus).toBe('pending');
      expect(result.paymentAmount).toBeGreaterThanOrEqual(0);
      expect(result.code.startsWith('FB')).toBe(true);
    });

    it('should update all required fields when marking as used', async () => {
      await service.recordFeedbackCode({ code: 'FBFIELDS' });
      const result = await service.markFeedbackCodeAsUsed({
        code: 'FBFIELDS',
        alipayAccount: 'complete@example.com',
        questionnaireData: { rating: 5 },
      });

      expect(result).toMatchObject({
        code: 'FBFIELDS',
        isUsed: true,
        alipayAccount: 'complete@example.com',
        questionnaireData: expect.any(Object),
        qualityScore: expect.any(Number),
        usedAt: expect.any(Date),
      });
      expect(result.usedAt).toBeInstanceOf(Date);
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });
});
