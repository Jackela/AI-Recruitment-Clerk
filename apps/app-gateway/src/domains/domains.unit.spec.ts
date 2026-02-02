import { AnalyticsEventRepository } from './analytics/analytics-event.repository';
import { AnalyticsIntegrationService } from './analytics/analytics-integration.service';
import type { AppGatewayNatsService } from '../nats/app-gateway-nats.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

const createModelStub = () => {
  const store = new Map<string, any>();

  const findOneAndUpdate = jest.fn(async (filter: any, update: any) => {
    const existing = Array.from(store.values()).find(
      (doc) => doc.eventId === filter.eventId,
    );
    if (existing) {
      Object.assign(existing, update);
      return existing;
    }
    const doc = { ...update, eventId: filter.eventId };
    store.set(doc.eventId, doc);
    return doc;
  });

  const findOne = jest.fn(async (filter: any) => {
    const doc = Array.from(store.values()).find(
      (entry) => entry.eventId === filter.eventId,
    );
    return doc ? { ...doc } : null;
  });

  const countDocuments = jest.fn(() => ({
    exec: jest.fn(async () => store.size),
  }));

  const analyticsModel = {
    findOneAndUpdate,
    findOne,
    countDocuments,
  };

  return { analyticsModel, store };
};

const createAnalyticsService = () => {
  const repository = {
    save: jest.fn(),
    findBySessionId: jest.fn(),
  } as unknown as jest.Mocked<AnalyticsEventRepository>;

  const natsClient = {
    publishAnalyticsEvent: jest.fn(),
  } as unknown as jest.Mocked<AppGatewayNatsService>;

  const cacheManager = {
    wrap: jest.fn(async (_key: string, compute: () => Promise<any>) =>
      compute(),
    ),
  } as any;

  const service = new AnalyticsIntegrationService(
    repository,
    natsClient,
    cacheManager,
  );

  return { service, repository, natsClient, cacheManager };
};

describe('Domains module lightweight coverage', () => {
  describe('AnalyticsEventRepository', () => {
    it('counts session events using mocked model', async () => {
      const { analyticsModel, store } = createModelStub();
      const repository = new AnalyticsEventRepository(
        analyticsModel as any,
      );

      store.set('evt-1', {
        eventId: 'evt-1',
        sessionId: 'session-1',
        timestamp: new Date(),
      });

      const count = await repository.countSessionEvents('session-1');

      expect(count).toBe(store.size);
      expect(analyticsModel.countDocuments).toHaveBeenCalledWith({
        sessionId: 'session-1',
      });
    });
  });

  describe('AnalyticsIntegrationService', () => {
    it('returns processed event metadata when tracking event succeeds', async () => {
      const { service } = createAnalyticsService();
      (service as any).domainService = {
        createUserInteractionEvent: jest.fn().mockResolvedValue({
          success: true,
          data: {
            id: 'event-123',
            eventType: 'USER_INTERACTION',
            status: 'processed',
            props: { timestamp: new Date('2024-01-01T00:00:00Z') },
          },
        }),
      };

      const result = await service.trackEvent({
        category: 'ui',
        action: 'click',
        userId: 'user-1',
        organizationId: 'org-1',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      });

      expect(result.eventId).toBe('event-123');
      expect(result.eventType).toBe('USER_INTERACTION');
      expect(result.processed).toBe(true);
    });

    it('bubbles up errors from domain service', async () => {
      const { service } = createAnalyticsService();
      const failure = new Error('domain failure');
      (service as any).domainService = {
        createUserInteractionEvent: jest.fn().mockRejectedValue(failure),
      };

      await expect(
        service.trackEvent({
          category: 'ui',
          action: 'click',
          userId: 'user-1',
          organizationId: 'org-1',
          timestamp: new Date(),
        }),
      ).rejects.toThrow('domain failure');
    });
  });
});
