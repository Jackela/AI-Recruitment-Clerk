import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * Critical Workflow #3: Resume Upload & Processing
 * Tests the complete resume workflow from upload to AI processing
 */
test.describe('Resume Upload & Processing Workflow', () => {
  const testFiles = {
    validPdf: 'test-resume-valid.pdf',
    validDocx: 'test-resume-valid.docx',
    invalidFile: 'test-image.jpg',
    largePdf: 'test-resume-large.pdf'
  };

  test.beforeEach(async ({ page }) => {
    // Login as a user who can upload resumes
    await page.goto('/login');
    await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should upload a valid PDF resume', async ({ page }) => {
    // Navigate to resume upload
    await page.click('text=Upload Resume');
    await expect(page).toHaveURL(/.*\/resumes\/upload/);

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.validPdf));

    // Verify file is selected
    await expect(page.locator('.file-selected')).toContainText(testFiles.validPdf);

    // Add metadata
    await page.fill('input[name="candidateName"]', 'John Doe');
    await page.fill('input[name="candidateEmail"]', 'john.doe@example.com');
    await page.fill('textarea[name="notes"]', 'Test upload via Playwright');

    // Submit upload
    await page.click('button[type="submit"]');

    // Verify upload success
    await expect(page.locator('.success-message')).toContainText('Resume uploaded successfully');

    // Verify processing started
    await expect(page.locator('.processing-status')).toContainText('Processing');
    
    // Wait for processing to complete (with timeout)
    await expect(page.locator('.processing-status')).toContainText('Completed', { timeout: 30000 });
  });

  test('should upload a valid DOCX resume', async ({ page }) => {
    await page.goto('/resumes/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.validDocx));

    await page.fill('input[name="candidateName"]', 'Jane Smith');
    await page.fill('input[name="candidateEmail"]', 'jane.smith@example.com');

    await page.click('button[type="submit"]');

    await expect(page.locator('.success-message')).toContainText('Resume uploaded successfully');
    await expect(page.locator('.processing-status')).toContainText('Processing');
  });

  test('should reject invalid file types', async ({ page }) => {
    await page.goto('/resumes/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.invalidFile));

    await page.click('button[type="submit"]');

    // Should show error for invalid file type
    await expect(page.locator('.error-message')).toContainText(/invalid file type/i);
    await expect(page.locator('.error-message')).toContainText(/pdf.*docx/i);
  });

  test('should reject files that are too large', async ({ page }) => {
    await page.goto('/resumes/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.largePdf));

    await page.click('button[type="submit"]');

    // Should show error for file size
    await expect(page.locator('.error-message')).toContainText(/file.*too large/i);
  });

  test('should show resume processing results', async ({ page }) => {
    // First upload a resume
    await page.goto('/resumes/upload');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.validPdf));
    
    await page.fill('input[name="candidateName"]', 'Processing Test User');
    await page.fill('input[name="candidateEmail"]', 'processing@example.com');
    await page.click('button[type="submit"]');
    
    // Navigate to resume details
    await page.goto('/resumes');
    await page.click('.resume-card:has-text("Processing Test User")');
    
    // Verify processed data is displayed
    await expect(page.locator('.resume-details')).toBeVisible();
    await expect(page.locator('.extracted-skills')).toBeVisible();
    await expect(page.locator('.experience-summary')).toBeVisible();
    await expect(page.locator('.contact-information')).toBeVisible();
  });

  test('should handle batch resume upload', async ({ page }) => {
    await page.goto('/resumes/upload');

    // Select multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      path.join(__dirname, '../fixtures', testFiles.validPdf),
      path.join(__dirname, '../fixtures', testFiles.validDocx)
    ]);

    // Verify both files are selected
    await expect(page.locator('.file-selected')).toHaveCount(2);

    // Submit batch upload
    await page.click('button[data-action="batch-upload"]');

    // Verify batch processing
    await expect(page.locator('.batch-status')).toContainText('Processing 2 files');
    
    // Wait for all files to be processed
    await expect(page.locator('.batch-complete')).toBeVisible({ timeout: 60000 });
  });

  test('should match resume to job postings', async ({ page }) => {
    // First ensure we have a job posting
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Frontend Developer for Resume Matching');
    await page.fill('input[name="company"]', 'Matching Test Corp');
    await page.fill('textarea[name="description"]', 'Looking for React, JavaScript, CSS experience');
    await page.fill('input[name="skillInput"]', 'React');
    await page.press('input[name="skillInput"]', 'Enter');
    await page.click('button[data-action="publish"]');
    
    // Upload a resume
    await page.goto('/resumes/upload');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures', testFiles.validPdf));
    
    await page.fill('input[name="candidateName"]', 'React Developer');
    await page.fill('input[name="candidateEmail"]', 'react.dev@example.com');
    await page.click('button[type="submit"]');
    
    // Wait for processing and matching
    await expect(page.locator('.processing-status')).toContainText('Completed', { timeout: 30000 });
    
    // Navigate to matches
    await page.goto('/resumes');
    await page.click('.resume-card:has-text("React Developer")');
    await page.click('tab[data-tab="job-matches"]');
    
    // Verify job matches are shown
    await expect(page.locator('.job-match')).toBeVisible();
    await expect(page.locator('.match-score')).toBeVisible();
  });

  test('should allow resume download', async ({ page }) => {
    // Navigate to uploaded resumes
    await page.goto('/resumes');
    
    // Click on a resume
    await page.click('.resume-card:first-child');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[data-action="download-original"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.(pdf|docx)$/);
  });

  test('should show resume search and filtering', async ({ page }) => {
    await page.goto('/resumes');
    
    // Test search by candidate name
    await page.fill('input[name="search"]', 'John Doe');
    await page.press('input[name="search"]', 'Enter');
    
    // Verify filtered results
    await expect(page.locator('.resume-card')).toContainText('John Doe');
    
    // Test filter by skills
    await page.click('button[data-filter="skills"]');
    await page.check('input[value="React"]');
    await page.click('button[data-action="apply-filters"]');
    
    // Verify skill-filtered results
    await expect(page.locator('.resume-skills')).toContainText('React');
    
    // Test filter by experience level
    await page.selectOption('select[name="experience"]', 'senior');
    await expect(page.locator('.experience-level')).toContainText('Senior');
  });
});