import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Create a mock Mongoose model
 */
export function createMockModel() {
  return {
    new: jest.fn(),
    constructor: jest.fn(),
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    findByIdAndDelete: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
    findOneAndDelete: jest.fn().mockReturnThis(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    count: jest.fn(),
    countDocuments: jest.fn(),
    save: jest.fn(),
  };
}

/**
 * Create a mock ConfigService
 */
export function createMockConfigService(config: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string) => config[key]),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in config)) {
        throw new Error(`Config key "${key}" not found`);
      }
      return config[key];
    }),
  };
}

/**
 * Create a mock JWT service
 */
export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
    verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
    verifyAsync: jest.fn().mockResolvedValue({ userId: 'test-user-id' }),
    decode: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
  };
}

/**
 * Create a mock NATS client
 */
export function createMockNatsClient() {
  return {
    emit: jest.fn(),
    send: jest.fn().mockReturnValue({ toPromise: () => Promise.resolve({}) }),
    connect: jest.fn(),
    close: jest.fn(),
  };
}

/**
 * Create a mock Redis client
 */
export function createMockRedisClient() {
  const cache = new Map();
  return {
    get: jest.fn((key: string) => Promise.resolve(cache.get(key) || null)),
    set: jest.fn((key: string, value: any) => {
      cache.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      cache.delete(key);
      return Promise.resolve(1);
    }),
    exists: jest.fn((key: string) => Promise.resolve(cache.has(key) ? 1 : 0)),
    expire: jest.fn(() => Promise.resolve(1)),
    ttl: jest.fn(() => Promise.resolve(-1)),
  };
}

/**
 * Create a mock Cache Manager
 */
export function createMockCacheManager() {
  const cache = new Map();
  return {
    get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
    set: jest.fn((key: string, value: any) => {
      cache.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn((key: string) => {
      cache.delete(key);
      return Promise.resolve();
    }),
    reset: jest.fn(() => {
      cache.clear();
      return Promise.resolve();
    }),
  };
}

/**
 * Create a standard test module for a service
 */
export async function createServiceTestModule(
  serviceClass: any,
  providers: any[] = []
): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    providers: [
      serviceClass,
      {
        provide: ConfigService,
        useValue: createMockConfigService({
          JWT_SECRET: 'test-secret',
          DATABASE_URL: 'mongodb://localhost:27017/test',
          REDIS_URL: 'redis://localhost:6379',
        }),
      },
      ...providers,
    ],
  }).compile();

  return module;
}

/**
 * Create a standard test module for a controller
 */
export async function createControllerTestModule(
  controllerClass: any,
  providers: any[] = []
): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    controllers: [controllerClass],
    providers: [
      {
        provide: ConfigService,
        useValue: createMockConfigService(),
      },
      ...providers,
    ],
  }).compile();

  return module;
}

/**
 * Helper to create mock request and response objects
 */
export function createMockHttpContext() {
  const mockRequest = {
    headers: {},
    params: {},
    query: {},
    body: {},
    user: null,
    get: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    header: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
  };

  return { mockRequest, mockResponse };
}

/**
 * Helper to wait for async operations
 */
export function waitForAsync(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}