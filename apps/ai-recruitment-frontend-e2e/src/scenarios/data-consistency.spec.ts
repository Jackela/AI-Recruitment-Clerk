import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { JobsPage } from '../pages/JobsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USERS } from '../fixtures/test-data';

/**
 * 数据一致性场景测试 - Data Consistency
 *
 * 测试场景：
 * 1. 删除后计数更新
 * 2. 并发修改一致性
 * 3. 缓存与数据库一致性
 * 4. 跨页面数据同步
 */
test.describe('Data Consistency', () => {
  test('job count updates correctly after deletion', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const jobsPage = new JobsPage(page);
    const dashboardPage = new DashboardPage(page);

    // 登录
    await loginPage.navigateTo();
    await loginPage.login(TEST_USERS["hr"].email, TEST_USERS["hr"].password);
    await dashboardPage.waitForPageLoad();

    // 获取初始计数
    await jobsPage.navigateTo();
    await jobsPage.waitForPageLoad();
    const initialCount = await jobsPage.getJobCount();

    // 删除第一个职位
    await page.click(
      '[data-testid="job-card"]:first-child [data-testid="delete-button"]',
    );
    await page.click('[data-testid="confirm-delete"]');

    // 等待删除完成
    await page.waitForSelector('[data-testid="delete-success"]', {
      timeout: 10000,
    });

    // 验证计数减少
    const newCount = await jobsPage.getJobCount();
    expect(newCount).toBe(initialCount - 1);

    // 刷新页面验证计数持久
    await page.reload();
    await jobsPage.waitForPageLoad();
    const countAfterRefresh = await jobsPage.getJobCount();
    expect(countAfterRefresh).toBe(newCount);

    // 验证仪表板计数也更新
    await dashboardPage.navigateTo();
    const dashboardCount = await dashboardPage.getJobCount();
    expect(parseInt(dashboardCount, 10)).toBe(newCount);
  });

  test('resume analysis status remains consistent across pages', async ({
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

    // 上传简历
    await page.goto('/upload');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('src/test-data/resumes/简历.pdf');
    await page.click('[data-testid="upload-submit-button"]');
    await page.waitForSelector('[data-testid="upload-success"]', {
      timeout: 60000,
    });

    // 记录分析 ID
    const analysisId = await page
      .locator('[data-testid="analysis-id"]')
      .textContent();

    // 在多个页面验证状态一致性
    const pages = [
      '/dashboard',
      '/analysis',
      '/resumes',
      `/analysis/${analysisId}`,
    ];

    for (const url of pages) {
      await page.goto(url);

      // 如果页面显示分析状态，验证它是 "completed"
      const statusElement = page
        .locator('[data-testid="analysis-status"]')
        .first();
      const isVisible = await statusElement.isVisible().catch(() => false);

      if (isVisible) {
        const status = await statusElement.textContent();
        expect(status?.toLowerCase()).toBe('completed');
      }
    }
  });

  test('bulk operations maintain referential integrity', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 创建测试职位和关联的简历分析
    await page.goto('/jobs/create');
    await page.fill('[data-testid="job-title-input"]', 'Bulk Test Job');
    await page.fill('[data-testid="jd-textarea"]', 'Test description');
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/jobs/);

    // 获取职位 ID
    const jobCard = page.locator(
      '[data-testid="job-card"]:has-text("Bulk Test Job")',
    );
    await expect(jobCard).toBeVisible();

    // 执行批量删除
    await page.goto('/jobs');
    await page.check('[data-testid="select-all-checkbox"]');
    await page.click('[data-testid="bulk-delete-button"]');
    await page.click('[data-testid="confirm-bulk-delete"]');

    // 验证相关分析也被删除
    await page.goto('/analysis');
    await expect(page.locator('text=Bulk Test Job')).not.toBeVisible();

    // 验证数据库一致性
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/analysis?jobTitle=Bulk%20Test%20Job');
      const data = await res.json();
      return data.length;
    });

    expect(response).toBe(0);
  });

  test('search results reflect real-time data changes', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 搜索现有职位
    await page.goto('/jobs');
    await page.fill('[data-testid="search-input"]', 'Developer');
    await page.press('[data-testid="search-input"]', 'Enter');

    const initialResults = await page
      .locator('[data-testid="job-card"]')
      .count();

    // 在另一个标签页创建新职位
    const newPage = await page.context().newPage();
    await newPage.goto('/login');
    await newPage.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await newPage.fill(
      '[data-testid="password-input"]',
      TEST_USERS["hr"].password,
    );
    await newPage.click('[data-testid="submit-button"]');
    await newPage.waitForURL(/\/dashboard/);

    await newPage.goto('/jobs/create');
    await newPage.fill(
      '[data-testid="job-title-input"]',
      'New Developer Position',
    );
    await newPage.fill('[data-testid="jd-textarea"]', 'Test description');
    await newPage.click('[data-testid="submit-button"]');
    await newPage.waitForURL(/\/jobs/);

    // 回到原页面刷新搜索结果
    await page.click('[data-testid="search-button"]');

    // 验证新职位出现在搜索结果中
    await expect(page.locator('text=New Developer Position')).toBeVisible();

    const newResults = await page.locator('[data-testid="job-card"]').count();
    expect(newResults).toBe(initialResults + 1);

    await newPage.close();
  });

  test('pagination maintains consistency with data modifications', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    await page.goto('/jobs');

    // 记录第一页的项目
    const firstPageJobs = await page
      .locator('[data-testid="job-card"] h3')
      .allTextContents();

    // 转到第二页
    await page.click('[data-testid="next-page-button"]');
    await page.waitForLoadState('networkidle');

    const secondPageJobs = await page
      .locator('[data-testid="job-card"] h3')
      .allTextContents();

    // 验证两页数据不重复
    const overlap = firstPageJobs.filter((job) => secondPageJobs.includes(job));
    expect(overlap).toHaveLength(0);

    // 删除第一页的一个职位
    await page.click('[data-testid="prev-page-button"]');
    await page.click(
      '[data-testid="job-card"]:first-child [data-testid="delete-button"]',
    );
    await page.click('[data-testid="confirm-delete"]');

    // 验证分页正确调整
    await page.reload();
    const currentPageJobs = await page
      .locator('[data-testid="job-card"] h3')
      .allTextContents();
    expect(currentPageJobs).not.toContain(firstPageJobs[0]);
  });
});
