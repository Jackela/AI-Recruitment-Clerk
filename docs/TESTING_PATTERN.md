# Testing Pattern Guide

This document defines the standard testing patterns used in AI Recruitment Clerk.

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
    │   └── cross-service-validation.e2e.spec.ts
    ├── performance/
    │   └── api-performance-load.e2e.spec.ts
    ├── production/
    │   └── production-readiness.e2e.spec.ts
    └── security/
        ├── auth-security.e2e.spec.ts
        ├── data-encryption-security.e2e.spec.ts
        └── security.integration.spec.ts
```

## Naming Conventions

| Test Type | Naming Pattern | Location |
|-----------|----------------|----------|
| Unit Tests | `{name}.spec.ts` | Co-located with source file |
| Integration Tests | `{name}.integration.spec.ts` | Feature folder or `integration/` subfolder |
| E2E Tests | `{category}-{scenario}.e2e.spec.ts` | `test/` subfolder organized by category |

## Test Categories

### 1. Unit Tests (`.spec.ts`)

**Purpose**: Test isolated functions and classes

**Pattern**: Co-locate with the file being tested

```typescript
// apps/app-gateway/src/jobs/jobs.service.spec.ts
describe('JobsService', () => {
  let service: JobsService;
  let jobRepository: jest.Mocked<JobRepository>;

  beforeEach(async () => {
    const mocks = createMockedDependencies();
    service = new JobsService(...mocks);
  });

  it('should create a job', async () => {
    const result = await service.create(createJobDto);
    expect(result).toHaveProperty('id');
  });
});
```

**Key Characteristics**:
- Mock all external dependencies
- No database or network calls
- Fast execution (< 100ms per test)

### 2. Integration Tests (`.integration.spec.ts`)

**Purpose**: Test interaction between components within a service

**Pattern**: Place in feature folder or `integration/` subfolder

```typescript
// apps/jd-extractor-svc/src/integration/jd-extractor.nats.spec.ts
describe('JD Extractor NATS integration', () => {
  let controller: JdEventsController;
  let natsStub: JdExtractorNatsServiceStub;

  beforeEach(async () => {
    natsStub = new JdExtractorNatsServiceStub();
    controller = new JdEventsController(natsStub, llmServiceMock);
  });

  it('subscribes to job submissions and publishes extracted event', async () => {
    await controller.onModuleInit();
    await natsStub.jobSubmissionHandler({ jobId: 'job-123', jdText: 'Analyze this JD' });
    expect(natsStub.publishAnalysisJdExtracted).toHaveBeenCalled();
  });
});
```

**Key Characteristics**:
- Test real component interaction
- Mock external services (NATS, database)
- Verify event publishing and handling

### 3. E2E Tests (`.e2e.spec.ts`)

**Purpose**: Test complete workflows across services

**Pattern**: Place in `test/` subfolder organized by category

```typescript
// apps/app-gateway/test/integration/comprehensive-api-integration.e2e.spec.ts
describe('Comprehensive API Integration Tests', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should process resume upload through complete workflow', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/jobs/123/resumes')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', testResumePath)
      .expect(201);
    expect(response.body).toHaveProperty('resumeId');
  });
});
```

**Key Characteristics**:
- Full NestJS application bootstrap
- Real HTTP requests via supertest
- Test database operations
- Test authentication flows

### 4. Specialized E2E Categories

| Category | Purpose | Example |
|----------|---------|---------|
| `security/` | Security vulnerability testing | auth-security.e2e.spec.ts |
| `performance/` | Load and performance testing | api-performance-load.e2e.spec.ts |
| `production/` | Production readiness checks | production-readiness.e2e.spec.ts |
| `integration/` | Cross-service integration | contracts.e2e.spec.ts |

## Mock Patterns

### Repository Mock

```typescript
const createMockRepository = () => ({
  create: jest.fn().mockResolvedValue({ id: 'test-id', ...data }),
  findById: jest.fn().mockResolvedValue(null),
  update: jest.fn().mockResolvedValue({ id: 'test-id', ...updatedData }),
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

## Test Fixtures

Service-specific fixtures should be co-located in a `testing/` folder:

```
apps/{service-name}/src/testing/
├── test-fixtures.spec.ts    # Reusable test data factories
└── test-helpers.spec.ts      # Common test utilities
```

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
```

## Best Practices

1. **Co-locate unit tests** with the source file for discoverability
2. **Use descriptive test names** that explain what is being tested
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Clean up mocks** in `afterEach()` to prevent test leakage
5. **Use factories** for test data instead of hardcoded values
6. **Test error cases** along with happy paths
7. **Avoid mocking tested code** - only mock external dependencies
