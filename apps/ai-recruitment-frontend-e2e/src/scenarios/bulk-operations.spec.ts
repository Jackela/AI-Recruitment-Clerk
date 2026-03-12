import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USERS, SAMPLE_RESUMES } from '../fixtures/test-data';

/**
 * 批量操作场景测试 - Bulk Operations
 *
 * 测试场景：
 * 1. 批量创建职位
 * 2. 批量删除简历
 * 3. 批量导出数据
 * 4. 批量状态更新
 * 5. 批量分析
 */
test.describe('Bulk Operations', () => {
  test('bulk create jobs from CSV import', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    // 登录
    await loginPage.navigateTo();
    await loginPage.login(TEST_USERS["hr"].email, TEST_USERS["hr"].password);
    await dashboardPage.waitForPageLoad();

    // 获取初始职位数量
    await page.goto('/jobs');
    const initialCount = await page.locator('[data-testid="job-card"]').count();

    // 导入 CSV 文件
    await page.goto('/jobs/import');
    await expect(
      page.locator('[data-testid="import-container"]'),
    ).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'jobs.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`title,description,department,location
Frontend Developer,React and TypeScript development,Engineering,Remote
Backend Developer,Node.js API development,Engineering,Remote
DevOps Engineer,CI/CD and infrastructure,Operations,Remote
Product Manager,Product strategy and roadmap,Product,New York
UI/UX Designer,User interface design,Design,San Francisco`),
    });

    await page.click('[data-testid="upload-csv-button"]');

    // 验证预览显示
    await expect(page.locator('[data-testid="import-preview"]')).toBeVisible();
    await expect(page.locator('[data-testid="preview-row"]')).toHaveCount(5);

    // 确认导入
    await page.click('[data-testid="confirm-import"]');

    // 验证批量创建成功
    await page.waitForSelector('[data-testid="import-success"]', {
      timeout: 30000,
    });

    await page.goto('/jobs');
    const newCount = await page.locator('[data-testid="job-card"]').count();
    expect(newCount).toBe(initialCount + 5);

    // 验证所有职位都已创建
    const jobTitles = await page
      .locator('[data-testid="job-card"] h3')
      .allTextContents();
    expect(jobTitles).toContain('Frontend Developer');
    expect(jobTitles).toContain('Backend Developer');
    expect(jobTitles).toContain('DevOps Engineer');
    expect(jobTitles).toContain('Product Manager');
    expect(jobTitles).toContain('UI/UX Designer');
  });

  test('bulk delete with confirmation and rollback option', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 创建测试职位
    await page.goto('/jobs/create');
    for (let i = 1; i <= 3; i++) {
      await page.fill(
        '[data-testid="job-title-input"]',
        `Bulk Delete Test Job ${i}`,
      );
      await page.fill('[data-testid="jd-textarea"]', `Description ${i}`);
      await page.click('[data-testid="submit-button"]');
      await page.waitForURL(/\/jobs/);
      await page.goto('/jobs/create');
    }

    // 批量选择
    await page.goto('/jobs');
    await page.check('[data-testid="select-all-checkbox"]');

    // 验证选中计数
    const selectedCount = await page
      .locator('[data-testid="job-checkbox"]:checked')
      .count();
    expect(selectedCount).toBeGreaterThanOrEqual(3);

    // 点击批量删除
    await page.click('[data-testid="bulk-delete-button"]');

    // 验证确认对话框
    await expect(
      page.locator('[data-testid="delete-confirmation-modal"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="delete-count"]')).toContainText(
      selectedCount.toString(),
    );

    // 输入确认文本
    await page.fill('[data-testid="confirm-delete-input"]', 'DELETE');
    await page.click('[data-testid="confirm-delete"]');

    // 验证删除成功
    await page.waitForSelector('[data-testid="bulk-delete-success"]', {
      timeout: 10000,
    });

    // 验证职位已删除
    for (let i = 1; i <= 3; i++) {
      await expect(
        page.locator(`text=Bulk Delete Test Job ${i}`),
      ).not.toBeVisible();
    }
  });

  test('bulk export to Excel with filtering', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 进入导出页面
    await page.goto('/analysis/export');
    await expect(
      page.locator('[data-testid="export-container"]'),
    ).toBeVisible();

    // 设置过滤器
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-12-31');
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    await page.fill('[data-testid="min-score"]', '70');

    // 预览导出
    await page.click('[data-testid="preview-export"]');
    await expect(page.locator('[data-testid="export-preview"]')).toBeVisible();

    // 执行导出
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-excel"]');
    const download = await downloadPromise;

    // 验证文件名
    expect(download.suggestedFilename()).toMatch(
      /analysis_export_\d{4}-\d{2}-\d{2}\.xlsx/,
    );
  });

  test('bulk update candidate status', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 进入候选人列表
    await page.goto('/candidates');
    await expect(page.locator('[data-testid="candidates-list"]')).toBeVisible();

    // 选择多个候选人
    const checkboxes = await page
      .locator('[data-testid="candidate-checkbox"]')
      .all();
    for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
      await checkboxes[i].check();
    }

    // 打开批量操作菜单
    await page.click('[data-testid="bulk-actions-dropdown"]');
    await page.click('[data-testid="bulk-update-status"]');

    // 选择新状态
    await page.selectOption(
      '[data-testid="new-status"]',
      'interview_scheduled',
    );
    await page.fill('[data-testid="status-note"]', 'Moving to interview phase');

    // 确认更新
    await page.click('[data-testid="confirm-status-update"]');

    // 验证成功消息
    await expect(
      page.locator('[data-testid="status-update-success"]'),
    ).toBeVisible();

    // 验证状态已更新
    const updatedCount = await page
      .locator(
        '[data-testid="candidate-status"]:has-text("Interview Scheduled")',
      )
      .count();
    expect(updatedCount).toBeGreaterThanOrEqual(3);
  });

  test('bulk resume analysis with progress tracking', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 进入批量分析页面
    await page.goto('/analysis/bulk');
    await expect(
      page.locator('[data-testid="bulk-analysis-container"]'),
    ).toBeVisible();

    // 选择职位
    await page.selectOption('[data-testid="job-select"]', '1');

    // 批量上传多个简历
    const files = [
      SAMPLE_RESUMES["seniorDeveloper"],
      SAMPLE_RESUMES["juniorDeveloper"],
      SAMPLE_RESUMES["fullStackDeveloper"],
    ];

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(files);

    // 开始批量分析
    await page.click('[data-testid="start-bulk-analysis"]');

    // 验证进度显示
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-text"]')).toContainText(
      '0%',
    );

    // 等待分析完成
    await page.waitForFunction(
      () => {
        const progressText = document.querySelector(
          '[data-testid="progress-text"]',
        )?.textContent;
        return progressText?.includes('100%');
      },
      { timeout: 120000 },
    );

    // 验证结果
    await expect(
      page.locator('[data-testid="analysis-results"]'),
    ).toBeVisible();
    const resultItems = await page
      .locator('[data-testid="analysis-result-item"]')
      .count();
    expect(resultItems).toBe(files.length);

    // 验证可以导出结果
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-results"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$|\.xlsx$/);
  });

  test('bulk operation with partial failures', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 模拟部分失败
    await page.route('**/api/jobs/bulk-delete', (route) => {
      route.fulfill({
        status: 207,
        body: JSON.stringify({
          success: true,
          results: [
            { id: 1, success: true },
            { id: 2, success: false, error: 'Permission denied' },
            { id: 3, success: true },
          ],
          summary: { total: 3, succeeded: 2, failed: 1 },
        }),
      });
    });

    // 执行批量删除
    await page.goto('/jobs');
    await page.check('[data-testid="select-all-checkbox"]');
    await page.click('[data-testid="bulk-delete-button"]');
    await page.fill('[data-testid="confirm-delete-input"]', 'DELETE');
    await page.click('[data-testid="confirm-delete"]');

    // 验证部分成功报告
    await expect(
      page.locator('[data-testid="partial-success-warning"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="success-count"]')).toContainText(
      '2',
    );
    await expect(page.locator('[data-testid="failed-count"]')).toContainText(
      '1',
    );

    // 验证失败详情可查看
    await page.click('[data-testid="view-failed-details"]');
    await expect(
      page.locator('[data-testid="failed-items-list"]'),
    ).toBeVisible();
    await expect(page.locator('text=Permission denied')).toBeVisible();

    // 验证重试功能
    await page.click('[data-testid="retry-failed"]');
    await expect(
      page.locator('[data-testid="retry-in-progress"]'),
    ).toBeVisible();
  });
});
