import { test, expect } from '@playwright/test';
import {
  loadPerformanceBudget,
  clearPerformanceEntries,
} from '../utils/performance';

test.describe('Critical Path Performance', () => {
  const budget = loadPerformanceBudget();

  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('job creation flow completes within 10 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Start job creation flow
    const startTime = Date.now();

    await page.goto('/jobs/create');
    await page.waitForLoadState('networkidle');

    // Fill job form
    await page.fill(
      '[data-testid="job-title-input"]',
      'Senior Software Engineer',
    );
    await page.fill(
      '[data-testid="job-description-input"]',
      'We are looking for an experienced software engineer...',
    );
    await page.fill(
      '[data-testid="job-requirements-input"]',
      '5+ years experience with React and TypeScript',
    );
    await page.fill('[data-testid="job-location-input"]', 'Remote');
    await page.fill('[data-testid="job-salary-input"]', '$100,000 - $150,000');

    // Submit job
    await page.click('[data-testid="submit-job"]');

    // Wait for redirect to jobs list
    await page.waitForURL('/jobs', { timeout: 15000 });

    const totalTime = Date.now() - startTime;

    console.log(`\n⏱️ Job Creation Flow: ${totalTime}ms`);

    expect(totalTime).toBeLessThan(budget.analysis.duration);
  });

  test('login flow completes within 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    const totalTime = Date.now() - startTime;

    console.log(`\n⏱️ Login Flow: ${totalTime}ms`);

    expect(totalTime).toBeLessThan(5000);
  });

  test('resume upload and analysis flow completes within 70 seconds', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    const startTime = Date.now();

    // Navigate to resume upload
    await page.goto('/resumes/upload');
    await page.waitForLoadState('networkidle');

    // Upload a test resume
    const testFilePath = 'src/test-data/resumes/test-resume.pdf';
    await page.setInputFiles(
      '[data-testid="resume-upload-input"]',
      testFilePath,
    );

    // Start analysis
    await page.click('[data-testid="start-analysis"]');

    // Wait for analysis to complete
    await page
      .locator('[data-testid="analysis-complete"]')
      .waitFor({ timeout: budget.analysis.duration + 10000 });

    const totalTime = Date.now() - startTime;

    console.log(`\n⏱️ Resume Upload and Analysis Flow: ${totalTime}ms`);

    expect(totalTime).toBeLessThan(budget.analysis.duration + 10000);
  });

  test('candidate search completes within 3 seconds', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to candidates
    await page.goto('/candidates');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Perform search
    await page.fill(
      '[data-testid="candidate-search-input"]',
      'software engineer',
    );
    await page.click('[data-testid="search-button"]');

    // Wait for results to load
    await page
      .locator('[data-testid="candidate-results"]')
      .waitFor({ timeout: 10000 });

    const searchTime = Date.now() - startTime;

    console.log(`\n⏱️ Candidate Search: ${searchTime}ms`);

    expect(searchTime).toBeLessThan(3000);
  });

  test('job application submission completes within 8 seconds', async ({
    page,
  }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Navigate to a job detail page
    await page.goto('/jobs/123');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    // Click apply
    await page.click('[data-testid="apply-button"]');

    // Fill application form
    await page.fill('[data-testid="applicant-name"]', 'John Doe');
    await page.fill('[data-testid="applicant-email"]', 'john@example.com');

    // Upload resume
    const testFilePath = 'src/test-data/resumes/test-resume.pdf';
    await page.setInputFiles(
      '[data-testid="application-resume"]',
      testFilePath,
    );

    // Submit application
    await page.click('[data-testid="submit-application"]');

    // Wait for confirmation
    await page
      .locator('[data-testid="application-confirmation"]')
      .waitFor({ timeout: 15000 });

    const totalTime = Date.now() - startTime;

    console.log(`\n⏱️ Job Application Submission: ${totalTime}ms`);

    expect(totalTime).toBeLessThan(8000);
  });

  test('navigation between main pages is fast', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    const pages = [
      '/jobs',
      '/candidates',
      '/resumes',
      '/analytics',
      '/settings',
    ];

    for (const pageUrl of pages) {
      const startTime = Date.now();

      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      console.log(`\n⏱️ Navigation to ${pageUrl}: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(5000);
    }
  });
});
