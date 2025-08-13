# 🚀 AI Recruitment Clerk - Comprehensive API Testing Framework

This directory contains a comprehensive testing framework for the AI Recruitment Clerk API Gateway, including integration tests, performance tests, cross-service validation, and end-to-end workflows.

## 📁 Directory Structure

```
test/
├── api/                              # Basic API integration tests
│   └── api-test-suite.spec.ts       # Core API endpoint testing
├── integration/                      # Comprehensive integration tests
│   ├── comprehensive-api-integration.e2e.spec.ts    # Full workflow tests
│   └── cross-service-validation.e2e.spec.ts        # Service communication tests
├── performance/                      # Performance and load testing
│   └── api-performance-load.e2e.spec.ts            # Load testing and benchmarks
├── setup/                           # Test configuration and utilities
│   ├── global-setup.ts              # Global test environment setup
│   ├── global-teardown.ts           # Global cleanup
│   └── test-setup.ts                # Per-test setup and utilities
├── config/                          # Test configuration files
│   ├── custom-sequencer.js          # Test execution ordering
│   └── env-setup.js                 # Environment variable configuration
├── jest-integration.config.js       # Jest configuration for integration tests
├── run-integration-tests.sh         # Comprehensive test runner script
└── README.md                        # This file
```

## 🧪 Test Categories

### 1. API Integration Tests (`/api/`)

**Purpose**: Validate individual API endpoints and basic integration patterns.

**Coverage**:
- Authentication and authorization flows
- User management operations
- Resume processing endpoints
- Questionnaire management
- Analytics and reporting
- Incentive system
- Usage limits and rate limiting
- System health and monitoring
- Error handling and edge cases

**Key Features**:
- Mock data setup and cleanup
- Token-based authentication testing
- Role-based access control validation
- Response schema validation
- Basic performance assertions

### 2. Comprehensive Integration Tests (`/integration/`)

**Purpose**: End-to-end workflow testing and comprehensive business process validation.

**Coverage**:
- Complete user registration and onboarding workflows
- Full resume processing pipeline (upload → analysis → approval → matching)
- Questionnaire lifecycle (creation → publishing → submission → analytics)
- Cross-service data consistency validation
- Analytics event tracking and report generation
- Incentive processing workflows
- Usage limit enforcement across services
- Security and authorization integration
- Error recovery and resilience patterns

**Key Features**:
- Real business workflow simulation
- Multi-service integration testing
- Data consistency validation
- Performance monitoring during workflows
- Comprehensive error scenario testing

### 3. Cross-Service Validation (`/integration/cross-service-validation.e2e.spec.ts`)

**Purpose**: Validate communication and data consistency between microservices.

**Coverage**:
- Service-to-service communication patterns
- Data validation across service boundaries
- Circuit breaker and resilience testing
- Service health monitoring
- Authentication and authorization across services
- Performance monitoring for cross-service operations
- Failover and recovery mechanisms

**Key Features**:
- Mock service scenarios
- Network failure simulation
- Service timeout testing
- Data consistency checks
- Performance impact analysis

### 4. Performance and Load Testing (`/performance/`)

**Purpose**: Validate system performance under various load conditions and identify bottlenecks.

**Coverage**:
- Response time benchmarks for all endpoints
- Concurrent user load simulation
- Memory usage and resource monitoring
- Rate limiting threshold validation
- Database performance under load
- Cache effectiveness testing
- Performance regression detection

**Key Features**:
- Configurable load levels
- Performance metric collection
- Memory usage tracking
- Response time distribution analysis
- Bottleneck identification
- Performance regression alerts

## 🛠️ Test Configuration

### Jest Configuration (`jest-integration.config.js`)

- **Environment**: Node.js test environment
- **Timeout**: 60 seconds for integration tests
- **Coverage**: Comprehensive coverage reporting with thresholds
- **Reporters**: JUnit XML and HTML reports
- **Sequencing**: Custom test execution order for optimal performance

### Environment Setup

- **Database**: In-memory MongoDB for isolated testing
- **Authentication**: Test JWT tokens and mock credentials
- **Services**: Mock external service dependencies
- **Configuration**: Test-specific environment variables

### Global Setup and Teardown

- **Setup**: Database initialization, test data seeding, service mocking
- **Teardown**: Database cleanup, resource deallocation, temporary file removal

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure all services are built
npm run build:check
```

### Quick Start

```bash
# Run all integration tests with comprehensive reporting
npm run test:integration

# Run specific test categories
npm run test:integration:api        # Basic API tests only
npm run test:integration:e2e        # End-to-end workflow tests
npm run test:integration:performance # Performance and load tests
```

### Detailed Test Execution

```bash
# Run comprehensive test suite with full reporting
./apps/app-gateway/test/run-integration-tests.sh

# Run individual test files
npx jest --config=apps/app-gateway/test/jest-integration.config.js apps/app-gateway/test/api/api-test-suite.spec.ts

# Run with specific environment
NODE_ENV=test npm run test:integration

# Run with coverage reporting
npm run test:integration -- --coverage
```

### Advanced Options

```bash
# Run tests with detailed output
npm run test:integration -- --verbose

# Run specific test patterns
npx jest --config=apps/app-gateway/test/jest-integration.config.js --testNamePattern="Authentication"

# Run performance tests with extended timeout
npx jest --config=apps/app-gateway/test/jest-integration.config.js apps/app-gateway/test/performance/ --testTimeout=300000

# Run tests with memory monitoring
node --max-old-space-size=4096 node_modules/.bin/jest --config=apps/app-gateway/test/jest-integration.config.js
```

## 📊 Test Reporting

### Report Types

1. **Console Output**: Real-time test execution feedback with color-coded results
2. **JUnit XML**: Standard XML format for CI/CD integration (`test-results/integration-test-results.xml`)
3. **HTML Report**: Detailed HTML report with test breakdown (`test-results/integration-test-report.html`)
4. **Coverage Report**: Code coverage analysis (`coverage/integration/`)
5. **Performance Report**: Response time and resource usage metrics

### Report Locations

```
apps/app-gateway/
├── test-results/
│   ├── integration-test-results.xml      # JUnit XML for CI/CD
│   ├── integration-test-report.html      # Detailed HTML report
│   ├── test-summary.md                   # Markdown summary
│   └── integration-tests.log             # Detailed test logs
└── coverage/
    └── integration/
        ├── index.html                     # Coverage report entry point
        ├── lcov.info                      # LCOV coverage data
        └── coverage-summary.json          # Coverage metrics JSON
```

## 🔧 Configuration Options

### Environment Variables

```bash
# Test environment configuration
NODE_ENV=test                                    # Test environment
MONGODB_TEST_URL=mongodb://localhost:27017/test  # Test database URL
JWT_SECRET=test-jwt-secret                       # Test JWT secret
SUPPRESS_TEST_LOGS=false                         # Control log output during tests

# Performance testing configuration
PERFORMANCE_TEST_TIMEOUT=60000                   # Performance test timeout
LOAD_TEST_CONCURRENCY=10                         # Concurrent request count
MAX_FILE_SIZE=10485760                           # Max upload file size (10MB)

# Service configuration
RESUME_PARSER_URL=http://localhost:3001          # Resume parser service URL
JD_EXTRACTOR_URL=http://localhost:3002           # Job description extractor URL
SCORING_ENGINE_URL=http://localhost:3003         # Scoring engine URL
REPORT_GENERATOR_URL=http://localhost:3004       # Report generator URL
```

### Test Data Configuration

- **Users**: Multiple test user accounts with different roles (admin, hr_manager, user)
- **Organizations**: Test organizations with various configurations
- **Mock Data**: Realistic test data for resumes, questionnaires, and analytics
- **File Uploads**: Mock PDF and document files for testing file processing

## 🧰 Test Utilities and Helpers

### Custom Matchers

```typescript
// API response validation
expect(response).toBeValidApiResponse();

// Performance assertions
expect(responseTime).toHavePerformanceWithin(1000); // Within 1 second
```

### Global Test Utilities

```typescript
// Available in all test files via global.testUtils
testUtils.generateTestEmail('prefix')     // Generate unique test email
testUtils.generateTestUserId()           // Generate unique user ID
testUtils.createMockFile(1024)          // Create mock file buffer
testUtils.measurePerformance(operation) // Measure operation performance
testUtils.cleanupTestData(collections) // Cleanup test data
```

### Performance Monitoring

```typescript
// Built-in performance tracking
const { result, responseTime, memoryDelta } = await measurePerformance('category', async () => {
    return await request(app).get('/endpoint');
});
```

## 🐛 Debugging Tests

### Debug Configuration

```bash
# Run tests with debug output
DEBUG=* npm run test:integration

# Run single test file with debugging
node --inspect-brk node_modules/.bin/jest --config=apps/app-gateway/test/jest-integration.config.js --runInBand apps/app-gateway/test/api/api-test-suite.spec.ts

# Enable detailed Jest output
npm run test:integration -- --verbose --no-coverage
```

### Common Issues and Solutions

1. **Database Connection Issues**:
   - Ensure MongoDB is running or in-memory database is properly configured
   - Check `MONGODB_TEST_URL` environment variable

2. **Test Timeouts**:
   - Increase test timeout in jest configuration
   - Check for hanging promises or unclosed connections

3. **Memory Issues**:
   - Use `--max-old-space-size` Node.js flag for large test suites
   - Enable garbage collection between tests

4. **Service Communication Failures**:
   - Verify all required services are running
   - Check service URL configuration
   - Review network connectivity and firewall settings

## 📈 Performance Benchmarks

### Response Time Targets

| Endpoint Category | Target Response Time | Performance Threshold |
|-------------------|---------------------|----------------------|
| Authentication    | < 1 second          | 95th percentile < 2s |
| User Profile      | < 800ms             | 95th percentile < 1.5s |
| Resume Upload     | < 8 seconds         | 95th percentile < 15s |
| Search Operations | < 2 seconds         | 95th percentile < 4s |
| Analytics Dashboard | < 3 seconds       | 95th percentile < 6s |
| Health Checks     | < 500ms             | 95th percentile < 1s |

### Load Testing Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Concurrent Users | 50+ | 100+ |
| Requests per Second | 100+ | 200+ |
| Error Rate | < 1% | < 5% |
| Memory Usage | < 512MB | < 1GB |
| CPU Utilization | < 70% | < 90% |

## 🔄 Continuous Integration

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Run Integration Tests
  run: npm run test:integration
  
- name: Upload Test Results
  uses: actions/upload-artifact@v2
  with:
    name: test-results
    path: apps/app-gateway/test-results/

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: apps/app-gateway/coverage/integration/lcov.info
```

### Quality Gates

- **Code Coverage**: Minimum 80% line coverage, 75% function coverage
- **Test Success Rate**: 100% for API tests, 95% for integration tests
- **Performance Regression**: No endpoint should exceed 150% of baseline
- **Security**: All security tests must pass

## 📚 Additional Resources

### Documentation

- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest API](https://github.com/visionmedia/supertest)

### Best Practices

1. **Test Isolation**: Each test should be independent and not rely on others
2. **Data Management**: Use fresh test data for each test run
3. **Async Handling**: Properly handle promises and async operations
4. **Resource Cleanup**: Always clean up resources after tests
5. **Error Scenarios**: Test both success and failure paths
6. **Performance Monitoring**: Include performance assertions in tests
7. **Documentation**: Keep tests well-documented and maintainable

### Contributing

When adding new tests:

1. Follow existing test patterns and naming conventions
2. Include both positive and negative test cases
3. Add performance assertions where relevant
4. Update documentation for new test categories
5. Ensure proper cleanup and resource management
6. Include meaningful error messages and assertions

---

**🎉 Happy Testing!** This comprehensive testing framework ensures the reliability, performance, and quality of the AI Recruitment Clerk API system.