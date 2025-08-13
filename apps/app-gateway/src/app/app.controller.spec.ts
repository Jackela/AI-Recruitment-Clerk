import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobRepository } from '../repositories/job.repository';
import { NatsClient } from '../nats/nats.client';
import { CacheService } from '../cache/cache.service';
import { CacheWarmupService } from '../cache/cache-warmup.service';

describe('AppController', () => {
  let app: TestingModule;
  let controller: AppController;

  const mockJobRepository = {
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', count: 0 })
  };

  const mockNatsClient = {
    isConnected: true
  };

  const mockCacheService = {
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', connected: true }),
    getMetrics: jest.fn().mockReturnValue({ hitRate: 0.95, totalRequests: 100 }),
    getHealthCacheKey: jest.fn().mockReturnValue('health:cache:key'),
    wrap: jest.fn().mockImplementation((key, fn) => fn())
  };

  const mockCacheWarmupService = {
    getRefreshStatus: jest.fn().mockReturnValue({ isActive: false, lastRefresh: null }),
    triggerWarmup: jest.fn().mockResolvedValue({ success: true })
  };

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: JobRepository, useValue: mockJobRepository },
        { provide: NatsClient, useValue: mockNatsClient },
        { provide: CacheService, useValue: mockCacheService },
        { provide: CacheWarmupService, useValue: mockCacheWarmupService }
      ],
    }).compile();

    controller = app.get<AppController>(AppController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      expect(controller.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const health = await controller.getHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('service', 'app-gateway');
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('messaging');
    });
  });

  describe('getCacheMetrics', () => {
    it('should return cache metrics', async () => {
      const metrics = await controller.getCacheMetrics();
      
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('cache');
    });
  });
});
