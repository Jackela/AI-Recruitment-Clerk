import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { TEST_USERS } from '../../fixtures/test-data';

/**
 * 权限升级防护测试 - Permission Escalation Prevention
 *
 * 测试场景：
 * 1. 候选人无法访问管理员功能
 * 2. 未授权 API 访问
 * 3. URL 直接访问防护
 * 4. 角色权限边界测试
 */
test.describe('Permission Escalation Prevention', () => {
  test('candidate cannot access admin features', async ({ page }) => {
    const loginPage = new LoginPage(page);

    // 以候选人身份登录
    await loginPage.navigateTo();
    await loginPage.login(
      TEST_USERS["candidate"].email,
      TEST_USERS["candidate"].password,
    );

    await page.waitForURL(/\/dashboard/);

    // 尝试直接访问管理员页面
    await page.goto('/admin/users');

    // 验证重定向到未授权页面
    await expect(page).toHaveURL(/\/unauthorized|\/forbidden|\/access-denied/);
    await expect(
      page.locator('[data-testid="unauthorized-message"]'),
    ).toBeVisible();

    // 尝试访问其他管理功能
    const adminUrls = [
      '/admin/settings',
      '/admin/roles',
      '/admin/permissions',
      '/admin/audit-logs',
    ];

    for (const url of adminUrls) {
      await page.goto(url);
      await expect(page).not.toHaveURL(new RegExp(url.replace(/\//g, '\\/')));
    }
  });

  test('candidate cannot modify job postings', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["candidate"].email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS["candidate"].password,
    );
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 尝试访问职位创建页面
    await page.goto('/jobs/create');
    await expect(page).not.toHaveURL(/\/jobs\/create/);

    // 尝试直接调用 API 创建职位
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthorized Job',
          description: 'This should not be created',
        }),
      });
      return { status: res.status, ok: res.ok };
    });

    expect(response.status).toBe(403);
    expect(response.ok).toBe(false);
  });

  test('HR cannot access super admin features', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["hr"].email);
    await page.fill('[data-testid="password-input"]', TEST_USERS["hr"].password);
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 尝试访问系统管理功能
    const superAdminUrls = [
      '/admin/database',
      '/admin/server-config',
      '/admin/security-settings',
      '/api/admin/delete-all-data',
    ];

    for (const url of superAdminUrls) {
      await page.goto(url);

      // 验证被阻止
      const currentUrl = page.url();
      expect(currentUrl).not.toMatch(
        new RegExp(url.replace(/\//g, '\\/').replace(/\?/g, '\\?')),
      );

      // 验证显示未授权消息或重定向
      const hasUnauthorizedMessage = await page
        .locator('[data-testid="unauthorized-message"]')
        .isVisible()
        .catch(() => false);
      const isRedirected = await page
        .locator('[data-testid="dashboard-container"]')
        .isVisible()
        .catch(() => false);

      expect(hasUnauthorizedMessage || isRedirected).toBe(true);
    }
  });

  test('prevents IDOR attacks on resume access', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', TEST_USERS["candidate"].email);
    await page.fill(
      '[data-testid="password-input"]',
      TEST_USERS["candidate"].password,
    );
    await page.click('[data-testid="submit-button"]');
    await page.waitForURL(/\/dashboard/);

    // 尝试访问其他候选人的简历
    const otherUserResumeIds = [999, 1000, 1001];

    for (const resumeId of otherUserResumeIds) {
      await page.goto(`/resumes/${resumeId}`);

      // 验证被阻止
      const currentUrl = page.url();
      expect(currentUrl).not.toBe(`http://localhost:4200/resumes/${resumeId}`);

      // 尝试通过 API 访问
      const response = await page.evaluate(async (id) => {
        const res = await fetch(`/api/resumes/${id}`, { method: 'GET' });
        return { status: res.status };
      }, resumeId);

      expect(response.status).toBe(403);
    }
  });

  test('prevents privilege escalation via role manipulation', async ({
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

    // 尝试修改自己的角色
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'admin',
          permissions: ['all'],
        }),
      });
      return { status: res.status, ok: res.ok };
    });

    expect(response.status).toBe(403);
    expect(response.ok).toBe(false);

    // 验证角色未更改
    await page.goto('/dashboard');
    const userRole = await page
      .locator('[data-testid="user-role"]')
      .textContent();
    expect(userRole?.toLowerCase()).not.toContain('admin');
  });

  test('API endpoints validate JWT scope claims', async ({ page }) => {
    // 使用无效 token 访问 API
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid_token_without_proper_scope');
    });

    const endpoints = [
      { url: '/api/admin/users', method: 'GET' },
      { url: '/api/jobs', method: 'DELETE' },
      { url: '/api/analysis/all', method: 'DELETE' },
    ];

    for (const endpoint of endpoints) {
      const response = await page.evaluate(async (ep) => {
        const res = await fetch(ep.url, { method: ep.method });
        return { status: res.status };
      }, endpoint);

      expect(response.status).toBe(401);
    }
  });
});
