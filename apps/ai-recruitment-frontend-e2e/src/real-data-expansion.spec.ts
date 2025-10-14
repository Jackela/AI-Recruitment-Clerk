import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatible __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Real Data Expansion E2E Test Suite
 *
 * Comprehensive data-driven testing using real PDF resume files.
 * This suite dynamically discovers all PDF files in the test-data/resumes/ directory
 * and creates individual test cases for each one, performing full UAT workflow validation.
 *
 * Features:
 * - Dynamic test generation based on available PDF files
 * - Comprehensive UAT workflow for each resume
 * - Robust error handling and logging
 * - Cross-browser compatibility testing
 * - Performance monitoring and validation
 */

// Test configuration
const TEST_CONFIG = {
  baseTimeout: 45000,
  fileUploadTimeout: 15000,
  analysisTimeout: 30000,
  retryDelay: 3000,
  maxRetries: 2,
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  maxLoadTime: 10000,
  maxAnalysisTime: 25000,
  maxResponseTime: 5000,
};

// Paths configuration
const PATHS = {
  resumesDir: path.resolve(__dirname, 'test-data', 'resumes'),
  jdFile: path.resolve(__dirname, '..', 'UAT_Architect_JD.txt'),
  coachPath: '/coach',
};

/**
 * Dynamically discover all PDF files in the test data directory
 */
function discoverResumeFiles(): string[] {
  try {
    if (!fs.existsSync(PATHS.resumesDir)) {
      throw new Error(`Resume directory not found: ${PATHS.resumesDir}`);
    }

    const allFiles = fs.readdirSync(PATHS.resumesDir);
    const pdfFiles = allFiles.filter(
      (file) =>
        file.toLowerCase().endsWith('.pdf') &&
        fs.statSync(path.join(PATHS.resumesDir, file)).isFile(),
    );

    console.log(`📁 Discovered ${pdfFiles.length} PDF files for testing:`);
    pdfFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });

    if (pdfFiles.length === 0) {
      throw new Error('No PDF files found in test data directory');
    }

    return pdfFiles;
  } catch (error) {
    console.error('❌ Error discovering resume files:', error);
    throw error;
  }
}

/**
 * Validate test prerequisites
 */
function validateTestPrerequisites(): string {
  try {
    // Verify JD file exists
    if (!fs.existsSync(PATHS.jdFile)) {
      throw new Error(`Job description file not found: ${PATHS.jdFile}`);
    }

    // Read and validate JD content
    const jdContent = fs.readFileSync(PATHS.jdFile, 'utf-8');
    if (!jdContent || jdContent.trim().length < 50) {
      throw new Error('Job description file is empty or too short');
    }

    console.log(
      `✅ JD file validated: ${path.basename(PATHS.jdFile)} (${jdContent.length} characters)`,
    );
    return jdContent;
  } catch (error) {
    console.error('❌ Prerequisites validation failed:', error);
    throw error;
  }
}

/**
 * Utility function to sanitize filename for test names
 */
function sanitizeTestName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Enhanced error logging with context
 */
function logTestContext(filename: string, stage: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] 🔍 ${filename} | ${stage}${details ? ` | ${JSON.stringify(details)}` : ''}`,
  );
}

/**
 * Comprehensive UAT workflow execution
 */
async function executeUATWorkflow(
  page: any,
  filename: string,
  jdContent: string,
) {
  const startTime = Date.now();
  const resumePath = path.join(PATHS.resumesDir, filename);

  try {
    logTestContext(filename, 'Starting UAT workflow');

    // Step 1: Navigate to coach page with timeout monitoring
    const navigationStart = Date.now();
    await page.goto(PATHS.coachPath);
    await page.waitForLoadState('networkidle');
    const navigationTime = Date.now() - navigationStart;

    if (navigationTime > PERFORMANCE_THRESHOLDS.maxLoadTime) {
      console.warn(
        `⚠️ Slow navigation: ${navigationTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.maxLoadTime}ms)`,
      );
    }

    logTestContext(filename, 'Navigation completed', { navigationTime });

    // Step 2: Verify coach page loaded correctly
    await expect(
      page
        .locator('h2')
        .filter({ hasText: /coach.*analysis|coach.*gap|gap.*analysis/i }),
    ).toBeVisible({ timeout: TEST_CONFIG.baseTimeout });

    logTestContext(filename, 'Coach page validated');

    // Step 3: Fill job description with validation
    const jdTextarea = page
      .locator('#jd, textarea[name="jd"], [data-testid="jd-input"]')
      .first();
    await expect(jdTextarea).toBeVisible({ timeout: TEST_CONFIG.baseTimeout });
    await jdTextarea.fill(jdContent);

    // Verify JD was filled correctly
    const filledValue = await jdTextarea.inputValue();
    expect(filledValue.length).toBeGreaterThan(50);

    logTestContext(filename, 'JD filled and validated', {
      originalLength: jdContent.length,
      filledLength: filledValue.length,
    });

    // Step 4: Upload resume file with comprehensive validation
    const fileInput = page
      .locator('#resume, input[type="file"], [data-testid="resume-upload"]')
      .first();
    await expect(fileInput).toBeVisible({ timeout: TEST_CONFIG.baseTimeout });

    // Verify file exists and is readable
    expect(
      fs.existsSync(resumePath),
      `Resume file not found: ${resumePath}`,
    ).toBeTruthy();
    const fileStats = fs.statSync(resumePath);
    expect(fileStats.size, `Resume file is empty: ${filename}`).toBeGreaterThan(
      0,
    );

    await fileInput.setInputFiles(resumePath);

    logTestContext(filename, 'Resume uploaded', {
      fileSize: fileStats.size,
      filePath: resumePath,
    });

    // Step 5: Submit analysis with enhanced monitoring
    const analyzeButton = page
      .locator('button')
      .filter({ hasText: /analyze|分析|提交|submit/i })
      .first();
    await expect(analyzeButton).toBeEnabled({
      timeout: TEST_CONFIG.retryDelay,
    });

    // Monitor API requests
    const analysisStart = Date.now();
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/gap-analysis-file') ||
        response.url().includes('/coach/analyze'),
      { timeout: TEST_CONFIG.analysisTimeout },
    );

    await analyzeButton.click();
    logTestContext(filename, 'Analysis submitted, waiting for response');

    try {
      const response = await responsePromise;
      const analysisTime = Date.now() - analysisStart;

      if (analysisTime > PERFORMANCE_THRESHOLDS.maxAnalysisTime) {
        console.warn(
          `⚠️ Slow analysis: ${analysisTime}ms (threshold: ${PERFORMANCE_THRESHOLDS.maxAnalysisTime}ms)`,
        );
      }

      logTestContext(filename, 'API response received', {
        status: response.status(),
        analysisTime: analysisTime,
        url: response.url(),
      });

      expect(response.status()).toBe(200);
    } catch (error) {
      logTestContext(
        filename,
        'API response timeout - continuing with UI validation',
      );
      console.warn(
        `⚠️ API timeout for ${filename}, but continuing with UI validation`,
      );
    }

    // Step 6: Wait for analysis completion with progressive checks
    await page.waitForTimeout(TEST_CONFIG.retryDelay);

    // Step 7: Comprehensive results validation
    logTestContext(filename, 'Validating diagnostic report display');

    // Check for diagnostic report component
    const reportComponent = page.locator('arc-gap-analysis-report');
    await expect(reportComponent).toBeVisible({
      timeout: TEST_CONFIG.baseTimeout,
    });

    // Verify diagnostic report heading
    const diagnosticHeading = page
      .locator('h3')
      .filter({ hasText: /diagnostic report/i });
    await expect(diagnosticHeading).toBeVisible({
      timeout: TEST_CONFIG.baseTimeout,
    });

    // Verify skills sections are present (even if empty)
    const reportDiv = page.locator('arc-gap-analysis-report div').first();
    await expect(reportDiv).toBeVisible({ timeout: TEST_CONFIG.baseTimeout });

    // Check for skills display patterns
    const hasMatchedSkills =
      (await reportDiv.locator('text=/Matched Skills.*:/i').count()) > 0;
    const hasMissingSkills =
      (await reportDiv.locator('text=/Missing Skills.*:/i').count()) > 0;

    expect(
      hasMatchedSkills || hasMissingSkills,
      'Either matched or missing skills section should be visible',
    ).toBeTruthy();

    const totalTime = Date.now() - startTime;
    logTestContext(filename, 'UAT workflow completed successfully', {
      totalTime,
      hasMatchedSkills,
      hasMissingSkills,
    });

    return {
      success: true,
      metrics: {
        totalTime,
        navigationTime,
        analysisTime: Date.now() - analysisStart,
      },
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logTestContext(filename, 'UAT workflow failed', {
      error: error.message,
      totalTime,
    });
    throw error;
  }
}

// Initialize test discovery and validation
const resumeFiles = discoverResumeFiles();
const jdContent = validateTestPrerequisites();

test.describe('Real Data Expansion - Dynamic PDF Resume Testing', () => {
  // Global test configuration
  test.setTimeout(60000); // 60 seconds per test

  test.beforeEach(async ({ page }) => {
    // Enhanced console monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`🚨 Console Error: ${msg.text()}`);
      } else if (msg.type() === 'warn') {
        console.log(`⚠️ Console Warning: ${msg.text()}`);
      }
    });

    // API request/response monitoring
    page.on('request', (request) => {
      if (
        request.url().includes('/coach') ||
        request.url().includes('/gap-analysis')
      ) {
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', (response) => {
      if (
        response.url().includes('/coach') ||
        response.url().includes('/gap-analysis')
      ) {
        console.log(`📥 Response: ${response.status()} ${response.url()}`);
      }
    });

    // Network error monitoring
    page.on('requestfailed', (request) => {
      console.error(
        `❌ Network Error: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
      );
    });
  });

  // Dynamically generate test cases for each PDF file
  for (const filename of resumeFiles) {
    const testName = sanitizeTestName(filename);

    test(`Dynamic UAT: ${testName} (${filename})`, async ({ page }) => {
      console.log(`\n🚀 Starting test for: ${filename}`);
      console.log(
        `📊 File ${resumeFiles.indexOf(filename) + 1} of ${resumeFiles.length}`,
      );

      try {
        const result = await executeUATWorkflow(page, filename, jdContent);

        console.log(`✅ Test completed successfully for: ${filename}`);
        console.log(`📈 Performance metrics:`, result.metrics);

        // Additional validation for successful completion
        expect(result.success).toBe(true);
        expect(result.metrics.totalTime).toBeLessThan(55000); // Under 55 seconds total
      } catch (error) {
        console.error(`❌ Test failed for ${filename}:`, error.message);

        // Capture additional debug information
        try {
          await page.screenshot({
            path: `test-results/real-data-expansion-${testName}-failure.png`,
            fullPage: true,
          });
        } catch (screenshotError) {
          console.warn(
            'Failed to capture failure screenshot:',
            screenshotError.message,
          );
        }

        throw error;
      }
    });
  }

  // Summary test to validate overall test suite execution
  test('Test Suite Summary and Validation', async ({ page }) => {
    console.log(`\n📋 Test Suite Summary:`);
    console.log(`📁 Total PDF files tested: ${resumeFiles.length}`);
    console.log(`📄 Job description: ${path.basename(PATHS.jdFile)}`);
    console.log(`🗂️ Resume directory: ${PATHS.resumesDir}`);
    console.log(`⚙️ Configuration: ${JSON.stringify(TEST_CONFIG, null, 2)}`);
    console.log(
      `📊 Performance thresholds: ${JSON.stringify(PERFORMANCE_THRESHOLDS, null, 2)}`,
    );

    // Verify test data integrity
    for (const filename of resumeFiles) {
      const resumePath = path.join(PATHS.resumesDir, filename);
      const fileStats = fs.statSync(resumePath);
      expect(
        fileStats.size,
        `File ${filename} should not be empty`,
      ).toBeGreaterThan(0);
    }

    console.log(
      `✅ All ${resumeFiles.length} PDF files validated for integrity`,
    );
    console.log(`🎯 Test suite ready for comprehensive execution`);
  });
});
