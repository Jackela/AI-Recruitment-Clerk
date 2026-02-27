/**
 * @file Scoring Engine Service Jest Setup
 * @description Service-specific test setup. Extends shared jest.setup.ts from root.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables for this service
config({ path: join(__dirname, '.env.test') });

// Service-specific environment overrides
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://testuser:testpass@localhost:27018/scoring-engine-test?authSource=admin';
process.env.NATS_SERVERS =
  process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'scoring-engine-svc-test';
process.env.NODE_ENV = 'test';

// Increase timeout for AI service tests
jest.setTimeout(30000);

// Mock console methods for cleaner test output (can be removed for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
