import { test, expect } from '@playwright/test';

/**
 * Critical Workflow #4: AI-Powered Matching & Scoring
 * Tests the intelligent matching between resumes and job postings
 */
test.describe('AI Matching & Scoring Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Login as HR manager
    await page.goto('/login');
    await page.fill('input[name="email"]', 'hr@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should create job and get matching candidates', async ({ page }) => {
    // Create a specific job for matching
    await page.goto('/jobs/create');
    
    await page.fill('input[name="title"]', 'Senior React Developer');
    await page.fill('input[name="company"]', 'Tech Innovation Corp');
    await page.fill('textarea[name="description"]', `
      We are looking for an experienced React developer with:
      - 5+ years React experience
      - Strong TypeScript knowledge
      - Experience with Redux/Context API
      - Node.js backend experience
      - AWS cloud experience
    `);
    
    // Add required skills
    const skills = ['React', 'TypeScript', 'Redux', 'Node.js', 'AWS'];
    for (const skill of skills) {
      await page.fill('input[name="skillInput"]', skill);
      await page.press('input[name="skillInput"]', 'Enter');
    }
    
    // Set experience requirements
    await page.selectOption('select[name="experienceLevel"]', 'senior');
    await page.fill('input[name="minExperience"]', '5');
    
    // Publish the job
    await page.click('button[data-action="publish"]');
    
    // Wait for job to be processed and matched
    await expect(page.locator('.success-message')).toContainText('Job published successfully');
    
    // Navigate to job matches
    await page.goto('/jobs');
    await page.click('.job-card:has-text("Senior React Developer") .view-matches-button');
    
    // Verify matching results page
    await expect(page).toHaveURL(/.*\/jobs\/.*\/matches/);
    await expect(page.locator('.matching-results')).toBeVisible();
    
    // Check for candidate matches
    await expect(page.locator('.candidate-match')).toHaveCount.atLeast(1);
    
    // Verify match scores are displayed
    await expect(page.locator('.match-score')).toBeVisible();
    await expect(page.locator('.match-percentage')).toBeVisible();
  });

  test('should display detailed match analysis', async ({ page }) => {
    // Navigate to a job with matches
    await page.goto('/jobs');
    await page.click('.job-card:first-child .view-matches-button');
    
    // Click on a candidate match to see details
    await page.click('.candidate-match:first-child');
    
    // Verify detailed match analysis
    await expect(page.locator('.match-analysis')).toBeVisible();
    
    // Check skill matching breakdown
    await expect(page.locator('.skill-matches')).toBeVisible();
    await expect(page.locator('.matched-skills')).toBeVisible();
    await expect(page.locator('.missing-skills')).toBeVisible();
    
    // Check experience matching
    await expect(page.locator('.experience-match')).toBeVisible();
    
    // Check cultural fit analysis (if available)
    await expect(page.locator('.cultural-fit-score')).toBeVisible();
    
    // Verify confidence score
    await expect(page.locator('.confidence-score')).toBeVisible();
  });

  test('should allow filtering matches by score', async ({ page }) => {
    await page.goto('/jobs');
    await page.click('.job-card:first-child .view-matches-button');
    
    // Filter by high match scores
    await page.selectOption('select[name="scoreFilter"]', 'high'); // >80%
    
    // Verify all displayed matches have high scores
    const matchScores = await page.locator('.match-percentage').allTextContents();
    for (const score of matchScores) {
      const percentage = parseInt(score.replace('%', ''));
      expect(percentage).toBeGreaterThan(80);
    }
    
    // Filter by medium scores
    await page.selectOption('select[name="scoreFilter"]', 'medium'); // 50-80%
    
    // Test specific skill filtering
    await page.click('button[data-filter="skills"]');
    await page.check('input[value="React"]');
    await page.click('button[data-action="apply-filters"]');
    
    // Verify filtered candidates have React skills
    await expect(page.locator('.candidate-skills')).toContainText('React');
  });

  test('should show scoring algorithm explanation', async ({ page }) => {
    await page.goto('/jobs');
    await page.click('.job-card:first-child .view-matches-button');
    await page.click('.candidate-match:first-child');
    
    // Click to see scoring details
    await page.click('button[data-action="show-scoring-details"]');
    
    // Verify scoring breakdown
    await expect(page.locator('.scoring-breakdown')).toBeVisible();
    
    // Check individual scoring components
    await expect(page.locator('.skill-score')).toBeVisible();
    await expect(page.locator('.experience-score')).toBeVisible();
    await expect(page.locator('.education-score')).toBeVisible();
    await expect(page.locator('.location-score')).toBeVisible();
    
    // Verify scoring weights are displayed
    await expect(page.locator('.scoring-weights')).toBeVisible();
    
    // Check AI confidence explanation
    await expect(page.locator('.ai-confidence-explanation')).toBeVisible();
  });

  test('should allow recruiter actions on matches', async ({ page }) => {
    await page.goto('/jobs');
    await page.click('.job-card:first-child .view-matches-button');
    
    // Select a candidate
    await page.click('.candidate-match:first-child .candidate-checkbox');
    
    // Test shortlist action
    await page.click('button[data-action="shortlist-selected"]');
    await expect(page.locator('.success-message')).toContainText('Candidate shortlisted');
    
    // Test reject action
    await page.click('.candidate-match:nth-child(2) .candidate-checkbox');
    await page.click('button[data-action="reject-selected"]');
    
    // Add rejection reason
    await page.selectOption('select[name="rejectionReason"]', 'insufficient-experience');
    await page.fill('textarea[name="rejectionNotes"]', 'Does not meet minimum experience requirements');
    await page.click('button[data-confirm="reject"]');
    
    await expect(page.locator('.success-message')).toContainText('Candidate rejected');
    
    // Test contact candidate action
    await page.click('.candidate-match:nth-child(3)');
    await page.click('button[data-action="contact-candidate"]');
    
    // Fill contact form
    await page.selectOption('select[name="contactMethod"]', 'email');
    await page.fill('textarea[name="message"]', 'We would like to schedule an interview with you.');
    await page.click('button[data-action="send-contact"]');
    
    await expect(page.locator('.success-message')).toContainText('Contact sent successfully');
  });

  test('should handle resume-to-multiple-jobs matching', async ({ page }) => {
    // Navigate to a specific resume
    await page.goto('/resumes');
    await page.click('.resume-card:first-child');
    
    // View job matches for this resume
    await page.click('tab[data-tab="job-matches"]');
    
    // Verify multiple job matches are displayed
    await expect(page.locator('.job-match')).toHaveCount.atLeast(2);
    
    // Check match scores for each job
    await expect(page.locator('.job-match .match-score')).toHaveCount.atLeast(2);
    
    // Sort by match score
    await page.click('button[data-sort="match-score-desc"]');
    
    // Verify sorting worked
    const matchScores = await page.locator('.match-score .percentage').allTextContents();
    const scores = matchScores.map(s => parseInt(s.replace('%', '')));
    
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i-1]).toBeGreaterThanOrEqual(scores[i]);
    }
  });

  test('should show matching analytics and insights', async ({ page }) => {
    // Navigate to matching analytics
    await page.goto('/analytics/matching');
    
    // Verify analytics dashboard
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
    
    // Check key metrics
    await expect(page.locator('.metric-total-matches')).toBeVisible();
    await expect(page.locator('.metric-avg-match-score')).toBeVisible();
    await expect(page.locator('.metric-successful-hires')).toBeVisible();
    
    // Check matching performance charts
    await expect(page.locator('.match-score-distribution')).toBeVisible();
    await expect(page.locator('.skills-demand-chart')).toBeVisible();
    await expect(page.locator('.time-to-fill-chart')).toBeVisible();
    
    // Test date range filtering
    await page.selectOption('select[name="dateRange"]', 'last-30-days');
    
    // Verify charts update
    await expect(page.locator('.chart-loading')).toBeHidden({ timeout: 10000 });
    
    // Check for insights and recommendations
    await expect(page.locator('.matching-insights')).toBeVisible();
    await expect(page.locator('.skill-recommendations')).toBeVisible();
  });

  test('should handle AI model confidence and accuracy', async ({ page }) => {
    await page.goto('/jobs');
    await page.click('.job-card:first-child .view-matches-button');
    await page.click('.candidate-match:first-child');
    
    // Check AI confidence indicators
    await expect(page.locator('.ai-confidence')).toBeVisible();
    
    // High confidence should be green
    const confidenceElement = page.locator('.ai-confidence');
    const confidence = await confidenceElement.getAttribute('data-confidence');
    
    if (parseFloat(confidence) > 0.8) {
      await expect(confidenceElement).toHaveClass(/high-confidence/);
    } else if (parseFloat(confidence) > 0.6) {
      await expect(confidenceElement).toHaveClass(/medium-confidence/);
    } else {
      await expect(confidenceElement).toHaveClass(/low-confidence/);
    }
    
    // Check for uncertainty indicators
    await expect(page.locator('.uncertainty-warning')).toBeVisible();
    
    // Verify explanations for AI decisions
    await page.click('button[data-action="explain-ai-decision"]');
    await expect(page.locator('.ai-explanation')).toBeVisible();
    await expect(page.locator('.decision-factors')).toBeVisible();
  });
});