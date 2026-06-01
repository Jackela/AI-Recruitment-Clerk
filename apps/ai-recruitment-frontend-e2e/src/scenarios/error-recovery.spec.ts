import { test, expect } from '@playwright/test';
import { TEST_USERS, SAMPLE_RESUMES } from '../fixtures/test-data';

/**
 * 错误恢复场景测试 - Error Recovery
 *
 * 测试场景：
 * 1. 网络中断后恢复
 * 2. 服务器错误后重试
 * 3. 文件上传失败恢复
 * 4. 表单提交失败后恢复
 */
test.describe('Error Recovery', () => {
  test('system recovers from network interruption during upload', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["candidate"].email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS["candidate"].password,
    );
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 开始上传
    await page.goto('/upload');
    await expect(
      page.locator('[data-testid="upload-container"]'),
    ).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUMES["largeFile"]);

    // 模拟网络中断
    await page.route('**/api/upload', (route) => {
      route.abort('internetdisconnected');
    });

    await page.click('[data-testid="upload-submit-button"]');

    // 验证错误消息显示
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'network',
    );

    // 恢复网络并点击重试
    await page.unroute('**/api/upload');
    await page.click('[data-testid="retry-upload"]');

    // 验证上传成功
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({
      timeout: 60000,
    });
    await expect(
      page.locator('[data-testid="upload-progress"]'),
    ).toBeHidden();
  });

  test('recovers from server error during job creation', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 设置第一次请求失败
    let requestCount = 0;
    await page.route('**/api/jobs', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        route.continue();
      }
    });

    // 尝试创建职位
    await page.goto('/jobs/create');
    await page.fill('[data-testid="job-title-input"]', 'Test Job');
    await page.fill('[data-testid="jd-textarea"]', 'Test description');
    await page.click('[data-testid="submit-button"]');

    // 验证错误显示
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Error',
    );

    // 点击重试
    await page.click('[data-testid="retry-button"]');

    // 验证第二次请求成功
    await page.waitForURL(/\/jobs/);
    await expect(page.locator('text=Test Job')).toBeVisible();
  });

  test('handles timeout and allows retry', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 模拟超时
    await page.route('**/api/analysis/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 35000)); // 35秒延迟
      route.continue();
    });

    // 触发分析操作
    await page.goto('/analysis');
    await page.click('[data-testid="start-analysis"]');

    // 等待超时错误
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({
      timeout: 40000,
    });
    await expect(page.locator('[data-testid="timeout-error"]')).toContainText(
      'timeout',
    );

    // 移除延迟路由
    await page.unroute('**/api/analysis/**');

    // 点击重试
    await page.click('[data-testid="retry-analysis"]');

    // 验证分析成功
    await expect(page.locator('[data-testid="analysis-results"]')).toBeVisible({
      timeout: 60000,
    });
  });

  test('recovers from authentication token expiration', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 模拟 token 过期
    await page.evaluate(() => {
      localStorage.setItem('token', 'expired_token_12345');
    });

    // 尝试访问受保护页面
    await page.goto('/jobs/create');
    await page.fill('[data-testid="job-title-input"]', 'Token Test Job');
    await page.fill('[data-testid="jd-textarea"]', 'Test description');
    await page.click('[data-testid="submit-button"]');

    // 验证系统重定向到登录页面
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.locator('[data-testid="session-expired-message"]'),
    ).toBeVisible();

    // 重新登录
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');

    // 验证重定向回之前的页面
    await page.waitForURL(/\/jobs\/create/);

    // 验证表单数据已保留
    const titleValue = await page.inputValue('[data-testid="job-title-input"]');
    expect(titleValue).toBe('Token Test Job');
  });

  test('handles partial form submission failure', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 模拟部分成功（创建成功但索引失败）
    await page.route('**/api/jobs', (route) => {
      route.fulfill({
        status: 207, // Multi-Status
        body: JSON.stringify({
          success: true,
          warnings: ['Search index update failed'],
          data: { id: 123, title: 'Partial Job' },
        }),
      });
    });

    await page.goto('/jobs/create');
    await page.fill('[data-testid="job-title-input"]', 'Partial Job');
    await page.fill('[data-testid="jd-textarea"]', 'Test description');
    await page.click('[data-testid="submit-button"]');

    // 验证警告消息显示
    await expect(page.locator('[data-testid="warning-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="warning-message"]')).toContainText(
      'index',
    );

    // 验证职位仍然创建成功
    await page.waitForURL(/\/jobs/);
    await expect(page.locator('text=Partial Job')).toBeVisible();
  });
});
