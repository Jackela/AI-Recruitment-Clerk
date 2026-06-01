import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { JobsPage } from '../pages/JobsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TEST_USERS } from '../fixtures/test-data';

/**
 * 多用户并发场景测试 - Concurrent Users
 *
 * 测试场景：
 * 1. 多个 HR 同时操作
 * 2. 并发创建职位
 * 3. 并发上传简历
 * 4. 数据一致性验证
 */
test.describe('Concurrent Users', () => {
  test('multiple HRs can work simultaneously', async ({ browser }) => {
    // 创建两个独立的浏览器上下文
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const loginPage1 = new LoginPage(page1);
    const loginPage2 = new LoginPage(page2);
    const jobsPage1 = new JobsPage(page1);
    const jobsPage2 = new JobsPage(page2);

    try {
      // 用户 1 登录并创建职位
      await loginPage1.navigateTo();
      await loginPage1.login('hr1@company.com', 'password123');

      const dashboardPage1 = new DashboardPage(page1);
      await dashboardPage1.waitForPageLoad();

      // 用户 2 同时登录并创建职位
      await loginPage2.navigateTo();
      await loginPage2.login('hr2@company.com', 'password123');

      const dashboardPage2 = new DashboardPage(page2);
      await dashboardPage2.waitForPageLoad();

      // 同时创建职位
      await Promise.all([
        (async () => {
          await jobsPage1.navigateToCreateJob();
          await jobsPage1.fillJobForm({
            title: 'Job from HR 1',
            description: 'Description for job 1',
          });
          await jobsPage1.submitJobForm();
        })(),
        (async () => {
          await jobsPage2.navigateToCreateJob();
          await jobsPage2.fillJobForm({
            title: 'Job from HR 2',
            description: 'Description for job 2',
          });
          await jobsPage2.submitJobForm();
        })(),
      ]);

      // 验证两个职位都存在
      await page1.goto('/jobs');
      await expect(page1.locator('text=Job from HR 1')).toBeVisible();
      await expect(page1.locator('text=Job from HR 2')).toBeVisible();

      await page2.goto('/jobs');
      await expect(page2.locator('text=Job from HR 1')).toBeVisible();
      await expect(page2.locator('text=Job from HR 2')).toBeVisible();
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('concurrent resume uploads do not conflict', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // 三个候选人同时上传简历
      const uploadPromises = [
        (async () => {
          await page1.goto('/login');
          await page1.fill(
            '[data-testid="email-input"]',
            'candidate1@test.com',
          );
          await page1.fill('[data-testid="password-input"]', 'password123');
          await page1.click('[data-testid="submit-button"]');
          await page1.waitForURL(/\/dashboard/);

          await page1.goto('/upload');
          const fileInput = page1.locator('input[type="file"]');
          await fileInput.setInputFiles('src/test-data/resumes/简历.pdf');
          await page1.click('[data-testid="upload-submit-button"]');
          await page1
            .locator('[data-testid="upload-success"]')
            .waitFor({ timeout: 60000 });
          return 'candidate1';
        })(),
        (async () => {
          await page2.goto('/login');
          await page2.fill(
            '[data-testid="email-input"]',
            'candidate2@test.com',
          );
          await page2.fill('[data-testid="password-input"]', 'password123');
          await page2.click('[data-testid="submit-button"]');
          await page2.waitForURL(/\/dashboard/);

          await page2.goto('/upload');
          const fileInput = page2.locator('input[type="file"]');
          await fileInput.setInputFiles('src/test-data/resumes/简历2.pdf');
          await page2.click('[data-testid="upload-submit-button"]');
          await page2
            .locator('[data-testid="upload-success"]')
            .waitFor({ timeout: 60000 });
          return 'candidate2';
        })(),
        (async () => {
          await page3.goto('/login');
          await page3.fill(
            '[data-testid="email-input"]',
            'candidate3@test.com',
          );
          await page3.fill('[data-testid="password-input"]', 'password123');
          await page3.click('[data-testid="submit-button"]');
          await page3.waitForURL(/\/dashboard/);

          await page3.goto('/upload');
          const fileInput = page3.locator('input[type="file"]');
          await fileInput.setInputFiles('src/test-data/resumes/简历_PM.pdf');
          await page3.click('[data-testid="upload-submit-button"]');
          await page3
            .locator('[data-testid="upload-success"]')
            .waitFor({ timeout: 60000 });
          return 'candidate3';
        })(),
      ];

      const results = await Promise.all(uploadPromises);
      expect(results).toHaveLength(3);

      // 验证所有上传都成功
      for (const result of results) {
        expect(result).toMatch(/candidate\d/);
      }
    } finally {
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('concurrent job edits maintain data consistency', async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // 两个 HR 同时编辑同一个职位
      await page1.goto('/login');
      await page1.fill('[data-testid="email-input"]', TEST_USERS['hr'].email);
      await page1.fill(
        '[data-testid="password-input"]',
        TEST_USERS['hr'].password,
      );
      await page1.click('[data-testid="submit-button"]');
      await page1.waitForURL(/\/dashboard/);

      await page2.goto('/login');
      await page2.fill('[data-testid="email-input"]', 'hr2@company.com');
      await page2.fill('[data-testid="password-input"]', 'password123');
      await page2.click('[data-testid="submit-button"]');
      await page2.waitForURL(/\/dashboard/);

      // 先创建一个职位
      await page1.goto('/jobs/create');
      await page1.fill(
        '[data-testid="job-title-input"]',
        'Concurrent Edit Test Job',
      );
      await page1.fill('[data-testid="jd-textarea"]', 'Initial description');
      await page1.click('[data-testid="submit-button"]');
      await page1.waitForURL(/\/jobs/);

      // 两个用户同时打开编辑页面
      await page1.goto('/jobs/1/edit');
      await page2.goto('/jobs/1/edit');

      await page1.locator('[data-testid="edit-job-form"]').waitFor();
      await page2.locator('[data-testid="edit-job-form"]').waitFor();

      // 用户 1 修改标题
      await page1.fill('[data-testid="job-title-input"]', 'Updated by HR 1');

      // 用户 2 修改描述
      await page2.fill(
        '[data-testid="jd-textarea"]',
        'Updated description by HR 2',
      );

      // 用户 1 先提交
      await page1.click('[data-testid="submit-button"]');
      await page1.waitForURL(/\/jobs/);

      // 用户 2 提交（应该收到冲突警告或成功覆盖）
      await page2.click('[data-testid="submit-button"]');

      // 验证系统处理了并发编辑
      const hasConflictWarning = await page2
        .locator('[data-testid="conflict-warning"]')
        .isVisible()
        .catch(() => false);
      const hasSuccessMessage = await page2
        .locator('[data-testid="success-message"]')
        .isVisible()
        .catch(() => false);

      expect(hasConflictWarning || hasSuccessMessage).toBe(true);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
