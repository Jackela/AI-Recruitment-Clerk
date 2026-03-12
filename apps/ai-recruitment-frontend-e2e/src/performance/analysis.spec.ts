import { test, expect } from '@playwright/test';
import {
  loadPerformanceBudget,
  clearPerformanceEntries,
} from '../utils/performance';

test.describe('Analysis Performance', () => {
  const budget = loadPerformanceBudget();

  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('resume analysis completes within 60 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to resume upload
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Upload a test resume
    const testFilePath = 'src/test-data/resumes/test-resume.pdf';
    await page.setInputFiles(
      '[data-testid="resume-upload-input"]',
      testFilePath,
    );

    // Wait for file to be uploaded
    await page.waitForSelector(
      '[data-testid="upload-success"], [data-testid="upload-complete"]',
      {
        timeout: 30000,
      },
    );

    // Start analysis
    await page.click('[data-testid="start-analysis"]');

    const startTime = Date.now();

    // Wait for analysis to complete
    await page.waitForSelector('[data-testid="analysis-complete"]', {
      timeout: budget.analysis.duration + 5000,
    });

    const analysisTime = Date.now() - startTime;

    console.log(`\n🤖 Resume Analysis: ${analysisTime}ms`);

    expect(analysisTime).toBeLessThan(budget.analysis.duration);
  });

  test('job matching analysis completes within 45 seconds', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to job matching
    await page.goto('/jobs/123/match');
    await page.waitForLoadState('networkidle');

    // Select candidates to match
    await page.click('[data-testid="select-all-candidates"]');

    // Start matching
    await page.click('[data-testid="start-matching"]');

    const startTime = Date.now();

    // Wait for matching to complete
    await page.waitForSelector('[data-testid="matching-complete"]', {
      timeout: 50000,
    });

    const matchingTime = Date.now() - startTime;

    console.log(`\n🎯 Job Matching Analysis: ${matchingTime}ms`);

    expect(matchingTime).toBeLessThan(45000);
  });

  test('batch resume analysis completes within 120 seconds', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to batch analysis
    await page.goto('/resumes/batch-analysis');
    await page.waitForLoadState('networkidle');

    // Select multiple resumes
    await page.click('[data-testid="select-resume-1"]');
    await page.click('[data-testid="select-resume-2"]');
    await page.click('[data-testid="select-resume-3"]');

    // Start batch analysis
    await page.click('[data-testid="start-batch-analysis"]');

    const startTime = Date.now();

    // Wait for batch analysis to complete
    await page.waitForSelector('[data-testid="batch-analysis-complete"]', {
      timeout: 130000,
    });

    const batchAnalysisTime = Date.now() - startTime;

    console.log(
      `\n🤖 Batch Resume Analysis (3 resumes): ${batchAnalysisTime}ms`,
    );

    expect(batchAnalysisTime).toBeLessThan(120000);
  });

  test('skill extraction completes within 30 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to a resume detail page
    await page.goto('/resumes/456');
    await page.waitForLoadState('networkidle');

    // Click extract skills
    await page.click('[data-testid="extract-skills"]');

    const startTime = Date.now();

    // Wait for skill extraction to complete
    await page.waitForSelector('[data-testid="skills-extracted"]', {
      timeout: 35000,
    });

    const extractionTime = Date.now() - startTime;

    console.log(`\n🔍 Skill Extraction: ${extractionTime}ms`);

    expect(extractionTime).toBeLessThan(30000);
  });

  test('analytics report generation completes within 20 seconds', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to analytics
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Generate report
    await page.click('[data-testid="generate-report"]');

    const startTime = Date.now();

    // Wait for report to generate
    await page.waitForSelector('[data-testid="report-generated"]', {
      timeout: 25000,
    });

    const reportTime = Date.now() - startTime;

    console.log(`\n📊 Analytics Report Generation: ${reportTime}ms`);

    expect(reportTime).toBeLessThan(20000);
  });
});
