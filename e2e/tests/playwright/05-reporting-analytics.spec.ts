import { test, expect } from '@playwright/test';

/**
 * Critical Workflow #5: Reporting & Analytics
 * Tests the comprehensive reporting and analytics functionality
 */
test.describe('Reporting & Analytics Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Login as admin/HR manager who has access to reports
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@ai-recruitment.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('should display recruitment analytics dashboard', async ({ page }) => {
    // Navigate to analytics dashboard
    await page.click('text=Analytics');
    await expect(page).toHaveURL(/.*\/analytics/);

    // Verify main dashboard components
    await expect(page.locator('.analytics-dashboard')).toBeVisible();
    
    // Check key performance indicators
    await expect(page.locator('.kpi-total-applications')).toBeVisible();
    await expect(page.locator('.kpi-active-jobs')).toBeVisible();
    await expect(page.locator('.kpi-successful-hires')).toBeVisible();
    await expect(page.locator('.kpi-avg-time-to-hire')).toBeVisible();
    
    // Verify charts are rendered
    await expect(page.locator('.applications-over-time-chart')).toBeVisible();
    await expect(page.locator('.hiring-funnel-chart')).toBeVisible();
    await expect(page.locator('.source-effectiveness-chart')).toBeVisible();
    
    // Check for data loading completion
    await expect(page.locator('.chart-loading')).toHaveCount(0, { timeout: 10000 });
  });

  test('should generate and download hiring reports', async ({ page }) => {
    await page.goto('/analytics/reports');
    
    // Generate monthly hiring report
    await page.selectOption('select[name="reportType"]', 'monthly-hiring');
    await page.selectOption('select[name="reportPeriod"]', 'last-3-months');
    
    // Configure report options
    await page.check('input[name="includeCharts"]');
    await page.check('input[name="includeDetails"]');
    await page.selectOption('select[name="format"]', 'pdf');
    
    // Generate report
    await page.click('button[data-action="generate-report"]');
    
    // Wait for report generation
    await expect(page.locator('.report-generating')).toBeVisible();
    await expect(page.locator('.report-ready')).toBeVisible({ timeout: 30000 });
    
    // Download report
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[data-action="download-report"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toMatch(/monthly-hiring.*\.pdf$/);
  });

  test('should show job performance analytics', async ({ page }) => {
    await page.goto('/analytics/jobs');
    
    // Verify job performance metrics
    await expect(page.locator('.job-performance-table')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th')).toContainText(['Job Title', 'Applications', 'Match Quality', 'Time to Fill', 'Status']);
    
    // Test sorting by applications
    await page.click('th:has-text("Applications")');
    
    // Verify sorting indicator
    await expect(page.locator('th:has-text("Applications") .sort-indicator')).toBeVisible();
    
    // Test filtering
    await page.selectOption('select[name="statusFilter"]', 'active');
    await expect(page.locator('td:has-text("Active")')).toHaveCount.atLeast(1);
    
    // Click on a job to see detailed analytics
    await page.click('.job-row:first-child .job-title');
    
    // Verify job detail analytics
    await expect(page.locator('.job-analytics-detail')).toBeVisible();
    await expect(page.locator('.application-timeline')).toBeVisible();
    await expect(page.locator('.candidate-quality-distribution')).toBeVisible();
    await expect(page.locator('.skills-analysis')).toBeVisible();
  });

  test('should display candidate pipeline analytics', async ({ page }) => {
    await page.goto('/analytics/pipeline');
    
    // Verify pipeline visualization
    await expect(page.locator('.pipeline-visualization')).toBeVisible();
    
    // Check pipeline stages
    const expectedStages = ['Applied', 'Screened', 'Interviewed', 'Offered', 'Hired'];
    for (const stage of expectedStages) {
      await expect(page.locator('.pipeline-stage')).toContainText(stage);
    }
    
    // Verify conversion rates
    await expect(page.locator('.conversion-rates')).toBeVisible();
    
    // Test time period filtering
    await page.selectOption('select[name="timePeriod"]', 'last-quarter');
    
    // Wait for data to reload
    await expect(page.locator('.pipeline-loading')).toBeHidden({ timeout: 10000 });
    
    // Check bottleneck analysis
    await expect(page.locator('.bottleneck-analysis')).toBeVisible();
    await expect(page.locator('.improvement-suggestions')).toBeVisible();
  });

  test('should show diversity and inclusion metrics', async ({ page }) => {
    await page.goto('/analytics/diversity');
    
    // Verify diversity dashboard
    await expect(page.locator('.diversity-dashboard')).toBeVisible();
    
    // Check diversity metrics
    await expect(page.locator('.gender-distribution')).toBeVisible();
    await expect(page.locator('.ethnicity-breakdown')).toBeVisible();
    await expect(page.locator('.age-distribution')).toBeVisible();
    
    // Verify hiring fairness metrics
    await expect(page.locator('.hiring-fairness-score')).toBeVisible();
    await expect(page.locator('.bias-detection-results')).toBeVisible();
    
    // Test comparison views
    await page.click('button[data-view="comparison"]');
    await expect(page.locator('.diversity-comparison')).toBeVisible();
    
    // Check compliance reporting
    await page.click('tab[data-tab="compliance"]');
    await expect(page.locator('.compliance-metrics')).toBeVisible();
    await expect(page.locator('.eeo-statistics')).toBeVisible();
  });

  test('should create custom reports with filters', async ({ page }) => {
    await page.goto('/analytics/custom-reports');
    
    // Start creating a custom report
    await page.click('button[data-action="create-custom-report"]');
    
    // Configure report parameters
    await page.fill('input[name="reportName"]', 'Q4 Recruitment Performance');
    await page.selectOption('select[name="dataSource"]', 'applications');
    
    // Select date range
    await page.fill('input[name="startDate"]', '2024-10-01');
    await page.fill('input[name="endDate"]', '2024-12-31');
    
    // Add filters
    await page.click('button[data-action="add-filter"]');
    await page.selectOption('select[name="filterField"]', 'department');
    await page.selectOption('select[name="filterValue"]', 'engineering');
    
    // Select metrics to include
    await page.check('input[name="metric-applications"]');
    await page.check('input[name="metric-hires"]');
    await page.check('input[name="metric-time-to-hire"]');
    
    // Choose visualization type
    await page.selectOption('select[name="chartType"]', 'bar-chart');
    
    // Generate report
    await page.click('button[data-action="generate-custom-report"]');
    
    // Verify report generation
    await expect(page.locator('.custom-report-results')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.report-chart')).toBeVisible();
    await expect(page.locator('.report-data-table')).toBeVisible();
    
    // Save report template
    await page.click('button[data-action="save-report-template"]');
    await expect(page.locator('.success-message')).toContainText('Report template saved');
  });

  test('should show real-time recruitment metrics', async ({ page }) => {
    await page.goto('/analytics/real-time');
    
    // Verify real-time dashboard
    await expect(page.locator('.real-time-dashboard')).toBeVisible();
    
    // Check live metrics
    await expect(page.locator('.live-applications-count')).toBeVisible();
    await expect(page.locator('.active-interviews-count')).toBeVisible();
    await expect(page.locator('.pending-reviews-count')).toBeVisible();
    
    // Verify auto-refresh functionality
    const initialValue = await page.locator('.live-applications-count .value').textContent();
    
    // Wait for auto-refresh (should happen every 30 seconds)
    await page.waitForTimeout(35000);
    
    // The value might change or stay the same, but the timestamp should update
    await expect(page.locator('.last-updated')).toContainText(/\d{2}:\d{2}:\d{2}/);
    
    // Test manual refresh
    await page.click('button[data-action="refresh-metrics"]');
    await expect(page.locator('.refreshing-indicator')).toBeVisible();
    await expect(page.locator('.refreshing-indicator')).toBeHidden({ timeout: 5000 });
  });

  test('should export analytics data in various formats', async ({ page }) => {
    await page.goto('/analytics');
    
    // Test CSV export
    await page.click('button[data-action="export-data"]');
    await page.selectOption('select[name="exportFormat"]', 'csv');
    await page.selectOption('select[name="dataRange"]', 'last-month');
    
    const csvDownload = page.waitForEvent('download');
    await page.click('button[data-confirm="export"]');
    const csvFile = await csvDownload;
    
    expect(csvFile.suggestedFilename()).toMatch(/analytics.*\.csv$/);
    
    // Test Excel export
    await page.click('button[data-action="export-data"]');
    await page.selectOption('select[name="exportFormat"]', 'xlsx');
    
    const excelDownload = page.waitForEvent('download');
    await page.click('button[data-confirm="export"]');
    const excelFile = await excelDownload;
    
    expect(excelFile.suggestedFilename()).toMatch(/analytics.*\.xlsx$/);
  });

  test('should show performance benchmarks and comparisons', async ({ page }) => {
    await page.goto('/analytics/benchmarks');
    
    // Verify benchmark dashboard
    await expect(page.locator('.benchmarks-dashboard')).toBeVisible();
    
    // Check industry comparisons
    await expect(page.locator('.industry-benchmark-chart')).toBeVisible();
    await expect(page.locator('.performance-vs-benchmark')).toBeVisible();
    
    // Verify key benchmark metrics
    await expect(page.locator('.benchmark-time-to-hire')).toBeVisible();
    await expect(page.locator('.benchmark-cost-per-hire')).toBeVisible();
    await expect(page.locator('.benchmark-quality-of-hire')).toBeVisible();
    
    // Test benchmark period comparison
    await page.selectOption('select[name="comparisonPeriod"]', 'year-over-year');
    
    // Wait for data to update
    await expect(page.locator('.comparison-loading')).toBeHidden({ timeout: 10000 });
    
    // Verify trend indicators
    await expect(page.locator('.trend-indicator')).toHaveCount.atLeast(3);
    
    // Check improvement recommendations
    await expect(page.locator('.improvement-recommendations')).toBeVisible();
    await expect(page.locator('.action-items')).toBeVisible();
  });
});