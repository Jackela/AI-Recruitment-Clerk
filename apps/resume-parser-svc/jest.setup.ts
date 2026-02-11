/**
 * @file Resume Parser Service Jest Setup
 * @description Service-specific test setup. Extends shared jest.setup.ts from root.
 *
 * Note: This setup REPLACES the shared jest.setup.ts (not extends) due to Jest limitations.
 * Duplicated patterns here should match the shared setup in jest.setup.ts.
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables for this service
config({ path: join(__dirname, '.env.test') });

// Service-specific environment overrides
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://testuser:testpass@localhost:27018/resume-parser-test?authSource=admin';
process.env.NATS_SERVERS =
  process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'resume-parser-svc-test';
process.env.GRIDFS_BUCKET_NAME =
  process.env.GRIDFS_BUCKET_NAME || 'test-resumes';

// Mock pdf-parse-fork module (service-specific dependency)
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

// Mock @ai-recruitment-clerk/shared-dtos module (service-specific mocks)
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
}));
