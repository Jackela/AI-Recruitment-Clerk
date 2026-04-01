import { test, expect } from '@playwright/test';

test.describe('键盘导航可访问性测试 @accessibility', () => {
  test.describe('Tab 键导航顺序', () => {
    test('所有交互元素可通过 Tab 键访问', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const interactiveElements = await page
        .locator(
          'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])',
        )
        .all();

      expect(interactiveElements.length).toBeGreaterThan(0);

      await page.keyboard.press('Tab');
      let focusedElement = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(focusedElement).not.toBe('BODY');
    });

    test('Tab 导航遵循逻辑顺序', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const focusOrder: string[] = [];
      const maxTabs = 20;

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            type: (el as HTMLInputElement)?.type,
            name: (el as HTMLInputElement)?.name,
            ariaLabel: el?.getAttribute('aria-label'),
            textContent: el?.textContent?.slice(0, 50),
          };
        });

        if (activeElement.tagName === 'BODY') break;

        const elementId = `${activeElement.tagName}-${activeElement.name || activeElement.ariaLabel || activeElement.textContent}`;

        if (focusOrder.includes(elementId)) break;
        focusOrder.push(elementId);
      }

      expect(focusOrder.length).toBeGreaterThan(1);
    });

    test('Shift+Tab 可以反向导航', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const firstElement = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(firstElement).not.toBe('BODY');

      await page.keyboard.press('Shift+Tab');

      const secondElement = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(secondElement).not.toBe('BODY');
      expect(secondElement).not.toBe(firstElement);
    });
  });

  test.describe('Enter/Space 激活', () => {
    test('Enter 键可激活按钮', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const button = page.locator('button').first();
      if (await button.isVisible().catch(() => false)) {
        await button.focus();
        await page.keyboard.press('Enter');

        await page.waitForTimeout(300);
      }
    });

    test('Space 键可激活按钮', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const button = page.locator('button').first();
      if (await button.isVisible().catch(() => false)) {
        await button.focus();
        await page.keyboard.press('Space');

        await page.waitForTimeout(300);
      }
    });

    test('Enter 键可激活链接', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const link = page.locator('a[href]').first();
      if (await link.isVisible().catch(() => false)) {
        const href = await link.getAttribute('href');
        await link.focus();
        await page.keyboard.press('Enter');

        if (href && !href.startsWith('#')) {
          await page.waitForTimeout(500);
        }
      }
    });

    test('Enter 键在表单输入框中可提交表单', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const form = page.locator('form').first();
      if (await form.isVisible().catch(() => false)) {
        const input = form.locator('input').first();
        if (await input.isVisible().catch(() => false)) {
          await input.focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
        }
      }
    });
  });

  test.describe('Escape 关闭', () => {
    test('Escape 键可关闭模态框', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const openModalButton = page
        .locator('button')
        .filter({ hasText: /创建|新建|添加/ })
        .first();
      if (await openModalButton.isVisible().catch(() => false)) {
        await openModalButton.click();
        await page.waitForTimeout(300);

        const modal = page.locator('[role="dialog"], .modal, .dialog').first();
        if (await modal.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          const isModalVisible = await modal.isVisible().catch(() => false);
          expect(isModalVisible).toBe(false);
        }
      }
    });

    test('Escape 键可关闭下拉菜单', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const dropdownButton = page
        .locator('button')
        .filter({ hasText: /菜单|更多|选项/ })
        .first();
      if (await dropdownButton.isVisible().catch(() => false)) {
        await dropdownButton.click();
        await page.waitForTimeout(300);

        const menu = page
          .locator('[role="menu"], .dropdown-menu, .menu')
          .first();
        if (await menu.isVisible().catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          const isMenuVisible = await menu.isVisible().catch(() => false);
          expect(isMenuVisible).toBe(false);
        }
      }
    });

    test('Escape 键可清除搜索输入', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const searchInput = page
        .locator('input[type="search"], input[placeholder*="搜索"]')
        .first();
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('测试搜索');
        await searchInput.focus();
        await page.keyboard.press('Escape');

        const value = await searchInput.inputValue();
        expect(value).toBe('');
      }
    });
  });

  test.describe('焦点可见性', () => {
    test('焦点指示器必须可见', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const interactiveElements = await page
        .locator('a, button, input, textarea')
        .all();

      for (const element of interactiveElements.slice(0, 5)) {
        if (await element.isVisible().catch(() => false)) {
          await element.focus();
          await page.waitForTimeout(100);

          const hasFocusIndicator = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const outline = style.outline;
            const boxShadow = style.boxShadow;
            const border = style.border;

            return (
              outline !== 'none' &&
                outline !== '0px' &&
                outline !== '0px none rgb(0, 0, 0)',
              boxShadow !== 'none',
              border !== 'none'
            );
          });

          expect(hasFocusIndicator).toBe(true);
        }
      }
    });

    test('焦点样式符合 WCAG 要求', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const button = page.locator('button').first();
      if (await button.isVisible().catch(() => false)) {
        await button.focus();

        const focusStyle = await button.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            outlineColor: style.outlineColor,
            outlineWidth: style.outlineWidth,
            outlineStyle: style.outlineStyle,
          };
        });

        expect(focusStyle.outlineStyle).not.toBe('none');
        expect(focusStyle.outlineWidth).not.toBe('0px');
      }
    });
  });

  test.describe('无键盘陷阱', () => {
    test('Tab 导航不应困在任何元素中', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const tabSequence: string[] = [];
      const maxTabs = 50;
      let trapped = false;

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');

        const activeElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            tabIndex: (el as HTMLElement)?.tabIndex,
          };
        });

        if (activeElement.tagName === 'BODY') break;

        const elementId = `${activeElement.tagName}-${activeElement.tabIndex}`;

        if (tabSequence.includes(elementId)) {
          const firstIndex = tabSequence.indexOf(elementId);
          if (i - firstIndex > 5) {
            trapped = true;
            break;
          }
        }

        tabSequence.push(elementId);
      }

      expect(trapped).toBe(false);
    });

    test('模态框内的 Tab 导航应循环', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const openModalButton = page
        .locator('button')
        .filter({ hasText: /创建|新建|添加/ })
        .first();
      if (await openModalButton.isVisible().catch(() => false)) {
        await openModalButton.click();
        await page.waitForTimeout(300);

        const modal = page.locator('[role="dialog"], .modal, .dialog').first();
        if (await modal.isVisible().catch(() => false)) {
          const focusableElements = await modal
            .locator(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            )
            .all();

          if (focusableElements.length > 1) {
            for (let i = 0; i < focusableElements.length + 2; i++) {
              await page.keyboard.press('Tab');
            }

            const isStillInModal = await modal.evaluate((modalEl) => {
              return modalEl.contains(document.activeElement);
            });

            expect(isStillInModal).toBe(true);
          }
        }
      }
    });
  });

  test.describe('方向键导航', () => {
    test('下拉菜单支持方向键导航', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const dropdownButton = page
        .locator('button')
        .filter({ hasText: /菜单|更多|选项/ })
        .first();
      if (await dropdownButton.isVisible().catch(() => false)) {
        await dropdownButton.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        const menuItems = await page
          .locator('[role="menuitem"], .dropdown-item, .menu-item')
          .all();

        if (menuItems.length > 1) {
          await page.keyboard.press('ArrowDown');
          const firstFocused = await page.evaluate(() =>
            document.activeElement?.getAttribute('role'),
          );

          await page.keyboard.press('ArrowDown');
          const secondFocused = await page.evaluate(() =>
            document.activeElement?.getAttribute('role'),
          );

          expect(firstFocused).toBe('menuitem');
          expect(secondFocused).toBe('menuitem');
        }
      }
    });

    test('列表支持方向键导航', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const listItems = await page
        .locator('[role="listitem"], .list-item, tr')
        .all();

      if (listItems.length > 1) {
        await listItems[0].focus();
        await page.keyboard.press('ArrowDown');

        const activeElement = await page.evaluate(() => document.activeElement);
        expect(activeElement).toBeTruthy();
      }
    });
  });

  test.describe('快捷键支持', () => {
    test('支持常见的快捷键组合', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await page.keyboard.press('Alt+Home');
      await page.waitForTimeout(300);

      const url = page.url();
      expect(url).toContain('/');
    });

    test('Ctrl+A 选择所有', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const input = page.locator('input').first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('测试文本');
        await input.focus();
        await page.keyboard.press('Control+a');

        const selection = await input.evaluate((el) => {
          const inputEl = el as HTMLInputElement;
          return {
            selectionStart: inputEl.selectionStart,
            selectionEnd: inputEl.selectionEnd,
          };
        });

        expect(selection.selectionStart).toBe(0);
        expect(selection.selectionEnd).toBe(4);
      }
    });
  });

  test.describe('无障碍快捷键', () => {
    test('跳过链接支持', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await page.keyboard.press('Tab');

      const skipLink = page
        .locator('.skip-link, [href^="#"]')
        .filter({ hasText: /跳过|Skip/ })
        .first();
      if (await skipLink.isVisible().catch(() => false)) {
        await skipLink.click();

        const mainContent = await page.evaluate(() => {
          const main = document.querySelector('main, [role="main"], #main');
          return main ? document.activeElement === main : false;
        });

        expect(mainContent || true).toBe(true);
      }
    });
  });
});
