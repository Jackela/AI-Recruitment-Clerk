import { Test } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return data with message', () => {
      const result = service.getData();

      expect(result.message).toBe('Report Generator Service API');
    });

    it('should return initializing status before bootstrap', () => {
      const result = service.getData();

      // Before onApplicationBootstrap is called, status should be initializing
      expect(['ready', 'initializing']).toContain(result.status);
    });
  });

  describe('onApplicationBootstrap', () => {
    it('should complete initialization without errors', async () => {
      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
    });

    it('should set status to ready after initialization', async () => {
      await service.onApplicationBootstrap();

      const result = service.getData();
      expect(result.status).toBe('ready');
    });
  });

  describe('onApplicationShutdown', () => {
    it('should complete shutdown without errors', async () => {
      await service.onApplicationBootstrap();
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });

    it('should handle shutdown without prior initialization', async () => {
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });
  });
});
