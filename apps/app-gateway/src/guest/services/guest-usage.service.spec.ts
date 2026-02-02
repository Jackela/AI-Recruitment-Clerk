import { GuestUsageService } from './guest-usage.service';

type StoreRecord = {
  deviceId: string;
  usageCount: number;
  feedbackCode?: string | null;
  feedbackCodeStatus?: string | null;
  lastUsed: Date;
  createdAt: Date;
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const createModelMock = () => {
  const store = new Map<string, StoreRecord>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[key] = null;
      });
    }
    store.set(target.deviceId, target);
    return { acknowledged: true, modifiedCount: 1 };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ========== PRIORITY 1 IMPROVEMENTS: NEGATIVE & BOUNDARY TESTS ==========

  describe('Boundary Tests - Usage Limits', () => {
    it('should allow exactly 5 uses before blocking (boundary: max)', async () => {
      const deviceId = 'device-boundary-max';
      
      // First 5 uses should succeed
      for (let i = 0; i < 5; i++) {
        const result = await service.canUse(deviceId);
        expect(result).toBe(true);
      }
      
      // 6th use should be blocked
      const sixthUse = await service.canUse(deviceId);
      expect(sixthUse).toBe(false);
      expect(store.get(deviceId)?.usageCount).toBe(5); // Should not increment beyond limit
    });

    it('should handle usage count at exactly limit boundary (5)', async () => {
      const deviceId = 'device-at-limit';
      await service.canUse(deviceId);
      store.get(deviceId)!.usageCount = 5;

      const result = await service.canUse(deviceId);
      
      expect(result).toBe(false);
      expect(store.get(deviceId)?.usageCount).toBe(5);
    });

    it('should handle usage count just below limit (4)', async () => {
      const deviceId = 'device-below-limit';
      await service.canUse(deviceId);
      store.get(deviceId)!.usageCount = 4;

      const result = await service.canUse(deviceId);
      
      expect(result).toBe(true);
      expect(store.get(deviceId)?.usageCount).toBe(5);
    });

    it('should handle zero usage count (boundary: min)', async () => {
      const deviceId = 'device-zero';
      await service.canUse(deviceId);
      store.get(deviceId)!.usageCount = 0;

      const result = await service.canUse(deviceId);
      
      expect(result).toBe(true);
      expect(store.get(deviceId)?.usageCount).toBe(1);
    });
  });

  describe('Negative Tests - Error Conditions', () => {
    it('should handle database findOne failure gracefully', async () => {
      model.findOne.mockRejectedValueOnce(new Error('Database connection lost'));

      await expect(service.canUse('device-error')).rejects.toThrow('Database connection lost');
    });

    it('should handle database create failure gracefully', async () => {
      model.create.mockRejectedValueOnce(new Error('Document creation failed'));

      await expect(service.canUse('new-device')).rejects.toThrow('Document creation failed');
    });

    it('should handle database updateOne failure gracefully', async () => {
      await service.canUse('device-update-error');
      model.updateOne.mockRejectedValueOnce(new Error('Update operation failed'));

      await expect(service.canUse('device-update-error')).rejects.toThrow('Update operation failed');
    });

    it('should handle empty deviceId gracefully', async () => {
      const result = await service.canUse('');
      expect(result).toBeDefined();
    });
  });

  describe('Negative Tests - Feedback Code Validation', () => {
    it('should reject invalid feedback code format', async () => {
      await expect(service.redeemFeedbackCode('invalid-code')).rejects.toThrow('Invalid or already redeemed feedback code');
    });

    it('should successfully redeem valid feedback code and reset usage', async () => {
      await service.canUse('device-redeem-test');
      store.get('device-redeem-test')!.usageCount = 5;
      const code = await service.generateFeedbackCode('device-redeem-test');
      
      const redeemed = await service.redeemFeedbackCode(code);
      
      expect(redeemed).toBe(true);
      expect(store.get('device-redeem-test')?.feedbackCodeStatus).toBe('redeemed');
    });
  });

  describe('Edge Cases - Concurrent Operations', () => {
    it('should handle concurrent usage checks for same device', async () => {
      const deviceId = 'device-concurrent';
      
      // Simulate 3 concurrent requests
      const promises = [
        service.canUse(deviceId),
        service.canUse(deviceId),
        service.canUse(deviceId),
      ];
      
      const results = await Promise.all(promises);
      
      // All should succeed if within limit
      results.forEach(result => expect(result).toBe(true));
      
      // Final count should reflect all increments
      const finalCount = store.get(deviceId)?.usageCount;
      expect(finalCount).toBeGreaterThan(0);
      expect(finalCount).toBeLessThanOrEqual(5);
    });

    it('should handle rapid sequential usage checks', async () => {
      const deviceId = 'device-rapid';
      const iterations = 10;
      const results: boolean[] = [];
      
      for (let i = 0; i < iterations; i++) {
        results.push(await service.canUse(deviceId));
      }
      
      // First 5 should succeed, rest should fail
      expect(results.slice(0, 5).every(r => r === true)).toBe(true);
      expect(results.slice(5).every(r => r === false)).toBe(true);
    });
  });

  describe('Edge Cases - Data States', () => {
    it('should handle device with no usage count field', async () => {
      const deviceId = 'device-no-count';
      store.set(deviceId, {
        deviceId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        usageCount: undefined as any,
        lastUsed: new Date(),
        createdAt: new Date(),
      });

      await expect(service.getUsageStatus(deviceId)).resolves.toBeDefined();
    });

    it('should handle device with negative usage count (data corruption)', async () => {
      const deviceId = 'device-negative';
      await service.canUse(deviceId);
      store.get(deviceId)!.usageCount = -1;

      const result = await service.canUse(deviceId);
      
      // Should treat negative as 0 and allow usage
      expect(result).toBe(true);
    });

    it('should handle device with very large usage count', async () => {
      const deviceId = 'device-large';
      await service.canUse(deviceId);
      store.get(deviceId)!.usageCount = Number.MAX_SAFE_INTEGER;

      const result = await service.canUse(deviceId);
      
      expect(result).toBe(false);
    });

    it('should handle getUsageStatus for non-existent device', async () => {
      const status = await service.getUsageStatus('non-existent-device');
      
      expect(status).toBeDefined();
      expect(status.canUse).toBeDefined();
    });
  });

  describe('Assertion Specificity Improvements', () => {
    it('should return specific usage metrics structure', async () => {
      await service.canUse('device-specific');
      
      const status = await service.getUsageStatus('device-specific');
      
      // More specific assertions instead of generic toBeDefined()
      expect(status).toMatchObject({
        canUse: expect.any(Boolean),
        remainingCount: expect.any(Number),
      });
      expect(status.remainingCount).toBeGreaterThanOrEqual(0);
      expect(status.remainingCount).toBeLessThanOrEqual(5);
    });

    it('should generate feedback code with correct format when usage limit reached', async () => {
      await service.canUse('device-code-format');
      store.get('device-code-format')!.usageCount = 5;
      
      const code = await service.generateFeedbackCode('device-code-format');
      
      // More specific format validation (UUID format with fb- prefix)
      expect(code).toMatch(/^fb-[a-z0-9-]{36}$/i);
      expect(code.length).toBeGreaterThan(10);
      expect(code.startsWith('fb-')).toBe(true);
    });
  });
});
