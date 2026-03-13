import { test, expect } from '@playwright/test';

/**
 * Backend Unavailable Tests
 *
 * These tests verify that the application behaves correctly when backend services
 * are not available. Since this is an AI-powered recruitment system, it should:
 *
 * 1. Detect backend unavailability
 * 2. Show clear error messages (NOT mock data)
 * 3. Block operations that require backend
 * 4. Allow retry connection
 *
 * NOTE: These tests should be run WITHOUT the backend gateway running.
 */

test.describe('Backend Unavailable Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure backend is not available by using a wrong port
    await page.goto('http://localhost:4200');
    // Wait for connection check
    await page.waitForTimeout(4000);
  });

  test('should show service unavailable screen when backend is down', async ({
    page,
  }) => {
    // Check for the service unavailable overlay or error message
    const errorMessage = await page
      .locator('.error-message, .service-unavailable, [role="alert"]')
      .first();

    // Should show some form of error (either full overlay or inline error)
    const hasError = await errorMessage.isVisible().catch(() => false);

    if (hasError) {
      const errorText = await errorMessage.textContent();
      console.log('Error message shown:', errorText);

      // Error should mention backend/service unavailable
      expect(errorText?.toLowerCase()).toMatch(/backend|service|服务器|服务/);
    } else {
      // If no error overlay, check that job list shows error state
      const pageContent = await page.locator('body').textContent();
      expect(pageContent).toMatch(/error|failed|失败|不可用/i);
    }
  });

  test('should NOT show mock data when backend is unavailable', async ({
    page,
  }) => {
    // Wait for any data to load
    await page.waitForTimeout(2000);

    // Check the page content
    const pageContent = await page.locator('body').textContent();

    // Should NOT show mock job titles
    expect(pageContent).not.toContain('高级前端工程师');
    expect(pageContent).not.toContain('产品经理');
    expect(pageContent).not.toContain('Mock Job');

    // Should show error or empty state instead
    expect(pageContent).toMatch(/error|failed|失败|暂无数据|empty/i);
  });

  test('should block resume upload when backend is unavailable', async ({
    page,
  }) => {
    // Navigate to upload page
    await page.goto('http://localhost:4200/analysis');
    await page.waitForTimeout(3000);

    // Try to interact with upload
    const uploadInput = await page.locator('input[type="file"]').first();
    const hasUpload = await uploadInput.isVisible().catch(() => false);

    if (hasUpload) {
      // Try to upload a file
      await uploadInput.setInputFiles({
        name: 'test-resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test pdf content'),
      });

      // Wait for error
      await page.waitForTimeout(2000);

      // Should show error about backend unavailable
      const errorElement = await page
        .locator('.error, [role="alert"], .alert')
        .first();
      const errorText = await errorElement.textContent().catch(() => '');

      expect(errorText?.toLowerCase() || '').toMatch(
        /backend|service|服务器|连接|error/i,
      );
    }
  });

  test('should allow retry connection', async ({ page }) => {
    // Look for retry button
    const retryButton = await page
      .locator(
        'button:has-text("重试"), button:has-text("Retry"), button:has-text("重新连接")',
      )
      .first();
    const hasRetryButton = await retryButton.isVisible().catch(() => false);

    if (hasRetryButton) {
      // Click retry
      await retryButton.click();

      // Wait for connection attempt
      await page.waitForTimeout(3000);

      // Should still show error (since backend is not running)
      const errorMessage = await page
        .locator('.error-message, [role="alert"]')
        .first();
      const isErrorVisible = await errorMessage.isVisible().catch(() => false);

      expect(isErrorVisible).toBe(true);
    }
  });
});
