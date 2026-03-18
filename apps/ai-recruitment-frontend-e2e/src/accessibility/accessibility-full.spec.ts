import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('完整可访问性测试', () => {
  const pages = [
    { url: '/', name: '首页' },
    { url: '/login', name: '登录页' },
    { url: '/dashboard', name: '仪表板' },
    { url: '/jobs', name: '职位列表' },
    { url: '/jobs/create', name: '创建职位' },
    { url: '/analysis', name: '分析页' },
    { url: '/settings', name: '设置页' },
  ];

  for (const { url, name } of pages) {
    test(`可访问性检查 - ${name} (${url})`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log(
          `可访问性问题在 ${url}:`,
          accessibilityScanResults.violations.map((v) => ({
            rule: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          })),
        );
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test(`可访问性检查(移动端) - ${name} (${url})`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test.describe('关键用户流程可访问性', () => {
    test('登录流程可访问性', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .include('form')
        .include('input')
        .include('button')
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('表单可访问性 - 创建职位', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .include('form')
        .include('input')
        .include('textarea')
        .include('select')
        .include('button')
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('模态框可访问性', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const openModalButton = page
        .locator('button')
        .filter({ hasText: /创建|新建|添加/ })
        .first();
      if (await openModalButton.isVisible().catch(() => false)) {
        await openModalButton.click();
        await page.waitForTimeout(300);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
          .include('[role="dialog"]')
          .include('[role="modal"]')
          .include('.modal')
          .include('.dialog')
          .analyze();

        expect(results.violations).toEqual([]);
      }
    });

    test('导航可访问性', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .include('nav')
        .include('[role="navigation"]')
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });

  test.describe('特定 WCAG 规则检查', () => {
    test('图片必须有替代文本', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['image-alt', 'aria-required-attr'])
        .analyze();

      const imageViolations = results.violations.filter(
        (v) => v.id === 'image-alt' || v.id === 'aria-required-attr',
      );

      expect(imageViolations).toEqual([]);
    });

    test('表单元素必须有标签', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['label', 'aria-required-attr'])
        .analyze();

      const labelViolations = results.violations.filter(
        (v) => v.id === 'label' || v.id === 'aria-required-attr',
      );

      expect(labelViolations).toEqual([]);
    });

    test('链接必须有可识别的文本', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['link-name', 'aria-required-attr'])
        .analyze();

      const linkViolations = results.violations.filter(
        (v) => v.id === 'link-name' || v.id === 'aria-required-attr',
      );

      expect(linkViolations).toEqual([]);
    });

    test('按钮必须有可访问的名称', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['button-name', 'aria-required-attr'])
        .analyze();

      const buttonViolations = results.violations.filter(
        (v) => v.id === 'button-name' || v.id === 'aria-required-attr',
      );

      expect(buttonViolations).toEqual([]);
    });

    test('语言属性必须正确设置', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const html = page.locator('html');
      const lang = await html.getAttribute('lang');
      expect(lang).toBeTruthy();
      expect(['zh', 'zh-CN', 'en', 'en-US']).toContain(lang);
    });

    test('页面标题必须存在且有意义', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      expect(title.toLowerCase()).not.toBe('untitled');
    });
  });

  test.describe('ARIA 使用检查', () => {
    test('ARIA 属性必须有效', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules([
          'aria-allowed-attr',
          'aria-conditional-attr',
          'aria-deprecated-role',
          'aria-prohibited-attr',
          'aria-required-attr',
          'aria-required-children',
          'aria-required-parent',
          'aria-roles',
          'aria-valid-attr-value',
          'aria-valid-attr',
        ])
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('ARIA 角色必须有效', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['aria-roles', 'aria-deprecated-role'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  });
});
