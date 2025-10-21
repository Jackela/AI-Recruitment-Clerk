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
});
