/**
 * Security Test Setup
 * Special configuration for security tests to avoid hanging issues
 */

// Set critical environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.NATS_OPTIONAL = 'true';
process.env.DISABLE_REDIS = 'true';
process.env.SKIP_DB = 'true';
process.env.JWT_SECRET = 'test-secret-key-for-security-tests';

// Stabilize MongoDB Memory Server
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || '7.0.5';
process.env.MONGOMS_DISABLE_MD5_CHECK = '1';
process.env.MONGOMS_DOWNLOAD_TIMEOUT = '60000';

// Suppress console noise in tests
if (process.env.SUPPRESS_TEST_LOGS === 'true' || process.env.CI) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('error') ||
      msg.includes('Error') ||
      msg.includes('FAIL')
    ) {
      originalLog.apply(console, args);
    }
  };

  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('NATS') ||
      msg.includes('Redis') ||
      msg.includes('Mongo')
    ) {
      // Suppress expected connection errors
      return;
    }
    originalError.apply(console, args);
  };
}

// Disable NestJS logger noise
try {
  const { Logger } = require('@nestjs/common');
  if (Logger?.overrideLogger) {
    Logger.overrideLogger(['error']);
  }
} catch {
  // Ignore if Nest isn't available
}

console.log('🔒 Security test environment configured');
