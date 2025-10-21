// Jest global setup - Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Pin MongoDB binary version for mongodb-memory-server to avoid fassert issues on some platforms
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
process.env.MONGOMS_DISABLE_MD5_CHECK = process.env.MONGOMS_DISABLE_MD5_CHECK || '1';

// Test environment configuration for microservices
process.env.NATS_URL = process.env.NATS_URL || 'nats://localhost:4222';
process.env.MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/ai-recruitment-test';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-api-key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-32-characters';

// Mock external services in test mode
process.env.MOCK_EXTERNAL_SERVICES = 'true';
process.env.DISABLE_NATS = 'true';
process.env.USE_REDIS_CACHE = 'false';

// Global mocks
const mockPdfParse = jest.fn(async () => ({
  text: '',
  numpages: 1,
  version: 'mock',
  info: {},
  metadata: null,
}));

jest.mock('pdf-parse', () => ({
  __esModule: true,
  default: mockPdfParse,
  mockPdfParse,
}));

global.__PDF_PARSE_MOCK__ = mockPdfParse;

const { Module } = require('@nestjs/common');

const createCodec = () => ({
  encode: (value) => Buffer.from(JSON.stringify(value)),
  decode: (value) => {
    if (typeof value === 'string') {
      return value;
    }
    const bufferValue = Buffer.isBuffer(value)
      ? value
      : Buffer.from(value);
    return bufferValue.toString('utf8');
  },
});

class MockNatsClientService {
  constructor() {
    this.isConnected = true;
    this.serviceName = 'mock-nats-client';
    this.autoAckSubscriptions = false;
    this.subscriptions = new Map();
    this.publish = jest.fn(async (subject, payload, options = {}) => {
      const messageId = options?.messageId || `mock-${subject}-${Date.now()}`;
      const metadata = {
        subject,
        timestamp: new Date(),
        processingTimeMs: 0,
      };
      return {
        success: true,
        messageId,
        sequence: this.publish.mock.calls.length + 1,
        metadata,
        subject,
        payload,
      };
    });
    this.emit = this.publish;
    this.subscribe = jest.fn(async (subject, handler, options = {}) => {
      const key = `${subject}:${this.subscriptions.size + 1}`;
      this.subscriptions.set(key, { handler, options });
      if (handler && this.autoAckSubscriptions) {
        await handler({ subject, payload: null }, { subject, sequence: 1 });
      }
    });
  }

  async initialize(customConfig = {}) {
    if (customConfig.serviceName) {
      this.serviceName = customConfig.serviceName;
    }
    this.isConnected = true;
  }

  async shutdown() {
    this.isConnected = false;
    this.subscriptions.clear();
  }

  async getHealthStatus() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      lastCheckedAt: new Date().toISOString(),
      serviceName: this.serviceName,
      metrics: {
        publishedMessages: this.publish.mock.calls.length,
        subscriptions: this.subscriptions.size,
      },
    };
  }

  getServiceName() {
    return this.serviceName;
  }

  get codec() {
    return createCodec();
  }
}

class MockNatsConnectionManager {
  isConnected = true;
  connect = jest.fn(async () => {
    this.isConnected = true;
  });
  disconnect = jest.fn(async () => {
    this.isConnected = false;
  });
  getCodec() {
    return createCodec();
  }
  async getHealthStatus() {
    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      lastError: null,
      stats: {},
    };
  }
}

class MockNatsStreamManager {
  ensureStreamsExist = jest.fn(async () => ({}));
  healthCheck = jest.fn(async () => ({
    streams: [],
    status: 'ok',
  }));
}

let MockNatsClientModule = class MockNatsClientModule {};
Module({
  providers: [
    MockNatsConnectionManager,
    MockNatsStreamManager,
    MockNatsClientService,
  ],
  exports: [
    MockNatsConnectionManager,
    MockNatsStreamManager,
    MockNatsClientService,
  ],
})(MockNatsClientModule);

MockNatsClientModule.forRoot = function (options = {}) {
  return {
    module: MockNatsClientModule,
    providers: [
      {
        provide: MockNatsClientService,
        useFactory: () => {
          const instance = new MockNatsClientService();
          if (options.serviceName) {
            instance.serviceName = options.serviceName;
          }
          return instance;
        },
      },
      {
        provide: MockNatsConnectionManager,
        useClass: MockNatsConnectionManager,
      },
      {
        provide: MockNatsStreamManager,
        useClass: MockNatsStreamManager,
      },
    ],
    exports: [
      MockNatsClientService,
      MockNatsConnectionManager,
      MockNatsStreamManager,
    ],
  };
};

MockNatsClientModule.forFeature = function () {
  return {
    module: MockNatsClientModule,
  };
};

jest.mock('@ai-recruitment-clerk/shared-nats-client', () => ({
  __esModule: true,
  NatsClientModule: MockNatsClientModule,
  NatsClientService: MockNatsClientService,
  NatsConnectionManager: MockNatsConnectionManager,
  NatsStreamManager: MockNatsStreamManager,
  DEFAULT_STREAMS: [],
  RetentionPolicy: {},
  DiscardPolicy: {},
  DeliverPolicy: {},
  AckPolicy: {},
  StringCodec: class {
    encode(value) {
      return Buffer.from(
        typeof value === 'string' ? value : JSON.stringify(value),
      );
    }
    decode(value) {
      return Buffer.isBuffer(value)
        ? value.toString('utf8')
        : Buffer.from(value).toString('utf8');
    }
  },
}));

global.__NATS_CLIENT_SERVICE__ = MockNatsClientService;

// Global test configuration
global.beforeAll = global.beforeAll || (() => {});
global.afterAll = global.afterAll || (() => {});
