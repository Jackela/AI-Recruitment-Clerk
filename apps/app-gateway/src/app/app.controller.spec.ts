import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobRepository } from '../repositories/job.repository';
import { NatsClientService } from '@ai-recruitment-clerk/shared-nats-client';
import { CacheService } from '../cache/cache.service';
import { CacheWarmupService } from '../cache/cache-warmup.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;
  let jobRepository: jest.Mocked<JobRepository>;
  let natsClient: jest.Mocked<NatsClientService>;
  let cacheService: jest.Mocked<CacheService>;
  let cacheWarmupService: jest.Mocked<CacheWarmupService>;

  const mockAppService = {
    getData: jest.fn(),
  };

  const mockJobRepository = {
    healthCheck: jest.fn(),
  };

  const mockNatsClient = {
    get isConnected() {
      return this._isConnected;
    },
    _isConnected: true,
  };

  const mockCacheMetrics = {
    hits: 100,
    misses: 10,
    sets: 50,
    dels: 5,
    errors: 2,
    hitRate: 90.9,
    totalOperations: 167,
  };

  const mockCacheService = {
    healthCheck: jest.fn(),
    getMetrics: jest.fn(() => mockCacheMetrics),
    getHealthCacheKey: jest.fn(),
    wrap: jest.fn(),
  };

  const mockCacheWarmupService = {
    getRefreshStatus: jest.fn(),
    triggerWarmup: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: JobRepository,
          useValue: mockJobRepository,
        },
        {
          provide: NatsClientService,
          useValue: mockNatsClient,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: CacheWarmupService,
          useValue: mockCacheWarmupService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
    jobRepository = module.get(JobRepository);
    natsClient = module.get(NatsClientService);
    cacheService = module.get(CacheService);
    cacheWarmupService = module.get(CacheWarmupService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWelcome', () => {
    it('should return welcome message with correct structure', () => {
      const result = controller.getWelcome();

      expect(result).toEqual({
        message: 'Welcome to the AI Recruitment Clerk API Gateway!',
        status: 'ok',
        timestamp: expect.any(String),
        documentation: '/api/docs',
      });
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should return ISO timestamp format', () => {
      const result = controller.getWelcome();
      expect(result.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
    });
  });

  describe('getData', () => {
    it('should return data from app service', () => {
      const mockData = { message: 'Hello API' };
      appService.getData.mockReturnValue(mockData);

      const result = controller.getData();

      expect(appService.getData).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockData);
    });
  });

  describe('getCacheMetrics', () => {
    it('should return cache metrics when cache is healthy', async () => {
      const mockCacheHealth = {
        status: 'healthy',
        connected: true,
        type: 'redis',
        metrics: mockCacheMetrics,
      };
      cacheService.healthCheck.mockResolvedValue(mockCacheHealth);

      const result = await controller.getCacheMetrics();

      expect(cacheService.healthCheck).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        timestamp: expect.any(String),
        cache: mockCacheHealth,
      });
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('should handle cache service errors gracefully', async () => {
      const error = new Error('Cache connection failed');
      cacheService.healthCheck.mockRejectedValue(error);
      cacheService.getMetrics.mockReturnValue(mockCacheMetrics);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.getCacheMetrics();

      expect(consoleSpy).toHaveBeenCalledWith('Cache metrics error:', error);
      expect(result).toEqual({
        timestamp: expect.any(String),
        cache: {
          status: 'error',
          connected: false,
          metrics: mockCacheMetrics,
          error: 'Cache connection failed',
        },
      });

      consoleSpy.mockRestore();
    });

    it('should handle non-Error exceptions in cache metrics', async () => {
      cacheService.healthCheck.mockRejectedValue('String error');
      cacheService.getMetrics.mockReturnValue(mockCacheMetrics);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.getCacheMetrics();

      expect((result.cache as any).error).toBe('String error');
      consoleSpy.mockRestore();
    });
  });

  describe('getHealth', () => {
    const mockDbHealth = { status: 'healthy', count: 5 };

    beforeEach(() => {
      jobRepository.healthCheck.mockResolvedValue(mockDbHealth);
      mockNatsClient._isConnected = true;
    });

    it('should return healthy status when all services are working', async () => {
      const mockCacheKey = 'health-cache-key';
      const mockHealthData = {
        status: 'ok',
        timestamp: expect.any(String),
        service: 'app-gateway',
        database: { status: 'healthy', jobCount: 5 },
        messaging: { status: 'connected', provider: 'NATS JetStream' },
        features: {
          authentication: 'enabled',
          authorization: 'enabled',
          cache: 'enabled',
        },
        cache: { provider: 'Redis/Memory', status: 'connected' },
      };

      cacheService.getHealthCacheKey.mockReturnValue(mockCacheKey);
      cacheService.wrap.mockImplementation((key, fn) => fn());

      const result = await controller.getHealth();

      expect(cacheService.getHealthCacheKey).toHaveBeenCalledTimes(1);
      expect(cacheService.wrap).toHaveBeenCalledWith(
        mockCacheKey,
        expect.any(Function),
        { ttl: 30000 },
      );
      expect(result).toMatchObject(mockHealthData);
      expect(result.status).toBe('ok');
    });

    it('should return degraded status when database is unhealthy', async () => {
      const unhealthyDbHealth = { status: 'unhealthy', count: 0 };
      jobRepository.healthCheck.mockResolvedValue(unhealthyDbHealth);
      cacheService.getHealthCacheKey.mockReturnValue('key');
      cacheService.wrap.mockImplementation((key, fn) => fn());

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.database.status).toBe('unhealthy');
    });

    it('should return degraded status when NATS is disconnected', async () => {
      mockNatsClient._isConnected = false;
      cacheService.getHealthCacheKey.mockReturnValue('key');
      cacheService.wrap.mockImplementation((key, fn) => fn());

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.messaging.status).toBe('disconnected');
    });

    it('should handle missing cache service gracefully', async () => {
      // Create controller with null cacheService
      const moduleWithNullCache = await Test.createTestingModule({
        controllers: [AppController],
        providers: [
          { provide: AppService, useValue: mockAppService },
          { provide: JobRepository, useValue: mockJobRepository },
          { provide: NatsClient, useValue: mockNatsClient },
          { provide: CacheService, useValue: null },
          { provide: CacheWarmupService, useValue: mockCacheWarmupService },
        ],
      }).compile();

      const controllerWithNullCache =
        moduleWithNullCache.get<AppController>(AppController);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controllerWithNullCache.getHealth();

      expect(consoleSpy).toHaveBeenCalledWith('CacheService is not injected!');
      expect(result.features.cache).toBe('disabled - service injection failed');
      expect(result.status).toBe('ok'); // Should still be ok if db and nats are healthy

      consoleSpy.mockRestore();
    });

    it('should handle cache wrap errors and fallback gracefully', async () => {
      const error = new Error('Cache wrap failed');
      cacheService.getHealthCacheKey.mockReturnValue('key');
      cacheService.wrap.mockRejectedValue(error);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.getHealth();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check cache error:',
        error,
      );
      expect(result.status).toBe('ok');
      expect(result.features.cache).toBe('error - Cache wrap failed');

      consoleSpy.mockRestore();
    });

    it('should use console.log for cache operations', async () => {
      cacheService.getHealthCacheKey.mockReturnValue('test-key');
      cacheService.wrap.mockImplementation(async (key, fn) => {
        // Simulate the cache miss scenario
        const result = await fn();
        return result;
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await controller.getHealth();

      expect(consoleSpy).toHaveBeenCalledWith('Using cache key:', 'test-key');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache MISS - generating new health data',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[HealthCheck] DB status: healthy, NATS status: connected',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getCacheWarmupStatus', () => {
    it('should return warmup status and cache metrics', async () => {
      const mockWarmupStatus = {
        isActive: true,
        lastRefresh: new Date(),
        nextDeepWarmup: new Date(Date.now() + 3600000),
      };

      cacheWarmupService.getRefreshStatus.mockReturnValue(mockWarmupStatus);
      cacheService.getMetrics.mockReturnValue(mockCacheMetrics);

      const result = await controller.getCacheWarmupStatus();

      expect(result).toEqual({
        timestamp: expect.any(String),
        warmupStatus: mockWarmupStatus,
        cacheMetrics: mockCacheMetrics,
      });
      expect(cacheWarmupService.getRefreshStatus).toHaveBeenCalledTimes(1);
      expect(cacheService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully in warmup status', async () => {
      const error = new Error('Warmup service failed');
      cacheWarmupService.getRefreshStatus.mockImplementation(() => {
        throw error;
      });
      const errorCacheMetrics = {
        hits: 0,
        misses: 0,
        sets: 0,
        dels: 0,
        errors: 1,
        hitRate: 0,
        totalOperations: 1,
      };
      cacheService.getMetrics.mockReturnValue(errorCacheMetrics);

      const result = await controller.getCacheWarmupStatus();

      expect(result).toEqual({
        timestamp: expect.any(String),
        error: 'Warmup service failed',
        warmupStatus: {
          isActive: false,
          lastRefresh: null,
          nextDeepWarmup: null,
        },
        cacheMetrics: errorCacheMetrics,
      });
    });

    it('should handle non-Error exceptions in warmup status', async () => {
      cacheWarmupService.getRefreshStatus.mockImplementation(() => {
        throw 'String error';
      });
      cacheService.getMetrics.mockReturnValue(mockCacheMetrics);

      const result = await controller.getCacheWarmupStatus();

      expect(result.error).toBe('String error');
    });
  });

  describe('triggerCacheWarmup', () => {
    it('should successfully trigger cache warmup', async () => {
      const mockWarmupResult = {
        status: 'started',
        warmedCategories: 5,
        duration: 1200,
      };
      cacheWarmupService.triggerWarmup.mockResolvedValue(mockWarmupResult);

      const result = await controller.triggerCacheWarmup();

      expect(cacheWarmupService.triggerWarmup).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        timestamp: expect.any(String),
        warmupResult: mockWarmupResult,
        message: 'Cache warmup triggered successfully',
      });
    });

    it('should handle warmup trigger errors gracefully', async () => {
      const error = new Error('Warmup trigger failed');
      cacheWarmupService.triggerWarmup.mockRejectedValue(error);

      const result = await controller.triggerCacheWarmup();

      expect(result).toEqual({
        timestamp: expect.any(String),
        error: 'Warmup trigger failed',
        message: 'Cache warmup trigger failed',
      });
    });

    it('should handle non-Error exceptions in warmup trigger', async () => {
      cacheWarmupService.triggerWarmup.mockRejectedValue('Warmup failed');

      const result = await controller.triggerCacheWarmup();

      expect(result.error).toBe('Warmup failed');
    });
  });

  describe('Integration Tests', () => {
    it('should handle all services being unavailable', async () => {
      jobRepository.healthCheck.mockRejectedValue(new Error('DB Error'));
      mockNatsClient._isConnected = false;
      cacheService.wrap.mockRejectedValue(new Error('Cache Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.getHealth();

      expect(result.status).toBe('degraded');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should maintain consistent timestamp format across all endpoints', () => {
      const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

      const welcomeResult = controller.getWelcome();
      expect(welcomeResult.timestamp).toMatch(timestampRegex);
    });

    it('should handle consistent responses from dependencies', () => {
      const mockData = { message: 'Consistent API response' };
      appService.getData.mockReturnValue(mockData);
      const result = controller.getData();
      expect(result).toEqual(mockData);
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle exceptions during health check database operations', async () => {
      jobRepository.healthCheck.mockRejectedValue(
        new Error('Database connection timeout'),
      );
      cacheService.wrap.mockImplementation(async (key, fn) => fn());

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await expect(controller.getHealth()).rejects.toThrow(
        'Database connection timeout',
      );

      consoleSpy.mockRestore();
    });

    it('should preserve error types through async operations', async () => {
      const customError = new TypeError('Invalid cache configuration');
      cacheService.healthCheck.mockRejectedValue(customError);
      cacheService.getMetrics.mockReturnValue(mockCacheMetrics);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await controller.getCacheMetrics();

      expect((result.cache as any).error).toBe('Invalid cache configuration');

      consoleSpy.mockRestore();
    });
  });
});
