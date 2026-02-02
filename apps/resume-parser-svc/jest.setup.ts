import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({ path: join(__dirname, '.env.test') });

// Mock Logger to prevent console output during tests
jest.spyOn(Logger, 'log').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger, 'error').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger, 'warn').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger, 'debug').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger.prototype, 'log').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger.prototype, 'warn').mockImplementation((): void => { /* no-op */ });
jest.spyOn(Logger.prototype, 'debug').mockImplementation((): void => { /* no-op */ });

// Mock console methods to prevent output during tests
global.console = {
  ...global.console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set test environment variables (override with .env.test if exists)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://testuser:testpass@localhost:27018/resume-parser-test?authSource=admin';
process.env.NATS_SERVERS =
  process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'resume-parser-svc-test';
process.env.GRIDFS_BUCKET_NAME =
  process.env.GRIDFS_BUCKET_NAME || 'test-resumes';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Mock pdf-parse-fork module
jest.mock('pdf-parse-fork', () => {
  return jest.fn().mockImplementation(() => ({
    text: 'Mock PDF text content',
    numpages: 1,
    info: {
      Title: 'Mock Resume',
      Author: 'Test User',
    },
  }));
});

// Mock @ai-recruitment-clerk/shared-dtos module
jest.mock('@ai-recruitment-clerk/shared-dtos', () => ({
  ContractTestUtils: {
    validateContract: jest.fn().mockReturnValue(true),
    createTestData: jest.fn().mockReturnValue({}),
    assertContractCompliance: jest.fn().mockReturnValue(true),
  },
  LlmService: jest.fn().mockImplementation(() => ({
    analyzeResume: jest.fn().mockResolvedValue({
      skills: ['JavaScript', 'TypeScript'],
      experience: [],
      education: [],
    }),
  })),
  VisionLlmService: jest.fn().mockImplementation(() => ({
    extractText: jest.fn().mockResolvedValue({
      text: 'Extracted text from image',
      confidence: 0.95,
    }),
  })),
  // Add any other exports that are needed
}));

// Cleanup function registry
const cleanupFunctions: (() => Promise<void> | void)[] = [];

export const registerCleanup = (fn: () => Promise<void> | void): void => {
  cleanupFunctions.push(fn);
};

export const runCleanups = async (): Promise<void> => {
  for (const fn of cleanupFunctions.splice(0)) {
    await fn();
  }
};

// Global test utilities
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  await runCleanups();
});

afterAll(async () => {
  jest.restoreAllMocks();
  await runCleanups();
  if (process.env.JEST_FORCE_EXIT === 'true') {
    // Allow opt-in force exit for legacy CI pipelines
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});
