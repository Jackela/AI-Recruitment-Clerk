import { test, expect, Page, Download } from '@playwright/test';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Complete End-to-End Recruitment Workflow Tests
 * 
 * Tests the entire recruitment process:
 * 1. Create Job Position → 2. Configure Requirements → 3. Publish Job → 
 * 4. Upload Resume → 5. Automatic Scoring → 6. Manual Review → 
 * 7. Generate Report → 8. Candidate Notification
 */

interface JobData {
  title: string;
  department: string;
  location: string;
  description: string;
  requirements: string[];
  experience: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  priority: 'high' | 'medium' | 'low';
  skills: string[];
}

interface CandidateData {
  name: string;
  email: string;
  phone: string;
  resumeFile: string;
  expectedScore?: number;
}

// Test data factory
const createJobData = (type: 'technical' | 'sales' | 'management'): JobData => {
  const baseData = {
    location: 'Remote/Hybrid',
    currency: 'USD'
  };

  switch (type) {
    case 'technical':
      return {
        ...baseData,
        title: 'Senior Full Stack Developer',
        department: 'Engineering',
        description: 'We are looking for an experienced full stack developer to join our growing team.',
        requirements: [
          '5+ years of experience in web development',
          'Proficiency in React, Node.js, and TypeScript',
          'Experience with cloud platforms (AWS/GCP)',
          'Strong problem-solving skills'
        ],
        experience: '5+ years',
        salary: { min: 80000, max: 120000, currency: 'USD' },
        priority: 'high',
        skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'MongoDB']
      };
    case 'sales':
      return {
        ...baseData,
        title: 'Sales Manager',
        department: 'Sales',
        description: 'Experienced sales professional to lead our sales team and drive revenue growth.',
        requirements: [
          '3+ years of sales management experience',
          'Proven track record of meeting sales targets',
          'Excellent communication and leadership skills',
          'CRM software experience'
        ],
        experience: '3+ years',
        salary: { min: 60000, max: 90000, currency: 'USD' },
        priority: 'medium',
        skills: ['Sales Management', 'CRM', 'Leadership', 'Communication']
      };
    case 'management':
      return {
        ...baseData,
        title: 'Product Manager',
        department: 'Product',
        description: 'Strategic product manager to drive product vision and roadmap.',
        requirements: [
          '4+ years of product management experience',
          'Experience with agile methodologies',
          'Strong analytical and strategic thinking',
          'Stakeholder management experience'
        ],
        experience: '4+ years',
        salary: { min: 90000, max: 130000, currency: 'USD' },
        priority: 'high',
        skills: ['Product Strategy', 'Agile', 'Analytics', 'Leadership']
      };
  }
};

const createCandidateData = (quality: 'excellent' | 'good' | 'average' | 'poor'): CandidateData => {
  const baseData = {
    name: `Test Candidate ${Date.now()}`,
    email: `candidate-${Date.now()}@test.com`,
    phone: '+1-555-0123'
  };

  switch (quality) {
    case 'excellent':
      return {
        ...baseData,
        name: 'Alice Johnson',
        resumeFile: 'excellent-developer-resume.pdf',
        expectedScore: 95
      };
    case 'good':
      return {
        ...baseData,
        name: 'Bob Smith',
        resumeFile: 'good-developer-resume.pdf',
        expectedScore: 80
      };
    case 'average':
      return {
        ...baseData,
        name: 'Carol Davis',
        resumeFile: 'average-developer-resume.pdf',
        expectedScore: 65
      };
    case 'poor':
      return {
        ...baseData,
        name: 'David Wilson',
        resumeFile: 'poor-match-resume.pdf',
        expectedScore: 30
      };
  }
};

// Page Object Models
class JobCreationPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/jobs/create');
    await this.page.waitForLoadState('networkidle');
  }

  async createJob(jobData: JobData) {
    // Basic Information
    await this.page.fill('[data-testid=\"job-title-input\"]', jobData.title);
    await this.page.selectOption('[data-testid=\"department-select\"]', jobData.department);
    await this.page.fill('[data-testid=\"location-input\"]', jobData.location);
    await this.page.fill('[data-testid=\"description-textarea\"]', jobData.description);
    
    // Experience and Salary
    await this.page.selectOption('[data-testid=\"experience-select\"]', jobData.experience);
    await this.page.fill('[data-testid=\"salary-min-input\"]', jobData.salary.min.toString());
    await this.page.fill('[data-testid=\"salary-max-input\"]', jobData.salary.max.toString());
    await this.page.selectOption('[data-testid=\"currency-select\"]', jobData.salary.currency);
    
    // Priority
    await this.page.selectOption('[data-testid=\"priority-select\"]', jobData.priority);
    
    // Requirements
    for (const requirement of jobData.requirements) {
      await this.page.click('[data-testid=\"add-requirement-button\"]');
      await this.page.fill('[data-testid=\"requirement-input\"]:last-child', requirement);
    }
    
    // Skills
    for (const skill of jobData.skills) {
      await this.page.fill('[data-testid=\"skills-input\"]', skill);
      await this.page.keyboard.press('Enter');
    }
    
    // Save as draft first
    await this.page.click('[data-testid=\"save-draft-button\"]');
    await expect(this.page.locator('[data-testid=\"success-message\"]')).toContainText('Job saved as draft');
  }

  async configureAIRequirements(customCriteria: string[]) {
    await this.page.click('[data-testid=\"ai-configuration-tab\"]');
    
    // Set matching criteria
    for (const criteria of customCriteria) {
      await this.page.click('[data-testid=\"add-criteria-button\"]');
      await this.page.fill('[data-testid=\"criteria-input\"]:last-child', criteria);
    }
    
    // Set scoring weights
    await this.page.fill('[data-testid=\"experience-weight\"]', '30');
    await this.page.fill('[data-testid=\"skills-weight\"]', '40');
    await this.page.fill('[data-testid=\"education-weight\"]', '20');
    await this.page.fill('[data-testid=\"culture-weight\"]', '10');
    
    await this.page.click('[data-testid=\"save-ai-config-button\"]');
  }

  async publishJob() {
    await this.page.click('[data-testid=\"publish-job-button\"]');
    
    // Confirm publication
    await this.page.click('[data-testid=\"confirm-publish-button\"]');
    
    await expect(this.page.locator('[data-testid=\"success-message\"]')).toContainText('Job published successfully');
    
    // Get job ID for later use
    const jobUrl = this.page.url();
    const jobId = jobUrl.match(/\\/jobs\\/(\\w+)/)?.[1];
    return jobId;
  }
}

class ResumeUploadPage {
  constructor(private page: Page) {}

  async navigateToJob(jobId: string) {
    await this.page.goto(`/jobs/${jobId}/apply`);
    await this.page.waitForLoadState('networkidle');
  }

  async uploadResume(candidateData: CandidateData) {
    // Fill candidate information
    await this.page.fill('[data-testid=\"candidate-name-input\"]', candidateData.name);
    await this.page.fill('[data-testid=\"candidate-email-input\"]', candidateData.email);
    await this.page.fill('[data-testid=\"candidate-phone-input\"]', candidateData.phone);
    
    // Upload resume file
    const fileInput = this.page.locator('[data-testid=\"resume-file-input\"]');
    await fileInput.setInputFiles(path.join(__dirname, '../test-data/resumes', candidateData.resumeFile));
    
    // Wait for file upload and processing
    await expect(this.page.locator('[data-testid=\"upload-progress\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"upload-success\"]')).toBeVisible({ timeout: 30000 });
    
    await this.page.click('[data-testid=\"submit-application-button\"]');
    
    // Get application ID
    await expect(this.page.locator('[data-testid=\"application-success\"]')).toBeVisible();
    const applicationId = await this.page.locator('[data-testid=\"application-id\"]').textContent();
    
    return applicationId?.replace('Application ID: ', '');
  }
}

class ScoringDashboardPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/dashboard/scoring');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForScoringCompletion(applicationId: string) {
    // Wait for AI scoring to complete
    const scoringIndicator = this.page.locator(`[data-testid=\"scoring-status-${applicationId}\"]`);
    
    // Initial state should be 'processing'
    await expect(scoringIndicator).toContainText('Processing');
    
    // Wait for completion (with timeout)
    await expect(scoringIndicator).toContainText('Completed', { timeout: 60000 });
  }

  async getScore(applicationId: string): Promise<number> {
    const scoreElement = this.page.locator(`[data-testid=\"score-${applicationId}\"]`);
    const scoreText = await scoreElement.textContent();
    return parseInt(scoreText?.replace('Score: ', '') || '0');
  }

  async viewScoreBreakdown(applicationId: string) {
    await this.page.click(`[data-testid=\"view-breakdown-${applicationId}\"]`);
    
    // Verify breakdown components
    await expect(this.page.locator('[data-testid=\"experience-score\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"skills-score\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"education-score\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"culture-score\"]')).toBeVisible();
  }

  async performManualReview(applicationId: string, decision: 'approve' | 'reject' | 'interview') {
    await this.page.click(`[data-testid=\"manual-review-${applicationId}\"]`);
    
    // Add review notes
    await this.page.fill('[data-testid=\"review-notes\"]', `Manual review decision: ${decision}`);
    
    // Make decision
    await this.page.click(`[data-testid=\"decision-${decision}\"]`);
    
    // Confirm decision
    await this.page.click('[data-testid=\"confirm-decision-button\"]');
    
    await expect(this.page.locator('[data-testid=\"review-success\"]')).toContainText('Review completed');
  }
}

class ReportGenerationPage {
  constructor(private page: Page) {}

  async navigateTo() {
    await this.page.goto('/reports');
    await this.page.waitForLoadState('networkidle');
  }

  async generateJobReport(jobId: string) {
    await this.page.click('[data-testid=\"generate-report-button\"]');
    
    // Select job
    await this.page.selectOption('[data-testid=\"job-select\"]', jobId);
    
    // Select report type
    await this.page.check('[data-testid=\"candidate-summary-checkbox\"]');
    await this.page.check('[data-testid=\"scoring-analysis-checkbox\"]');
    await this.page.check('[data-testid=\"recommendations-checkbox\"]');
    
    // Generate report
    await this.page.click('[data-testid=\"create-report-button\"]');
    
    // Wait for report generation
    await expect(this.page.locator('[data-testid=\"report-generating\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"report-ready\"]')).toBeVisible({ timeout: 30000 });
  }

  async downloadReport(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('[data-testid=\"download-report-button\"]');
    return await downloadPromise;
  }

  async validateReportContent() {
    // Check report preview
    await this.page.click('[data-testid=\"preview-report-button\"]');
    
    // Verify report sections
    await expect(this.page.locator('[data-testid=\"executive-summary\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"candidate-rankings\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"scoring-insights\"]')).toBeVisible();
    await expect(this.page.locator('[data-testid=\"recommendations\"]')).toBeVisible();
  }
}

test.describe('Complete Recruitment Workflow', () => {
  let jobCreationPage: JobCreationPage;
  let resumeUploadPage: ResumeUploadPage;
  let scoringDashboardPage: ScoringDashboardPage;
  let reportGenerationPage: ReportGenerationPage;

  test.beforeEach(async ({ page }) => {
    jobCreationPage = new JobCreationPage(page);
    resumeUploadPage = new ResumeUploadPage(page);
    scoringDashboardPage = new ScoringDashboardPage(page);
    reportGenerationPage = new ReportGenerationPage(page);

    // Login as HR Manager
    await page.goto('/login');
    await page.fill('[data-testid=\"email-input\"]', 'hr.manager@test.com');
    await page.fill('[data-testid=\"password-input\"]', 'TestPass123!');
    await page.click('[data-testid=\"login-button\"]');
    await page.waitForURL(/.*\\/dashboard/);
  });

  test('should complete full technical position recruitment workflow', async ({ page }) => {
    // Step 1: Create Technical Job Position
    const jobData = createJobData('technical');
    
    await jobCreationPage.navigateTo();
    await jobCreationPage.createJob(jobData);
    
    // Step 2: Configure AI Requirements
    await jobCreationPage.configureAIRequirements([
      'Must have React experience',
      'TypeScript proficiency required',
      'Cloud platform experience preferred'
    ]);
    
    // Step 3: Publish Job
    const jobId = await jobCreationPage.publishJob();
    expect(jobId).toBeTruthy();
    
    // Step 4: Upload Multiple Resumes with Different Quality Levels
    const candidates = [
      createCandidateData('excellent'),
      createCandidateData('good'),
      createCandidateData('average'),
      createCandidateData('poor')
    ];
    
    const applicationIds: string[] = [];
    
    for (const candidate of candidates) {
      await resumeUploadPage.navigateToJob(jobId!);
      const applicationId = await resumeUploadPage.uploadResume(candidate);
      expect(applicationId).toBeTruthy();
      applicationIds.push(applicationId!);
    }
    
    // Step 5: Monitor Automatic Scoring
    await scoringDashboardPage.navigateTo();
    
    for (const applicationId of applicationIds) {
      await scoringDashboardPage.waitForScoringCompletion(applicationId);
    }
    
    // Step 6: Verify Scoring Accuracy
    const scores = await Promise.all(
      applicationIds.map(id => scoringDashboardPage.getScore(id))
    );
    
    // Scores should be in descending order (excellent > good > average > poor)
    expect(scores[0]).toBeGreaterThan(scores[1]); // excellent > good
    expect(scores[1]).toBeGreaterThan(scores[2]); // good > average
    expect(scores[2]).toBeGreaterThan(scores[3]); // average > poor
    
    // Step 7: Perform Manual Reviews
    await scoringDashboardPage.performManualReview(applicationIds[0], 'interview');
    await scoringDashboardPage.performManualReview(applicationIds[1], 'approve');
    await scoringDashboardPage.performManualReview(applicationIds[2], 'reject');
    await scoringDashboardPage.performManualReview(applicationIds[3], 'reject');
    
    // Step 8: Generate and Download Report
    await reportGenerationPage.navigateTo();
    await reportGenerationPage.generateJobReport(jobId!);
    await reportGenerationPage.validateReportContent();
    
    const download = await reportGenerationPage.downloadReport();
    expect(download.suggestedFilename()).toMatch(/.*\\.pdf$/);
    
    // Step 9: Verify Complete Workflow Data
    await page.goto(`/jobs/${jobId}/analytics`);
    
    // Verify analytics dashboard
    await expect(page.locator('[data-testid=\"total-applications\"]')).toContainText('4');
    await expect(page.locator('[data-testid=\"average-score\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"top-candidates\"]')).toBeVisible();
  });

  test('should handle sales position workflow with different requirements', async ({ page }) => {
    const jobData = createJobData('sales');
    
    await jobCreationPage.navigateTo();
    await jobCreationPage.createJob(jobData);
    
    // Configure different AI criteria for sales role
    await jobCreationPage.configureAIRequirements([
      'Sales management experience required',
      'CRM software proficiency',
      'Strong communication skills',
      'Track record of meeting targets'
    ]);
    
    const jobId = await jobCreationPage.publishJob();
    
    // Upload sales-specific resumes
    const salesCandidates = [
      { ...createCandidateData('excellent'), resumeFile: 'excellent-sales-resume.pdf' },
      { ...createCandidateData('good'), resumeFile: 'good-sales-resume.pdf' }
    ];
    
    const applicationIds: string[] = [];
    
    for (const candidate of salesCandidates) {
      await resumeUploadPage.navigateToJob(jobId!);
      const applicationId = await resumeUploadPage.uploadResume(candidate);
      applicationIds.push(applicationId!);
    }
    
    // Verify scoring for sales position
    await scoringDashboardPage.navigateTo();
    
    for (const applicationId of applicationIds) {
      await scoringDashboardPage.waitForScoringCompletion(applicationId);
      await scoringDashboardPage.viewScoreBreakdown(applicationId);
    }
    
    // Generate sales-specific report
    await reportGenerationPage.navigateTo();
    await reportGenerationPage.generateJobReport(jobId!);
    await reportGenerationPage.validateReportContent();
  });

  test('should handle edge cases and error scenarios', async ({ page }) => {
    const jobData = createJobData('technical');
    
    await jobCreationPage.navigateTo();
    await jobCreationPage.createJob(jobData);
    
    const jobId = await jobCreationPage.publishJob();
    
    // Test with corrupted resume file
    await resumeUploadPage.navigateToJob(jobId!);
    
    const fileInput = page.locator('[data-testid=\"resume-file-input\"]');
    await fileInput.setInputFiles(path.join(__dirname, '../test-data/resumes/corrupted-file.txt'));
    
    // Should show error message
    await expect(page.locator('[data-testid=\"upload-error\"]')).toContainText('Invalid file format');
    
    // Test with oversized file
    await fileInput.setInputFiles(path.join(__dirname, '../test-data/resumes/oversized-resume.pdf'));
    await expect(page.locator('[data-testid=\"upload-error\"]')).toContainText('File size too large');
    
    // Test with missing required fields
    await page.fill('[data-testid=\"candidate-name-input\"]', '');
    await page.click('[data-testid=\"submit-application-button\"]');
    
    await expect(page.locator('[data-testid=\"validation-error\"]')).toContainText('Name is required');
  });

  test('should track and monitor real-time processing status', async ({ page }) => {
    const jobData = createJobData('technical');
    
    await jobCreationPage.navigateTo();
    await jobCreationPage.createJob(jobData);
    const jobId = await jobCreationPage.publishJob();
    
    // Upload resume and monitor real-time status
    await resumeUploadPage.navigateToJob(jobId!);
    
    const candidate = createCandidateData('excellent');
    await page.fill('[data-testid=\"candidate-name-input\"]', candidate.name);
    await page.fill('[data-testid=\"candidate-email-input\"]', candidate.email);
    await page.fill('[data-testid=\"candidate-phone-input\"]', candidate.phone);
    
    const fileInput = page.locator('[data-testid=\"resume-file-input\"]');
    await fileInput.setInputFiles(path.join(__dirname, '../test-data/resumes', candidate.resumeFile));
    
    // Monitor upload progress
    await expect(page.locator('[data-testid=\"upload-progress\"]')).toBeVisible();
    await expect(page.locator('[data-testid=\"parsing-status\"]')).toContainText('Parsing resume...');
    await expect(page.locator('[data-testid=\"extraction-status\"]')).toContainText('Extracting information...');
    await expect(page.locator('[data-testid=\"analysis-status\"]')).toContainText('Analyzing content...');
    
    await page.click('[data-testid=\"submit-application-button\"]');
    
    // Monitor scoring progress in real-time
    await scoringDashboardPage.navigateTo();
    
    const applicationId = await page.locator('[data-testid=\"latest-application-id\"]').textContent();
    
    // Real-time status updates
    await expect(page.locator(`[data-testid=\"scoring-status-${applicationId}\"]`)).toContainText('Queued');
    await expect(page.locator(`[data-testid=\"scoring-status-${applicationId}\"]`)).toContainText('Processing');
    await expect(page.locator(`[data-testid=\"scoring-status-${applicationId}\"]`)).toContainText('Completed');
    
    // Verify final score is displayed
    const finalScore = await scoringDashboardPage.getScore(applicationId!);
    expect(finalScore).toBeGreaterThan(0);
    expect(finalScore).toBeLessThanOrEqual(100);
  });
});