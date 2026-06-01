/**
 * Bootstrap Helper Tests
 */
import {
  bootstrapNestJsMicroservice,
  bootstrapWithErrorHandling,
} from './bootstrap.helper';
import { Logger } from '@nestjs/common';

// Mock NestJS modules
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createMicroservice: jest.fn(),
  },
}));

jest.mock('@nestjs/microservices', () => ({
  Transport: {
    NATS: 'NATS',
  },
}));

describe('Bootstrap Helper', () => {
  let mockApp: {
    listen: jest.Mock;
    setGlobalPrefix: jest.Mock;
    enableCors: jest.Mock;
    getHttpAdapter: jest.Mock;
  };

  let mockCoreNestFactory: {
    create: jest.Mock;
  };

  let mockMicroserviceApp: {
    listen: jest.Mock;
  };

  beforeEach(() => {
    mockMicroserviceApp = {
      listen: jest.fn().mockResolvedValue(undefined),
    };

    mockApp = {
      listen: jest.fn().mockResolvedValue(undefined),
      setGlobalPrefix: jest.fn(),
      enableCors: jest.fn(),
      getHttpAdapter: jest.fn().mockReturnValue({
        getInstance: jest.fn().mockReturnValue({
          set: jest.fn(),
          disable: jest.fn(),
        }),
      }),
    };

    const { NestFactory } = jest.requireMock('@nestjs/core');
    NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

    // Setup dynamic import mock
    mockCoreNestFactory = {
      create: jest.fn().mockResolvedValue(mockApp),
    };
    jest.doMock('@nestjs/core', () => ({
      NestFactory: mockCoreNestFactory,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.dontMock('@nestjs/core');
    delete process.env.NATS_URL;
    delete process.env.PORT;
    delete process.env.NODE_ENV;
  });

  describe('bootstrapNestJsMicroservice', () => {
    class TestModule {}

    it('should bootstrap microservice with default options', async () => {
      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      const result = await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
      });

      expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
        TestModule,
        expect.objectContaining({
          transport: 'NATS',
          options: expect.objectContaining({
            servers: ['nats://localhost:4222'],
            name: 'test-service',
            queue: 'test-queue',
            jetstream: true,
            maxReconnectAttempts: 10,
            reconnectTimeWait: 2000,
          }),
        }),
      );
      expect(mockMicroserviceApp.listen).toHaveBeenCalled();
      expect(result).toBe(mockMicroserviceApp);
    });

    it('should use custom NATS URL from options', async () => {
      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
        natsUrl: 'nats://custom:4222',
      });

      expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
        TestModule,
        expect.objectContaining({
          options: expect.objectContaining({
            servers: ['nats://custom:4222'],
          }),
        }),
      );
    });

    it('should use NATS URL from environment variable', async () => {
      process.env.NATS_URL = 'nats://env-host:4222';

      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
      });

      expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
        TestModule,
        expect.objectContaining({
          options: expect.objectContaining({
            servers: ['nats://env-host:4222'],
          }),
        }),
      );
    });

    it('should disable JetStream when enableJetStream is false', async () => {
      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
        enableJetStream: false,
      });

      expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
        TestModule,
        expect.objectContaining({
          options: expect.objectContaining({
            jetstream: false,
          }),
        }),
      );
    });

    it('should use custom reconnection settings', async () => {
      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
        maxReconnectAttempts: 20,
        reconnectTimeWait: 5000,
      });

      expect(NestFactory.createMicroservice).toHaveBeenCalledWith(
        TestModule,
        expect.objectContaining({
          options: expect.objectContaining({
            maxReconnectAttempts: 20,
            reconnectTimeWait: 5000,
          }),
        }),
      );
    });

    it('should use custom logger when provided', async () => {
      const customLogger = new Logger('CustomLogger');
      const logSpy = jest.spyOn(customLogger, 'log');

      const { NestFactory } = jest.requireMock('@nestjs/core');
      NestFactory.createMicroservice.mockResolvedValue(mockMicroserviceApp);

      await bootstrapNestJsMicroservice(TestModule, {
        serviceName: 'test-service',
        queueName: 'test-queue',
        logger: customLogger,
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[bootstrap]'),
      );
    });
  });

  describe('bootstrapWithErrorHandling', () => {
    it('should call bootstrap function successfully', async () => {
      const mockBootstrap = jest.fn().mockResolvedValue(undefined);

      await bootstrapWithErrorHandling(mockBootstrap, 'TestService');

      expect(mockBootstrap).toHaveBeenCalled();
    });

    it('should exit process on bootstrap failure', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockBootstrap = jest
        .fn()
        .mockRejectedValue(new Error('Bootstrap failed'));

      await expect(
        bootstrapWithErrorHandling(mockBootstrap, 'TestService'),
      ).rejects.toThrow('process.exit called');

      expect(mockBootstrap).toHaveBeenCalled();
      mockExit.mockRestore();
    });

    it('should log error on bootstrap failure', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      const mockBootstrap = jest
        .fn()
        .mockRejectedValue(new Error('Bootstrap failed'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      try {
        await bootstrapWithErrorHandling(mockBootstrap, 'TestService');
      } catch {
        // Expected
      }

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start TestService'),
        expect.any(Error),
      );

      mockExit.mockRestore();
      errorSpy.mockRestore();
    });
  });
});
