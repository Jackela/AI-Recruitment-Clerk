import { GuestUsageService } from './guest-usage.service';

type StoreRecord = {
  deviceId: string;
  usageCount: number;
  feedbackCode?: string | null;
  feedbackCodeStatus?: string | null;
  lastUsed: Date;
  createdAt: Date;
};

const createModelMock = () => {
  const store = new Map<string, StoreRecord>();

  const findOne = jest.fn(async (query: Record<string, any>) => {
    if (query.deviceId) {
      return store.get(query.deviceId) ?? null;
    }
    if (query.feedbackCode) {
      return (
        Array.from(store.values()).find(
          (entry) => entry.feedbackCode === query.feedbackCode,
        ) ?? null
      );
    }
    return null;
  });

  const create = jest.fn(async (doc: Partial<StoreRecord>) => {
    const record: StoreRecord = {
      deviceId: doc.deviceId!,
      usageCount: doc.usageCount ?? 1,
      feedbackCode: doc.feedbackCode ?? null,
      feedbackCodeStatus: doc.feedbackCodeStatus ?? null,
      lastUsed: doc.lastUsed ?? new Date(),
      createdAt: doc.createdAt ?? new Date(),
    };
    store.set(record.deviceId, record);
    return record;
  });

  const updateOne = jest.fn(async (query: Record<string, any>, update: any) => {
    const target =
      store.get(query.deviceId) ??
      Array.from(store.values()).find(
        (entry) => entry.feedbackCode === query.feedbackCode,
      );
    if (!target) {
      return { acknowledged: false, modifiedCount: 0 };
    }

    if (update.$inc?.usageCount) {
      target.usageCount += update.$inc.usageCount;
    }
    if (update.$set) {
      Object.assign(target, update.$set);
    }
    if (update.$unset) {
      Object.keys(update.$unset).forEach((key) => {
        (target as any)[key] = null;
      });
    }
    store.set(target.deviceId, target);
    return { acknowledged: true, modifiedCount: 1 };
  });

  const deleteMany = jest.fn(async (query: Record<string, any>) => {
    const before = store.size;
    const cutoff: Date = query.lastUsed?.$lt;
    Array.from(store.entries()).forEach(([deviceId, record]) => {
      if (
        cutoff &&
        record.lastUsed.getTime() < cutoff.getTime() &&
        record.usageCount === 0
      ) {
        store.delete(deviceId);
      }
    });
    return { deletedCount: before - store.size };
  });

  const countDocuments = jest.fn(async () => store.size);

  const aggregate = jest.fn(async () => [
    { _id: 'totalUsage', value: Array.from(store.values()).reduce((acc, r) => acc + r.usageCount, 0) },
  ]);

  return {
    model: {
      findOne,
      create,
      updateOne,
      deleteMany,
      countDocuments,
      aggregate,
    },
    store,
  };
};

describe('GuestUsageService (mocked model)', () => {
  let service: GuestUsageService;
  let model: ReturnType<typeof createModelMock>['model'];
  let store: ReturnType<typeof createModelMock>['store'];

  beforeEach(() => {
    const factory = createModelMock();
    model = factory.model;
    store = factory.store;
    service = new GuestUsageService(model as any);
  });

  describe('canUse', () => {
    it('creates record for first-time device and allows usage', async () => {
      const result = await service.canUse('device-1');

      expect(result).toBe(true);
      expect(store.get('device-1')?.usageCount).toBe(1);
      expect(model.create).toHaveBeenCalled();
    });

    it('enforces usage limit of five', async () => {
      await service.canUse('device-limit');
      store.get('device-limit')!.usageCount = 5;

      const result = await service.canUse('device-limit');

      expect(result).toBe(false);
      expect(model.updateOne).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ $inc: { usageCount: 1 } }),
      );
    });
  });

  describe('generateFeedbackCode & redeemFeedbackCode', () => {
    it('assigns feedback code and resets usage on redemption', async () => {
      await service.canUse('device-fb');
      const storedRecord = store.get('device-fb');
      if (storedRecord) {
        storedRecord.usageCount = 5;
        store.set('device-fb', storedRecord);
      }
      const code = await service.generateFeedbackCode('device-fb');

      expect(code).toMatch(/^fb-/i);
      const stored = store.get('device-fb');
      expect(stored?.feedbackCodeStatus).toBe('generated');

      const redeemed = await service.redeemFeedbackCode(code);

      expect(redeemed).toBe(true);
      expect(store.get('device-fb')?.feedbackCodeStatus).toBe('redeemed');
    });
  });

  describe('getUsageStatus', () => {
    it('reports usage metrics for device', async () => {
      await service.canUse('device-stats');
      await service.canUse('device-stats');

      const status = await service.getUsageStatus('device-stats');

      expect(status.remainingCount).toBeGreaterThanOrEqual(0);
      expect(typeof status.canUse).toBe('boolean');
    });
  });
});
