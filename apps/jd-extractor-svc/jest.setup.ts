/**
 * @file JD Extractor Service Jest Setup
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
  'mongodb://testuser:testpass@localhost:27018/jd-extractor-test?authSource=admin';
process.env.NATS_SERVERS =
  process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'jd-extractor-svc-test';

// Mock LLM service module
jest.mock('@ai-recruitment-clerk/ai-services-shared', () => ({
  LlmService: jest.fn().mockImplementation(() => ({
    extractSkills: jest.fn().mockResolvedValue({
      skills: ['JavaScript', 'TypeScript', 'React'],
      requirements: ['3+ years experience', 'Bachelor degree'],
      responsibilities: ['Develop features', 'Code review'],
    }),
    analyzeJobDescription: jest.fn().mockResolvedValue({
      title: 'Software Engineer',
      department: 'Engineering',
      level: 'Senior',
    }),
  })),
}));
