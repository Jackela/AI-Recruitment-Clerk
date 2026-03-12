# Security Test Environment Configuration Fix

## Problem

Security tests were hanging due to:

1. NATS client attempting to connect to localhost:4222 during module initialization
2. Cache-manager module resolution issues in Jest

## Solution

### 1. Jest Module Resolution (jest.preset.cjs)

Added moduleNameMapper for cache-manager related packages:

```javascript
moduleNameMapper: {
  '^@test/(.*)$': '<rootDir>/test/$1',
  '^@nestjs/cache-manager$': require.resolve('@nestjs/cache-manager'),
  '^cache-manager$': require.resolve('cache-manager'),
  '^cache-manager-redis-yet$': require.resolve('cache-manager-redis-yet'),
}
```

### 2. NATS Optional Mode (jest.setup.ts)

Set environment variable to prevent NATS connection from blocking tests:

```typescript
process.env.NATS_OPTIONAL = 'true';
```

This allows tests to continue even if NATS connection fails.

### 3. Security Test Configuration (apps/app-gateway/test/jest-security.config.ts)

Created dedicated Jest configuration for security tests with:

- Proper module resolution
- Extended timeout (60s)
- Sequential execution (maxWorkers: 1)
- Setup file for test environment

### 4. Security Test Setup (apps/app-gateway/test/security/setup.ts)

Pre-configured environment variables before any imports:

- NODE_ENV=test
- NATS_OPTIONAL=true
- DISABLE_REDIS=true
- JWT_SECRET for test tokens

## Files Modified

1. `/mnt/d/Code/AI-Recruitment-Clerk/jest.preset.cjs` - Added moduleNameMapper
2. `/mnt/d/Code/AI-Recruitment-Clerk/jest.setup.ts` - Added NATS_OPTIONAL

## Files Created

1. `/mnt/d/Code/AI-Recruitment-Clerk/apps/app-gateway/test/jest-security.config.ts` - Security test configuration
2. `/mnt/d/Code/AI-Recruitment-Clerk/apps/app-gateway/test/security/setup.ts` - Security test setup

## Running Security Tests

```bash
# Run all security tests
npx jest --config apps/app-gateway/test/jest-security.config.ts

# Run specific security test file
npx jest --config apps/app-gateway/test/jest-security.config.ts apps/app-gateway/test/security/nosql-injection.spec.ts

# Run with coverage
npx jest --config apps/app-gateway/test/jest-security.config.ts --coverage
```

## Verification

The fixes ensure:

- Cache modules resolve correctly in Jest
- NATS connection failures don't block tests
- Tests can run in isolated environment
- Module imports work without hanging
