import { test, expect } from '@playwright/test';
import {
  setupVisualTest,
  waitForPageStability,
  testElementStates,
  viewports,
  pages,
  takeScreenshot,
  takeElementScreenshot,
  delay,
} from './visual-helpers';

test.describe('组件视觉回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page, {
      hideCursor: true,
      disableAnimations: true,
      theme: 'light',
    });
    await page.setViewportSize(viewports.desktop);
  });

  // 按钮组件状态测试
  test.describe('按钮组件', () => {
    test('主要按钮状态', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const primaryButton = page
        .locator('button.btn-primary, .btn-primary, button[type="submit"]')
        .first();

      if (await primaryButton.isVisible().catch(() => false)) {
        await testElementStates(
          page,
          'button.btn-primary, .btn-primary, button[type="submit"]',
          ['default', 'hover', 'focus', 'active'],
          'button-primary',
        );
      }
    });

    test('次要按钮状态', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const secondaryButton = page
        .locator('button.btn-secondary, .btn-secondary')
        .first();

      if (await secondaryButton.isVisible().catch(() => false)) {
        await testElementStates(
          page,
          'button.btn-secondary, .btn-secondary',
          ['default', 'hover', 'focus'],
          'button-secondary',
        );
      }
    });

    test('禁用按钮状态', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const disabledButton = page
        .locator('button[disabled], .btn-disabled')
        .first();

      if (await disabledButton.isVisible().catch(() => false)) {
        await takeElementScreenshot(disabledButton, 'button-disabled.png');
      }
    });

    test('图标按钮', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const iconButtons = page.locator('button:has(.icon, svg, i), .btn-icon');
      const count = await iconButtons.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const button = iconButtons.nth(i);
        if (await button.isVisible().catch(() => false)) {
          await button.hover();
          await delay(100);
          await takeElementScreenshot(button, `button-icon-${i + 1}-hover.png`);
        }
      }
    });
  });

  // 输入框组件测试
  test.describe('输入框组件', () => {
    test('文本输入框状态', async ({ page }) => {
      await page.goto(pages.login.url);
      await waitForPageStability(page);

      const input = page
        .locator('input[type="text"], input[type="email"]')
        .first();

      if (await input.isVisible().catch(() => false)) {
        // 默认状态
        await takeElementScreenshot(input, 'input-text-default.png');

        // 聚焦状态
        await input.focus();
        await delay(100);
        await takeElementScreenshot(input, 'input-text-focus.png');

        // 输入内容后
        await input.fill('测试内容');
        await delay(100);
        await takeElementScreenshot(input, 'input-text-filled.png');

        // 错误状态（如果支持）
        const errorInput = page
          .locator('input.is-invalid, input.error, input[aria-invalid="true"]')
          .first();
        if (await errorInput.isVisible().catch(() => false)) {
          await takeElementScreenshot(errorInput, 'input-text-error.png');
        }
      }
    });

    test('密码输入框', async ({ page }) => {
      await page.goto(pages.login.url);
      await waitForPageStability(page);

      const passwordInput = page.locator('input[type="password"]').first();

      if (await passwordInput.isVisible().catch(() => false)) {
        await takeElementScreenshot(
          passwordInput,
          'input-password-default.png',
        );

        // 如果有显示/隐藏密码按钮
        const toggleButton = page
          .locator('button[aria-label*="password"], .password-toggle')
          .first();
        if (await toggleButton.isVisible().catch(() => false)) {
          await toggleButton.click();
          await delay(100);
          await takeElementScreenshot(
            passwordInput,
            'input-password-visible.png',
          );
        }
      }
    });

    test('搜索输入框', async ({ page }) => {
      await page.goto(pages.jobsList.url);
      await waitForPageStability(page);

      const searchInput = page
        .locator(
          'input[type="search"], .search-input input, input[placeholder*="搜索"]',
        )
        .first();

      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.focus();
        await searchInput.fill('测试搜索');
        await delay(100);
        await takeElementScreenshot(searchInput, 'input-search-active.png');
      }
    });
  });

  // 卡片组件测试
  test.describe('卡片组件', () => {
    test('基础卡片', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const cards = page.locator('.card, [class*="card"]').slice(0, 3);

      for (let i = 0; i < (await cards.count()); i++) {
        const card = cards.nth(i);
        if (await card.isVisible().catch(() => false)) {
          await card.hover();
          await delay(100);
          await takeElementScreenshot(card, `card-${i + 1}-hover.png`);
        }
      }
    });

    test('统计卡片', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const statCards = page
        .locator('.stat-card, [class*="stat"], .metric-card')
        .slice(0, 4);

      for (let i = 0; i < (await statCards.count()); i++) {
        const card = statCards.nth(i);
        if (await card.isVisible().catch(() => false)) {
          await takeElementScreenshot(card, `stat-card-${i + 1}.png`);
        }
      }
    });
  });

  // 导航组件测试
  test.describe('导航组件', () => {
    test('顶部导航栏', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const header = page.locator('header, .navbar, .app-header').first();

      if (await header.isVisible().catch(() => false)) {
        await takeElementScreenshot(header, 'navbar-default.png');
      }
    });

    test('侧边栏导航', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const sidebar = page.locator('aside, .sidebar, nav.sidebar').first();

      if (await sidebar.isVisible().catch(() => false)) {
        // 默认状态
        await takeElementScreenshot(sidebar, 'sidebar-default.png');

        // 悬停导航项
        const navItems = sidebar.locator('a, .nav-item, li');
        const firstItem = navItems.first();

        if (await firstItem.isVisible().catch(() => false)) {
          await firstItem.hover();
          await delay(100);
          await takeElementScreenshot(sidebar, 'sidebar-item-hover.png');
        }
      }
    });

    test('面包屑导航', async ({ page }) => {
      await page.goto(pages.jobsDetail.url);
      await waitForPageStability(page);

      const breadcrumb = page
        .locator('.breadcrumb, [aria-label="breadcrumb"], nav.breadcrumb')
        .first();

      if (await breadcrumb.isVisible().catch(() => false)) {
        await takeElementScreenshot(breadcrumb, 'breadcrumb-default.png');
      }
    });
  });

  // 表格组件测试
  test.describe('表格组件', () => {
    test('数据表格', async ({ page }) => {
      await page.goto(pages.jobsList.url);
      await waitForPageStability(page);

      const table = page
        .locator('table.data-table, .table, table[class*="table"]')
        .first();

      if (await table.isVisible().catch(() => false)) {
        await takeElementScreenshot(table, 'table-default.png');

        // 表头悬停
        const headerCell = table.locator('th').first();
        if (await headerCell.isVisible().catch(() => false)) {
          await headerCell.hover();
          await delay(100);
          await takeElementScreenshot(table, 'table-header-hover.png');
        }

        // 行悬停
        const row = table.locator('tbody tr').first();
        if (await row.isVisible().catch(() => false)) {
          await row.hover();
          await delay(100);
          await takeElementScreenshot(table, 'table-row-hover.png');
        }
      }
    });
  });

  // 表单组件测试
  test.describe('表单组件', () => {
    test('复选框和单选按钮', async ({ page }) => {
      await page.goto(pages.settings.url);
      await waitForPageStability(page);

      // 复选框
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible().catch(() => false)) {
        await takeElementScreenshot(checkbox, 'checkbox-unchecked.png');
        await checkbox.check();
        await delay(100);
        await takeElementScreenshot(checkbox, 'checkbox-checked.png');
      }

      // 单选按钮
      const radio = page.locator('input[type="radio"]').first();
      if (await radio.isVisible().catch(() => false)) {
        await takeElementScreenshot(radio, 'radio-default.png');
      }
    });

    test('下拉选择框', async ({ page }) => {
      await page.goto(pages.jobsCreate.url);
      await waitForPageStability(page);

      const select = page
        .locator('select, .select-trigger, [role="combobox"]')
        .first();

      if (await select.isVisible().catch(() => false)) {
        await takeElementScreenshot(select, 'select-default.png');

        // 打开下拉菜单
        await select.click();
        await delay(200);

        const dropdown = page
          .locator('.select-dropdown, [role="listbox"], .dropdown-menu')
          .first();
        if (await dropdown.isVisible().catch(() => false)) {
          await takeElementScreenshot(dropdown, 'select-dropdown-open.png');
        }
      }
    });

    test('开关切换', async ({ page }) => {
      await page.goto(pages.settings.url);
      await waitForPageStability(page);

      const toggle = page
        .locator('input[type="checkbox"].toggle, .switch, [role="switch"]')
        .first();

      if (await toggle.isVisible().catch(() => false)) {
        await takeElementScreenshot(toggle, 'toggle-off.png');
        await toggle.click();
        await delay(100);
        await takeElementScreenshot(toggle, 'toggle-on.png');
      }
    });
  });

  // 标签和徽章测试
  test.describe('标签和徽章', () => {
    test('状态标签', async ({ page }) => {
      await page.goto(pages.jobsList.url);
      await waitForPageStability(page);

      const tags = page
        .locator('.tag, .badge, .label, [class*="tag"]')
        .slice(0, 5);

      for (let i = 0; i < (await tags.count()); i++) {
        const tag = tags.nth(i);
        if (await tag.isVisible().catch(() => false)) {
          await takeElementScreenshot(tag, `tag-${i + 1}.png`);
        }
      }
    });
  });

  // 分页组件测试
  test.describe('分页组件', () => {
    test('分页器', async ({ page }) => {
      await page.goto(pages.jobsList.url);
      await waitForPageStability(page);

      const pagination = page
        .locator('.pagination, .pager, nav[aria-label*="page"]')
        .first();

      if (await pagination.isVisible().catch(() => false)) {
        await takeElementScreenshot(pagination, 'pagination-default.png');

        // 悬停页码
        const pageNumber = pagination.locator('a, button').nth(2);
        if (await pageNumber.isVisible().catch(() => false)) {
          await pageNumber.hover();
          await delay(100);
          await takeElementScreenshot(pagination, 'pagination-hover.png');
        }
      }
    });
  });
});
