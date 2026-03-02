/**
 * @file Report Generator Service Jest Setup
 * @description Service-specific test setup. Extends shared jest.setup.ts from root.
 */

import 'reflect-metadata';
import config from 'dotenv';
import { join } from 'path';

// Load test environment variables for this service
config.config({ path: join(__dirname, '.env.test') });

// Service-specific environment overrides
process.env.MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://testuser:testpass@localhost:27018/report-generator-test?authSource=admin';
process.env.NATS_SERVERS =
  process.env.NATS_SERVERS || 'nats://testuser:testpass@localhost:4223';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'report-generator-svc-test';
process.env.GRIDFS_BUCKET_NAME =
  process.env.GRIDFS_BUCKET_NAME || 'test-reports';

// Mock Puppeteer for PDF generation tests
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock ExcelJS for Excel generation tests
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRow: jest.fn(),
      getRows: jest.fn().mockReturnValue([]),
    }),
    xlsx: {
      writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-content')),
    },
  })),
}));

// Mock shared modules
jest.mock('@ai-recruitment-clerk/shared-dtos', () => ({
  ContractTestUtils: {
    validateContract: jest.fn().mockReturnValue(true),
    createTestData: jest.fn().mockReturnValue({}),
    assertContractCompliance: jest.fn().mockReturnValue(true),
  },
}));
