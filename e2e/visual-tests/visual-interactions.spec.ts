import { test, expect } from '@playwright/test';
import {
  setupVisualTest,
  waitForPageStability,
  waitForAnimation,
  viewports,
  pages,
  takeScreenshot,
  takeElementScreenshot,
  delay,
} from './visual-helpers';

test.describe('交互视觉回归测试', () => {
  test.beforeEach(async ({ page }) => {
    await setupVisualTest(page, {
      hideCursor: true,
      disableAnimations: false, // 启用动画以测试交互效果
      theme: 'light',
    });
    await page.setViewportSize(viewports.desktop);
  });

  // 模态框交互测试
  test.describe('模态框交互', () => {
    test('模态框打开动画', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找并点击打开模态框的按钮
      const openModalBtn = page
        .locator(
          'button:has-text("新建"), button:has-text("创建"), button:has-text("添加"), [data-testid="open-modal"]',
        )
        .first();

      if (await openModalBtn.isVisible().catch(() => false)) {
        // 截图 - 打开前
        await takeScreenshot(page, 'modal-before-open.png', {
          fullPage: false,
        });

        // 点击打开
        await openModalBtn.click();
        await delay(200);

        // 截图 - 动画中间
        await takeScreenshot(page, 'modal-opening-midway.png', {
          fullPage: false,
        });

        // 等待动画完成
        const modal = page.locator('.modal, [role="dialog"], .dialog').first();
        await waitForAnimation(page, '.modal, [role="dialog"], .dialog');

        await takeScreenshot(page, 'modal-fully-opened.png', {
          fullPage: false,
        });

        // 关闭模态框
        const closeBtn = modal
          .locator(
            'button:has-text("关闭"), button:has-text("Cancel"), .modal-close, [aria-label="Close"]',
          )
          .first();
        if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click();
          await delay(300);
          await takeScreenshot(page, 'modal-after-close.png', {
            fullPage: false,
          });
        }
      }
    });

    test('确认对话框', async ({ page }) => {
      await page.goto(pages.jobsList.url);
      await waitForPageStability(page);

      // 查找删除按钮
      const deleteBtn = page
        .locator('button:has-text("删除"), button[title="删除"], .btn-delete')
        .first();

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await delay(300);

        const confirmDialog = page
          .locator('.confirm-dialog, [role="alertdialog"], .dialog-confirm')
          .first();

        if (await confirmDialog.isVisible().catch(() => false)) {
          await takeElementScreenshot(
            confirmDialog,
            'confirm-dialog-default.png',
          );

          // 悬停确认按钮
          const confirmBtn = confirmDialog
            .locator(
              'button:has-text("确认"), button:has-text("确定"), button.btn-danger',
            )
            .first();
          if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.hover();
            await delay(100);
            await takeElementScreenshot(
              confirmDialog,
              'confirm-dialog-hover.png',
            );
          }
        }
      }
    });

    test('侧边抽屉面板', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找打开抽屉的按钮
      const openDrawerBtn = page
        .locator(
          'button:has-text("详情"), button:has-text("查看"), [data-testid="open-drawer"]',
        )
        .first();

      if (await openDrawerBtn.isVisible().catch(() => false)) {
        await openDrawerBtn.click();
        await delay(400);

        const drawer = page
          .locator('.drawer, .side-panel, [role="dialog"][aria-modal="true"]')
          .first();

        if (await drawer.isVisible().catch(() => false)) {
          await takeElementScreenshot(drawer, 'drawer-opened.png');
        }
      }
    });
  });

  // 下拉菜单交互测试
  test.describe('下拉菜单交互', () => {
    test('导航下拉菜单', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找带有下拉菜单的导航项
      const dropdownTrigger = page
        .locator('.dropdown, [class*="dropdown"]')
        .first();

      if (await dropdownTrigger.isVisible().catch(() => false)) {
        // 悬停触发
        await dropdownTrigger.hover();
        await delay(300);

        const dropdownMenu = dropdownTrigger
          .locator('.dropdown-menu, [role="menu"]')
          .first();

        if (await dropdownMenu.isVisible().catch(() => false)) {
          await takeElementScreenshot(dropdownMenu, 'dropdown-menu-hover.png');
        }

        // 点击触发
        await dropdownTrigger.click();
        await delay(200);

        if (await dropdownMenu.isVisible().catch(() => false)) {
          // 悬停菜单项
          const menuItem = dropdownMenu
            .locator('[role="menuitem"], a, li')
            .first();
          if (await menuItem.isVisible().catch(() => false)) {
            await menuItem.hover();
            await delay(100);
            await takeElementScreenshot(
              dropdownMenu,
              'dropdown-menu-item-hover.png',
            );
          }
        }
      }
    });

    test('用户菜单下拉', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      const userMenu = page
        .locator('.user-menu, .avatar-dropdown, [data-testid="user-menu"]')
        .first();

      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await delay(200);

        const menu = page
          .locator('.dropdown-menu, .user-dropdown-menu')
          .first();

        if (await menu.isVisible().catch(() => false)) {
          await takeElementScreenshot(menu, 'user-menu-dropdown.png');
        }
      }
    });
  });

  // 加载状态测试
  test.describe('加载状态', () => {
    test('页面加载骨架屏', async ({ page }) => {
      // 启用动画以测试骨架屏效果
      await setupVisualTest(page, { disableAnimations: false });

      await page.goto(pages.dashboard.url);

      // 在页面加载初期截图骨架屏
      await delay(100);

      const skeleton = page
        .locator('.skeleton, [class*="skeleton"], .loading-placeholder')
        .first();

      if (await skeleton.isVisible().catch(() => false)) {
        await takeElementScreenshot(skeleton, 'skeleton-loading.png');
      }

      // 等待加载完成
      await waitForPageStability(page);
      await takeScreenshot(page, 'page-after-loading.png', { fullPage: true });
    });

    test('按钮加载状态', async ({ page }) => {
      await page.goto(pages.login.url);
      await waitForPageStability(page);

      const submitBtn = page
        .locator('button[type="submit"], .btn-submit')
        .first();

      if (await submitBtn.isVisible().catch(() => false)) {
        // 填写表单
        const usernameInput = page
          .locator(
            'input[type="text"], input[type="email"], input[name="username"]',
          )
          .first();
        const passwordInput = page.locator('input[type="password"]').first();

        if (await usernameInput.isVisible().catch(() => false)) {
          await usernameInput.fill('test@example.com');
        }
        if (await passwordInput.isVisible().catch(() => false)) {
          await passwordInput.fill('password123');
        }

        // 点击提交并立即截图
        await submitBtn.click();
        await delay(100);

        // 检查是否有加载状态
        const loadingBtn = page
          .locator(
            'button:has(.spinner, .loading, [class*="loading"]), button[disabled]',
          )
          .first();

        if (await loadingBtn.isVisible().catch(() => false)) {
          await takeElementScreenshot(loadingBtn, 'button-loading-state.png');
        }
      }
    });

    test('表格加载状态', async ({ page }) => {
      await page.goto(pages.jobsList.url);

      // 截图加载状态
      await delay(200);

      const tableLoading = page
        .locator('.table-loading, .skeleton-table, [class*="table-skeleton"]')
        .first();

      if (await tableLoading.isVisible().catch(() => false)) {
        await takeElementScreenshot(tableLoading, 'table-loading-state.png');
      }

      await waitForPageStability(page);
    });
  });

  // 工具提示测试
  test.describe('工具提示', () => {
    test('按钮工具提示', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找带有工具提示的元素
      const elementsWithTooltip = page
        .locator('[title], [data-tooltip], [aria-label]')
        .slice(0, 5);

      for (let i = 0; i < (await elementsWithTooltip.count()); i++) {
        const element = elementsWithTooltip.nth(i);

        if (await element.isVisible().catch(() => false)) {
          await element.hover();
          await delay(500);

          const tooltip = page
            .locator('.tooltip, [role="tooltip"], [class*="tooltip"]')
            .first();

          if (await tooltip.isVisible().catch(() => false)) {
            await takeElementScreenshot(tooltip, `tooltip-${i + 1}.png`);
          }
        }
      }
    });
  });

  // 折叠面板测试
  test.describe('折叠面板', () => {
    test('展开/收起动画', async ({ page }) => {
      await page.goto(pages.analysis.url);
      await waitForPageStability(page);

      // 查找折叠面板
      const accordion = page
        .locator('.accordion, [class*="accordion"], .collapse')
        .first();

      if (await accordion.isVisible().catch(() => false)) {
        const header = accordion
          .locator('.accordion-header, .collapse-header, [role="button"]')
          .first();

        if (await header.isVisible().catch(() => false)) {
          // 默认状态
          await takeElementScreenshot(accordion, 'accordion-default.png');

          // 点击展开
          await header.click();
          await delay(400);
          await takeElementScreenshot(accordion, 'accordion-expanded.png');

          // 点击收起
          await header.click();
          await delay(400);
          await takeElementScreenshot(accordion, 'accordion-collapsed.png');
        }
      }
    });
  });

  // Toast 通知测试
  test.describe('Toast 通知', () => {
    test('Toast 消息显示', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 触发一个操作来显示 toast（如果有的话）
      const actionBtn = page
        .locator(
          'button:has-text("保存"), button:has-text("提交"), [data-testid="show-toast"]',
        )
        .first();

      if (await actionBtn.isVisible().catch(() => false)) {
        await actionBtn.click();
        await delay(500);

        const toast = page
          .locator('.toast, .notification, [role="alert"], [class*="toast"]')
          .first();

        if (await toast.isVisible().catch(() => false)) {
          await takeElementScreenshot(toast, 'toast-notification.png');
        }
      }
    });

    test('不同级别的 Toast', async ({ page }) => {
      await page.goto(pages.settings.url);
      await waitForPageStability(page);

      const toastTypes = ['success', 'error', 'warning', 'info'];

      for (const type of toastTypes) {
        // 尝试查找或触发不同类型的 toast
        const toastTrigger = page
          .locator(`[data-testid="toast-${type}"], button:has-text("${type}")`)
          .first();

        if (await toastTrigger.isVisible().catch(() => false)) {
          await toastTrigger.click();
          await delay(500);

          const toast = page
            .locator(
              `.toast-${type}, [data-type="${type}"], .notification-${type}`,
            )
            .first();

          if (await toast.isVisible().catch(() => false)) {
            await takeElementScreenshot(toast, `toast-${type}.png`);
          }
        }
      }
    });
  });

  // 拖拽交互测试
  test.describe('拖拽交互', () => {
    test('可拖拽列表', async ({ page }) => {
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找可拖拽元素
      const draggableItems = page.locator(
        '[draggable="true"], .draggable, .sortable-item',
      );

      if ((await draggableItems.count()) > 1) {
        const firstItem = draggableItems.first();
        const secondItem = draggableItems.nth(1);

        if (await firstItem.isVisible().catch(() => false)) {
          // 开始拖拽
          await firstItem.hover();
          await delay(100);

          await page.mouse.down();
          await delay(100);

          // 移动到第二个元素位置
          const box = await secondItem.boundingBox();
          if (box) {
            await page.mouse.move(
              box.x + box.width / 2,
              box.y + box.height / 2,
            );
            await delay(200);

            await takeScreenshot(page, 'drag-in-progress.png', {
              fullPage: false,
            });
          }

          await page.mouse.up();
          await delay(300);

          await takeScreenshot(page, 'drag-completed.png', { fullPage: false });
        }
      }
    });
  });

  // 响应式交互测试
  test.describe('响应式菜单交互', () => {
    test('移动端汉堡菜单', async ({ page }) => {
      // 设置为移动端视口
      await page.setViewportSize(viewports.mobile);
      await page.goto(pages.dashboard.url);
      await waitForPageStability(page);

      // 查找汉堡菜单按钮
      const hamburgerBtn = page
        .locator(
          'button[aria-label*="menu"], .hamburger, .menu-toggle, button:has(.hamburger-icon)',
        )
        .first();

      if (await hamburgerBtn.isVisible().catch(() => false)) {
        // 默认状态
        await takeScreenshot(page, 'mobile-menu-closed.png', {
          fullPage: false,
        });

        // 点击打开菜单
        await hamburgerBtn.click();
        await delay(300);

        await takeScreenshot(page, 'mobile-menu-opened.png', {
          fullPage: false,
        });

        // 点击遮罩关闭
        const overlay = page
          .locator('.menu-overlay, .overlay, [class*="overlay"]')
          .first();
        if (await overlay.isVisible().catch(() => false)) {
          await overlay.click();
          await delay(300);
          await takeScreenshot(page, 'mobile-menu-closed-again.png', {
            fullPage: false,
          });
        }
      }
    });
  });
});
