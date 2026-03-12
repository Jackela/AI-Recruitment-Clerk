import { test, expect } from '@playwright/test';
import {
  loadPerformanceBudget,
  createTestBlob,
  clearPerformanceEntries,
} from '../utils/performance';
import * as fs from 'fs';
import * as path from 'path';

test.describe('File Upload Performance', () => {
  const budget = loadPerformanceBudget();

  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('10MB resume uploads within 30 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to upload page
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Create a 10MB test file
    const fileSize = 10 * 1024 * 1024; // 10MB
    const testFilePath = path.join(process.cwd(), 'test-upload-10mb.pdf');

    // Generate test PDF file
    const buffer = Buffer.alloc(fileSize);
    buffer.write('%PDF-1.4\n', 0);
    for (let i = 10; i < fileSize - 10; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    buffer.write('\n%%EOF', fileSize - 6);
    fs.writeFileSync(testFilePath, buffer);

    try {
      const startTime = Date.now();

      // Upload file
      await page.setInputFiles(
        '[data-testid="resume-upload-input"]',
        testFilePath,
      );

      // Wait for upload to complete (progress bar or success message)
      await page.waitForSelector(
        '[data-testid="upload-success"], [data-testid="upload-complete"]',
        {
          timeout: budget.upload.duration,
        },
      );

      const uploadTime = Date.now() - startTime;

      console.log(
        `\n📤 10MB File Upload: ${uploadTime}ms (${(fileSize / 1024 / 1024).toFixed(2)}MB)`,
      );

      expect(uploadTime).toBeLessThan(budget.upload.duration);
    } finally {
      // Cleanup test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('5MB resume uploads within 15 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to upload page
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Create a 5MB test file
    const fileSize = 5 * 1024 * 1024; // 5MB
    const testFilePath = path.join(process.cwd(), 'test-upload-5mb.pdf');

    // Generate test PDF file
    const buffer = Buffer.alloc(fileSize);
    buffer.write('%PDF-1.4\n', 0);
    for (let i = 10; i < fileSize - 10; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    buffer.write('\n%%EOF', fileSize - 6);
    fs.writeFileSync(testFilePath, buffer);

    try {
      const startTime = Date.now();

      // Upload file
      await page.setInputFiles(
        '[data-testid="resume-upload-input"]',
        testFilePath,
      );

      // Wait for upload to complete
      await page.waitForSelector(
        '[data-testid="upload-success"], [data-testid="upload-complete"]',
        {
          timeout: 20000,
        },
      );

      const uploadTime = Date.now() - startTime;

      console.log(
        `\n📤 5MB File Upload: ${uploadTime}ms (${(fileSize / 1024 / 1024).toFixed(2)}MB)`,
      );

      expect(uploadTime).toBeLessThan(15000);
    } finally {
      // Cleanup test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });

  test('multiple files upload within 60 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to upload page
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Create multiple test files (3 files of 2MB each)
    const fileSize = 2 * 1024 * 1024; // 2MB
    const testFiles: string[] = [];

    for (let i = 0; i < 3; i++) {
      const testFilePath = path.join(process.cwd(), `test-upload-${i}.pdf`);
      const buffer = Buffer.alloc(fileSize);
      buffer.write('%PDF-1.4\n', 0);
      for (let j = 10; j < fileSize - 10; j++) {
        buffer[j] = Math.floor(Math.random() * 256);
      }
      buffer.write('\n%%EOF', fileSize - 6);
      fs.writeFileSync(testFilePath, buffer);
      testFiles.push(testFilePath);
    }

    try {
      const startTime = Date.now();

      // Upload multiple files
      await page.setInputFiles(
        '[data-testid="resume-upload-input"]',
        testFiles,
      );

      // Wait for all uploads to complete
      await page.waitForSelector('[data-testid="all-uploads-complete"]', {
        timeout: 60000,
      });

      const uploadTime = Date.now() - startTime;
      const totalSize = fileSize * 3;

      console.log(
        `\n📤 Multiple Files Upload: ${uploadTime}ms (${(totalSize / 1024 / 1024).toFixed(2)}MB total, 3 files)`,
      );

      expect(uploadTime).toBeLessThan(60000);
    } finally {
      // Cleanup test files
      testFiles.forEach((filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }
  });

  test('upload progress is shown within 2 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to upload page
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Create a 5MB test file
    const fileSize = 5 * 1024 * 1024; // 5MB
    const testFilePath = path.join(process.cwd(), 'test-upload-progress.pdf');

    const buffer = Buffer.alloc(fileSize);
    buffer.write('%PDF-1.4\n', 0);
    for (let i = 10; i < fileSize - 10; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    buffer.write('\n%%EOF', fileSize - 6);
    fs.writeFileSync(testFilePath, buffer);

    try {
      // Start upload
      await page.setInputFiles(
        '[data-testid="resume-upload-input"]',
        testFilePath,
      );

      // Wait for progress indicator to appear
      const progressStartTime = Date.now();

      await page.waitForSelector(
        '[data-testid="upload-progress"], .upload-progress',
        {
          timeout: 2000,
        },
      );

      const progressShowTime = Date.now() - progressStartTime;

      console.log(`\n📊 Upload Progress Shown: ${progressShowTime}ms`);

      expect(progressShowTime).toBeLessThan(2000);
    } finally {
      // Cleanup test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
