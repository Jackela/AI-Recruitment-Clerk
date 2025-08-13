import { test, expect } from '@playwright/test';

/**
 * Critical Workflow #2: Job Creation & Management
 * Tests the complete job posting workflow from creation to publishing
 */
test.describe('Job Creation & Management Workflow', () => {
  const testJob = {
    title: 'Senior Frontend Developer - E2E Test',
    company: 'Playwright Test Corp',
    location: 'Remote',
    employmentType: 'full-time',
    description: `We are looking for an experienced frontend developer to join our team.
    
Requirements:
- 5+ years of React experience
- Strong TypeScript knowledge
- Experience with testing frameworks
- Knowledge of CI/CD pipelines

Responsibilities:
- Develop user-facing features
- Write comprehensive tests
- Collaborate with design team
- Mentor junior developers`,
    salaryMin: '80000',
    salaryMax: '120000',
    skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'Jest']
  };

  test.beforeEach(async ({ page }) => {
    // Login as recruiter
    await page.goto('/login');
    await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should create a new job posting', async ({ page }) => {
    // Navigate to job creation
    await page.click('text=Create Job');
    await expect(page).toHaveURL(/.*\/jobs\/create/);

    // Fill job details
    await page.fill('input[name="title"]', testJob.title);
    await page.fill('input[name="company"]', testJob.company);
    await page.fill('input[name="location"]', testJob.location);
    
    // Select employment type
    await page.selectOption('select[name="employmentType"]', testJob.employmentType);
    
    // Fill description
    await page.fill('textarea[name="description"]', testJob.description);
    
    // Fill salary range
    await page.fill('input[name="salaryMin"]', testJob.salaryMin);
    await page.fill('input[name="salaryMax"]', testJob.salaryMax);
    
    // Add skills
    for (const skill of testJob.skills) {
      await page.fill('input[name="skillInput"]', skill);
      await page.press('input[name="skillInput"]', 'Enter');
    }
    
    // Verify skills were added
    for (const skill of testJob.skills) {
      await expect(page.locator('.skill-tag')).toContainText(skill);
    }
    
    // Save as draft first
    await page.click('button[data-action="save-draft"]');
    
    // Verify success message
    await expect(page.locator('.success-message')).toContainText('Job saved as draft');
    
    // Verify redirect to job list
    await expect(page).toHaveURL(/.*\/jobs/);
    
    // Verify job appears in list
    await expect(page.locator('.job-card')).toContainText(testJob.title);
    await expect(page.locator('.job-status')).toContainText('Draft');
  });

  test('should publish a job posting', async ({ page }) => {
    // First create a draft job (simplified version)
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Test Job to Publish');
    await page.fill('input[name="company"]', 'Test Company');
    await page.fill('textarea[name="description"]', 'Test job description');
    await page.click('button[data-action="save-draft"]');
    
    // Go to job management
    await page.goto('/jobs');
    
    // Find and edit the draft job
    await page.click('.job-card:has-text("Test Job to Publish") .edit-button');
    
    // Publish the job
    await page.click('button[data-action="publish"]');
    
    // Confirm publication
    await page.click('button[data-confirm="publish"]');
    
    // Verify success
    await expect(page.locator('.success-message')).toContainText('Job published successfully');
    
    // Verify status change
    await expect(page.locator('.job-status')).toContainText('Active');
  });

  test('should edit an existing job', async ({ page }) => {
    // Create a job first
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Job to Edit');
    await page.fill('input[name="company"]', 'Edit Test Company');
    await page.fill('textarea[name="description"]', 'Original description');
    await page.click('button[data-action="save-draft"]');
    
    // Navigate to edit
    await page.goto('/jobs');
    await page.click('.job-card:has-text("Job to Edit") .edit-button');
    
    // Make changes
    const updatedTitle = 'Updated Job Title';
    await page.fill('input[name="title"]', updatedTitle);
    await page.fill('textarea[name="description"]', 'Updated job description with new requirements');
    
    // Save changes
    await page.click('button[data-action="save-draft"]');
    
    // Verify changes
    await expect(page.locator('.success-message')).toContainText('Job updated successfully');
    await page.goto('/jobs');
    await expect(page.locator('.job-card')).toContainText(updatedTitle);
  });

  test('should delete a job posting', async ({ page }) => {
    // Create a job to delete
    await page.goto('/jobs/create');
    await page.fill('input[name="title"]', 'Job to Delete');
    await page.fill('input[name="company"]', 'Delete Test Company');
    await page.fill('textarea[name="description"]', 'Job that will be deleted');
    await page.click('button[data-action="save-draft"]');
    
    // Navigate to job list
    await page.goto('/jobs');
    
    // Delete the job
    await page.click('.job-card:has-text("Job to Delete") .delete-button');
    
    // Confirm deletion
    await page.click('button[data-confirm="delete"]');
    
    // Verify deletion
    await expect(page.locator('.success-message')).toContainText('Job deleted successfully');
    await expect(page.locator('.job-card')).not.toContainText('Job to Delete');
  });

  test('should validate required job fields', async ({ page }) => {
    await page.goto('/jobs/create');
    
    // Try to save without required fields
    await page.click('button[data-action="save-draft"]');
    
    // Should show validation errors
    await expect(page.locator('.field-error')).toHaveCount(3, { timeout: 5000 }); // title, company, description
    
    // Fill required fields one by one and verify error removal
    await page.fill('input[name="title"]', 'Valid Title');
    await expect(page.locator('input[name="title"] + .error')).toHaveCount(0);
    
    await page.fill('input[name="company"]', 'Valid Company');
    await expect(page.locator('input[name="company"] + .error')).toHaveCount(0);
    
    await page.fill('textarea[name="description"]', 'Valid description with enough content');
    await expect(page.locator('textarea[name="description"] + .error')).toHaveCount(0);
  });

  test('should search and filter jobs', async ({ page }) => {
    // Go to job listings
    await page.goto('/jobs');
    
    // Test search functionality
    await page.fill('input[name="search"]', 'Frontend');
    await page.press('input[name="search"]', 'Enter');
    
    // Verify filtered results
    await expect(page.locator('.job-card')).toContainText('Frontend');
    
    // Test filter by status
    await page.selectOption('select[name="status"]', 'active');
    await expect(page.locator('.job-card .job-status')).toContainText('Active');
    
    // Test clear filters
    await page.click('button[data-action="clear-filters"]');
    await expect(page.locator('input[name="search"]')).toHaveValue('');
  });
});