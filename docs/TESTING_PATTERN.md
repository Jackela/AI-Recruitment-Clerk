# Testing Pattern Guide

This document defines the standard testing patterns used in AI Recruitment Clerk for NestJS integration and E2E testing.

## Table of Contents

1. [Folder Structure](#folder-structure)
2. [NestJS Integration Test Template](#nestjs-integration-test-template)
3. [Mongoose Connection Cleanup Pattern](#mongoose-connection-cleanup-pattern)
4. [NATS Testing Pattern](#nats-testing-pattern)
5. [Circuit Breaker Testing Pattern](#circuit-breaker-testing-pattern)
6. [Unit Testing Patterns](#unit-testing-patterns)
7. [Mock Patterns](#mock-patterns)
8. [Running Tests](#running-tests)
9. [Best Practices](#best-practices)

---

## Folder Structure

```
apps/{service-name}/
├── src/
│   ├── {feature}/
│   │   ├── {feature}.service.ts
│   │   ├── {feature}.service.spec.ts         # Unit tests (co-located)
│   │   ├── {feature}.controller.ts
│   │   └── {feature}.controller.spec.ts     # Unit tests (co-located)
│   ├── {feature}/
│   │   ├── {feature}.integration.spec.ts    # Integration tests (feature-level)
│   └── integration/
│       └── {feature}-integration.spec.ts    # Cross-feature integration tests
└── test/
    ├── integration/
    │   ├── comprehensive-api-integration.e2e.spec.ts
    │   ├── contracts.e2e.spec.ts
    │   ├── cross-service-validation.e2e.spec.ts
    │   └── semantic-cache.e2e.spec.ts
    ├── performance/
    │   └── api-performance-load.e2e.spec.ts
    ├── production/
    │   └── production-readiness.e2e.spec.ts
    └── security/
        ├── auth-security.e2e.spec.ts
        ├── data-encryption-security.e2e.spec.ts
        └── security.integration.spec.ts
```

---

## NestJS Integration Test Template

### Basic E2E Test Structure

```typescript
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { getConnection } from 'mongoose';

describe('Feature Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testEntityId: string;

  // Test data constants
  const testUser = {
    email: 'integration.test@example.com',
    password: 'IntegrationTest123!',
    name: 'Integration Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/test-db',
        ),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
    // CRITICAL: Explicitly close Mongoose connection to prevent open-handle warnings
    const connection = getConnection('test-db');
    if (connection?.readyState === 1) {
      await connection.close();
    }
  });

  async function setupTestData() {
    // Create test users, authenticate, etc.
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    authToken = loginResponse.body.data.accessToken;
  }

  async function cleanupTestData() {
    // Clean up test data
    console.log('Integration test cleanup completed');
  }

  describe('Feature Workflow', () => {
    it('should complete the full workflow', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/resource')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Resource' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');

      testEntityId = response.body.data.id;
    });
  });
});
```

### Using MongoMemoryServer for Isolated Tests

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Isolated E2E Test', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoServer.getUri()),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Close mongoose connection first
    const connection = app.get<any>('MongooseModule').getConnection?.();
    if (connection?.readyState === 1) {
      await connection.close();
    }
    await app.close();
    await mongoServer.stop();
  });
});
```

---

## Mongoose Connection Cleanup Pattern

### The Problem

NestJS `app.close()` does NOT automatically close Mongoose connections. This causes:
- Jest open-handle warnings
- Test database locks
- Resource leaks in CI/CD

### The Solution Pattern

```typescript
import { getConnection } from 'mongoose';

afterAll(async () => {
  // Step 1: Close the NestJS application
  await app.close();

  // Step 2: Explicitly close Mongoose connection
  // Use the database name from your connection string
  const connection = getConnection('your-database-name');

  if (connection?.readyState === 1) {
    await connection.close();
  }
});
```

### Getting the Connection Name

```typescript
// Method 1: Use environment variable
const dbName = new URL(process.env.MONGODB_TEST_URL).pathname.replace('/', '');
const connection = getConnection(dbName);

// Method 2: Get from module (when using MongoMemoryServer)
const connection = app.get<any>('MongooseModule').getConnection?.();

// Method 3: Use default connection
const connection = getConnection(); // Gets default connection
```

### Multi-Database Cleanup

```typescript
afterAll(async () => {
  await app.close();

  // Close all connections
  const connections = ['test-db', 'test-db-2', 'cache-db'];

  await Promise.all(
    connections.map(async (dbName) => {
      const connection = getConnection(dbName);
      if (connection?.readyState === 1) {
        await connection.close();
      }
    })
  );
});
```

### Pattern Reference: semantic-cache.e2e.spec.ts

```typescript
afterAll(async () => {
  // Close mongoose connection first to prevent open-handle warnings
  const connection = app.get<any>('MongooseModule').getConnection?.();
  if (connection?.readyState === 1) {
    await connection.close();
  }
  await app.close();
  await mongoServer.stop();
});
```

---

## NATS Testing Pattern

### Unit Testing NATS Services

When testing NATS services, mock the **lowest-level** methods from `NatsClientService`, not intermediate protected methods.

```typescript
import { ResumeParserNatsService } from './resume-parser-nats.service';
import type {
  NatsConnectionManager,
  NatsStreamManager,
} from '@ai-recruitment-clerk/shared-nats-client';

describe('ResumeParserNatsService', () => {
  let service: ResumeParserNatsService;
  let mockPublish: jest.Mock;
  let mockSubscribe: jest.Mock;
  let mockGetHealthStatus: jest.Mock;

  beforeEach(() => {
    // Mock the lowest level methods from NatsClientService
    mockPublish = jest.fn().mockResolvedValue({
      success: true,
      messageId: 'test-msg-id',
    });
    mockSubscribe = jest.fn().mockResolvedValue(undefined);
    mockGetHealthStatus = jest.fn().mockResolvedValue({
      connected: true,
      servers: [],
      lastOperationTime: new Date(),
    });

    // Create mock dependencies
    const mockConfigService = {
      get: jest.fn(),
    } as unknown as ConfigService;

    const mockConnectionManager = {
      getConnection: jest.fn().mockResolvedValue({}),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    } as unknown as NatsConnectionManager;

    const mockStreamManager = {
      ensureStream: jest.fn().mockResolvedValue(undefined),
      createConsumer: jest.fn().mockResolvedValue(undefined),
    } as unknown as NatsStreamManager;

    // Create service instance
    service = new ResumeParserNatsService(
      mockConfigService,
      mockConnectionManager,
      mockStreamManager,
    ) as any;

    // Override the lowest level methods
    const mockableService = service as unknown as {
      publish: typeof mockPublish;
      subscribe: typeof mockSubscribe;
      getHealthStatus: typeof mockGetHealthStatus;
    };
    mockableService.publish = mockPublish;
    mockableService.subscribe = mockSubscribe;
    mockableService.getHealthStatus = mockGetHealthStatus;
  });

  describe('publishAnalysisResumeParsed', () => {
    it('should publish event with correct structure', async () => {
      const mockEvent = {
        jobId: 'job-123',
        resumeId: 'resume-456',
        resumeDto: { name: 'John Doe' },
        processingTimeMs: 1500,
      };

      const result = await service.publishAnalysisResumeParsed(mockEvent);

      expect(result).toEqual({ success: true, messageId: 'test-msg-id' });

      expect(mockPublish).toHaveBeenCalledWith(
        'analysis.resume.parsed',
        expect.objectContaining({
          jobId: 'job-123',
          resumeId: 'resume-456',
          timestamp: expect.any(String),
        }),
        expect.objectContaining({
          messageId: expect.stringContaining('resume-parsed-resume-456'),
          timeout: 5000,
        }),
      );
    });
  });
});
```

### Integration Testing with NATS

```typescript
describe('NATS Integration', () => {
  let natsService: AppGatewayNatsService;

  beforeAll(async () => {
    natsService = {
      publishJobJdSubmitted: jest.fn().mockResolvedValue({ success: true }),
      subscribeToAnalysisCompleted: jest.fn().mockResolvedValue(undefined),
      isConnected: true,
    } as unknown as jest.Mocked<AppGatewayNatsService>;
  });

  it('should publish event and handle subscription', async () => {
    const handler = jest.fn();

    await service.subscribeToEvents(handler);

    expect(natsService.subscribeToAnalysisCompleted).toHaveBeenCalledWith(
      'analysis.completed',
      handler,
      expect.objectContaining({
        durableName: expect.stringContaining('durable-'),
        queueGroup: expect.any(String),
        maxDeliver: 3,
      }),
    );
  });
});
```

### NATS Event Structure Pattern

All NATS events should follow this structure:

```typescript
{
  // Event identifier
  eventType: 'analysis.resume.parsed',
  timestamp: '2024-02-04T12:00:00.000Z',

  // Business data
  jobId: 'job-123',
  resumeId: 'resume-456',
  resumeDto: { ... },

  // Metadata
  service: 'resume-parser-svc',
  processingTimeMs: 1500,
  confidence: 0.92,
}

// Publish options (JetStream)
{
  messageId: 'resume-parsed-resume-456-1234567890-abc123def',
  timeout: 5000,
  headers: {
    'resume-id': 'resume-456',
    'job-id': 'job-123',
    'source-service': 'resume-parser-svc',
    'event-type': 'analysis.resume.parsed',
  },
}
```

---

## Circuit Breaker Testing Pattern

The codebase uses `CircuitBreaker` and `RetryUtility` from `@ai-recruitment-clerk/shared-dtos`.

### Testing Circuit Breaker States

```typescript
import { CircuitBreaker, RetryUtility } from '@ai-recruitment-clerk/shared-dtos';

describe('Circuit Breaker Pattern', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = CircuitBreaker.getInstance('test-service', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      monitoringPeriod: 60000,
    });
  });

  it('should open circuit after failure threshold', async () => {
    const failingOperation = async () => {
      throw new Error('Service unavailable');
    };

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (e) {
        // Expected failures
      }
    }

    // Circuit should be OPEN
    expect(circuitBreaker.getState()).toBe('OPEN');
    expect(circuitBreaker.getFailures()).toBe(3);
  });

  it('should reject calls when circuit is open', async () => {
    const operation = async () => 'success';

    // Assume circuit is already open
    if (circuitBreaker.getState() === 'OPEN') {
      await expect(circuitBreaker.execute(operation)).rejects.toThrow(
        'Circuit breaker test-service is OPEN',
      );
    }
  });

  it('should transition to HALF_OPEN after recovery timeout', async () => {
    // Circuit is open, wait for recovery timeout
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const successfulOperation = async () => 'success';

    const result = await circuitBreaker.execute(successfulOperation);

    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
    expect(circuitBreaker.getFailures()).toBe(0);
  });
});
```

### Testing Retry with Exponential Backoff

```typescript
describe('Retry Utility Pattern', () => {
  it('should retry operation on retriable errors', async () => {
    let attempts = 0;
    const flakyOperation = async () => {
      attempts++;
      if (attempts < 3) {
        const error: any = new Error('Connection timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      }
      return 'success';
    };

    const result = await RetryUtility.withExponentialBackoff(flakyOperation, {
      maxAttempts: 5,
      baseDelayMs: 10,
      maxDelayMs: 100,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should not retry on non-retriable errors', async () => {
    const operation = async () => {
      const error: any = new Error('Not found');
      error.status = 404;
      throw error;
    };

    await expect(RetryUtility.withExponentialBackoff(operation)).rejects.toThrow(
      'Not found',
    );
  });
});
```

### Using Circuit Breaker Decorator in Tests

```typescript
import { WithCircuitBreaker } from '@ai-recruitment-clerk/shared-dtos';

class TestService {
  @WithCircuitBreaker('external-api', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
  })
  async callExternalAPI(data: unknown): Promise<string> {
    // Implementation
  }
}

describe('Service with Circuit Breaker', () => {
  it('should use circuit breaker for external calls', async () => {
    const service = new TestService();

    // Mock external API to fail
    jest.spyOn(service as any, 'callExternalAPI')
      .mockRejectedValue(new Error('API down'));

    // Test circuit breaker behavior
  });
});
```

### Gating Circuit Breaker Error Messages in Tests

```typescript
// In jest.setup.ts
const ignoredConsoleErrorPatterns = [
  'Circuit breaker triggered for handleResumeSubmitted:',
  'Error recording usage:',
  'Error adding bonus quota:',
];

// In your test
describe('Service Tests', () => {
  it('should handle circuit breaker open state gracefully', async () => {
    // This test will trigger circuit breaker errors
    // The error messages will be gated by jest.setup.ts
    const result = await service.processRequest(data);

    expect(result).toHaveProperty('fallback');
  });
});
```

---

## Unit Testing Patterns

### Isolated Service Testing

```typescript
import { ParsingService } from './parsing.service';
import type { VisionLlmService } from '../vision-llm/vision-llm.service';

// Mock external modules
jest.mock('pdf-parse', () => jest.fn());

const buildService = () => {
  const mocks = {
    vision: { parseResumeText: jest.fn() } as unknown as VisionLlmService,
    pdf: { extractText: jest.fn() } as unknown as PdfTextExtractorService,
    grid: { downloadFile: jest.fn() } as unknown as GridFsService,
    nats: {
      publishAnalysisResumeParsed: jest.fn(),
      publishJobResumeFailed: jest.fn(),
    } as unknown as ResumeParserNatsService,
  };

  const svc = new ParsingService(
    mocks.vision,
    mocks.pdf,
    mocks.grid,
    // ... other dependencies
  );

  return { svc, mocks };
};

describe('ParsingService (isolated)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process resume and publish parsed event', async () => {
    const { svc, mocks } = buildService();

    mocks.grid.downloadFile.mockResolvedValue(Buffer.from('%PDF-1.4 test'));
    mocks.pdf.extractText.mockResolvedValue('resume text');
    mocks.nats.publishAnalysisResumeParsed.mockResolvedValue({ success: true });

    await svc.handleResumeSubmitted(event);

    expect(mocks.nats.publishAnalysisResumeParsed).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1' }),
    );
  });
});
```

### Negative and Boundary Testing

```typescript
describe('Negative Tests - File Download Failures', () => {
  it('should handle GridFS download failure', async () => {
    const { svc, mocks } = buildService();

    mocks.grid.downloadFile.mockRejectedValue(
      new Error('File not found in GridFS'),
    );

    await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
      'File not found in GridFS',
    );
    expect(mocks.nats.publishJobResumeFailed).toHaveBeenCalled();
  });

  it('should reject corrupted PDF files', async () => {
    const { svc, mocks } = buildService();

    mocks.grid.downloadFile.mockResolvedValue(Buffer.from('NOT A VALID PDF'));

    await expect(svc.handleResumeSubmitted(event)).rejects.toThrow(
      'FILE_VALIDATION_FAILED',
    );
  });
});

describe('Boundary Tests - File Size Limits', () => {
  it('should handle minimum valid PDF', async () => {
    const { svc, mocks } = buildService();

    const minBuffer = Buffer.from('%PDF-1.4\n%%EOF');
    mocks.grid.downloadFile.mockResolvedValue(minBuffer);

    await svc.handleResumeSubmitted(event);

    expect(mocks.pdf.extractText).toHaveBeenCalled();
  });
});
```

---

## Mock Patterns

### Repository Mock

```typescript
const createMockRepository = () => ({
  create: jest.fn().mockResolvedValue({ id: 'test-id', ...data }),
  findById: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ id: 'test-id', ...updatedData }),
  delete: jest.fn().mockResolvedValue({ deleted: true }),
});
```

### NATS Service Mock

```typescript
const createMockNatsService = () => ({
  publishEvent: jest.fn().mockResolvedValue({ success: true }),
  publishErrorEvent: jest.fn().mockResolvedValue({ success: true }),
  subscribeToEvents: jest.fn(),
  isConnected: true,
});
```

### Cache Service Mock

```typescript
const createMockCacheService = () => ({
  wrap: jest.fn(async (_key, fn) => fn()),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(true),
  generateKey: jest.fn((prefix, ...parts) => [prefix, ...parts].join(':')),
});
```

---

## Running Tests

```bash
# All unit tests
npm run test

# E2E tests
npm run test:e2e

# Specific service
npx nx test {service-name}
npx nx e2e {service-name}-e2e

# With coverage
npm run test -- --coverage

# Watch mode
npm run test -- --watch

# Debug tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Best Practices

### 1. Test Organization

- **Co-locate unit tests** with the source file for discoverability
- **Integration tests** go in `test/integration/` folder
- **Use descriptive test names** that explain what is being tested

### 2. Setup/Teardown

- **Always close Mongoose connections** in `afterAll()` to prevent open-handle warnings
- **Clean up test data** after each test or test suite
- **Use `beforeEach`** to reset mock state between tests

### 3. Mocking Strategy

- **Mock at boundaries**: external services, databases, message queues
- **Don't mock the code under test**: only mock dependencies
- **For NATS services**: mock lowest-level methods (`publish`, `subscribe`) not intermediate protected methods

### 4. Test Coverage

- **Test error cases** along with happy paths
- **Use AAA pattern**: Arrange, Act, Assert
- **Use factories** for test data instead of hardcoded values

### 5. CI/CD Considerations

- Tests should run quickly (< 2s per unit test)
- E2E tests should use in-memory databases when possible
- Always run tests before committing
- Ensure clean teardown to prevent CI resource leaks

### 6. Console Error Gating

Only gate errors that are **expected from negative tests**:

```typescript
// In jest.setup.ts
ignoredConsoleErrorPatterns: [
  'Error recording usage:',  // From negative DB tests
  'Circuit breaker triggered:',  // From circuit breaker tests
]
```

### 7. TypeScript Strict Mode

All tests must compile with `strict: true` in tsconfig:
- No `any` types without explicit justification
- Proper type annotations for mocks
- Use `jest.Mocked<T>` for typed mocks
