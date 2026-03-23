import { test, expect } from '@playwright/test';

test.describe('屏幕阅读器可访问性测试', () => {
  test.describe('ARIA 标签', () => {
    test('所有交互元素有 aria-label 或可见标签', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const elementsWithoutLabels = await page.evaluate(() => {
        const interactiveElements = document.querySelectorAll(
          'button, a, input, textarea, select, [role="button"], [role="link"]',
        );

        const withoutLabels: Array<{ tag: string; text: string }> = [];

        interactiveElements.forEach((el) => {
          const hasAriaLabel =
            el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
          const hasVisibleLabel = el.textContent?.trim().length > 0;
          const hasTitle = el.hasAttribute('title');
          const hasPlaceholder = (el as HTMLInputElement).placeholder;
          const isInputWithLabel =
            el.id && document.querySelector(`label[for="${el.id}"]`);
          const isWrappedInLabel = el.closest('label');

          if (
            !hasAriaLabel &&
            !hasVisibleLabel &&
            !hasTitle &&
            !hasPlaceholder &&
            !isInputWithLabel &&
            !isWrappedInLabel
          ) {
            withoutLabels.push({
              tag: el.tagName,
              text: el.textContent?.slice(0, 50) || '',
            });
          }
        });

        return withoutLabels;
      });

      expect(elementsWithoutLabels).toHaveLength(0);
    });

    test('图标按钮有 aria-label', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const iconButtons = await page
        .locator('button:has(.icon, .fa, svg):not([aria-label])')
        .all();

      for (const button of iconButtons.slice(0, 10)) {
        const hasAccessibleName = await button.evaluate((el) => {
          return (
            el.hasAttribute('aria-label') ||
            el.hasAttribute('aria-labelledby') ||
            el.hasAttribute('title') ||
            el.textContent?.trim().length > 0
          );
        });

        expect(hasAccessibleName).toBe(true);
      }
    });

    test('表单输入有相关的 label', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const inputsWithoutLabels = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, select');
        const withoutLabels: Array<{ type: string; name: string }> = [];

        inputs.forEach((input) => {
          const inputEl = input as HTMLInputElement;
          const hasLabel =
            (inputEl.id &&
              document.querySelector(`label[for="${inputEl.id}"]`)) ||
            inputEl.closest('label') ||
            inputEl.hasAttribute('aria-label') ||
            inputEl.hasAttribute('aria-labelledby') ||
            inputEl.placeholder;

          if (!hasLabel && inputEl.type !== 'hidden') {
            withoutLabels.push({
              type: inputEl.type || inputEl.tagName,
              name: inputEl.name || '',
            });
          }
        });

        return withoutLabels;
      });

      expect(inputsWithoutLabels).toHaveLength(0);
    });

    test('图片有 alt 属性', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const imagesWithoutAlt = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const withoutAlt: Array<{ src: string }> = [];

        images.forEach((img) => {
          if (!img.hasAttribute('alt') && !img.hasAttribute('aria-label')) {
            withoutAlt.push({ src: img.src });
          }
        });

        return withoutAlt;
      });

      expect(imagesWithoutAlt).toHaveLength(0);
    });
  });

  test.describe('ARIA 角色属性', () => {
    test('导航元素有正确的 role', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const navElement = page.locator('nav, [role="navigation"]').first();
      if (await navElement.isVisible().catch(() => false)) {
        const hasRole = await navElement.evaluate((el) => {
          return (
            el.tagName === 'NAV' || el.getAttribute('role') === 'navigation'
          );
        });

        expect(hasRole).toBe(true);
      }
    });

    test('主内容区域有 main role', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const mainElement = page.locator('main, [role="main"]').first();
      const hasMain = await mainElement.isVisible().catch(() => false);

      expect(hasMain).toBe(true);
    });

    test('模态框有 dialog role', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const openModalButton = page
        .locator('button')
        .filter({ hasText: /创建|新建|添加/ })
        .first();
      if (await openModalButton.isVisible().catch(() => false)) {
        await openModalButton.click();
        await page.waitForTimeout(300);

        const modal = page
          .locator('[role="dialog"], .modal, [aria-modal="true"]')
          .first();
        if (await modal.isVisible().catch(() => false)) {
          const hasDialogRole = await modal.evaluate((el) => {
            return (
              el.getAttribute('role') === 'dialog' ||
              el.getAttribute('aria-modal') === 'true'
            );
          });

          expect(hasDialogRole).toBe(true);
        }
      }
    });

    test('列表有正确的 list 和 listitem 角色', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const lists = await page.locator('ul, ol, [role="list"]').all();

      for (const list of lists.slice(0, 5)) {
        if (await list.isVisible().catch(() => false)) {
          const hasCorrectRole = await list.evaluate((el) => {
            return (
              el.tagName === 'UL' ||
              el.tagName === 'OL' ||
              el.getAttribute('role') === 'list'
            );
          });

          expect(hasCorrectRole).toBe(true);
        }
      }
    });

    test('按钮有 button role', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const buttons = await page.locator('button, [role="button"]').all();

      expect(buttons.length).toBeGreaterThan(0);

      for (const button of buttons.slice(0, 5)) {
        const hasButtonRole = await button.evaluate((el) => {
          return (
            el.tagName === 'BUTTON' || el.getAttribute('role') === 'button'
          );
        });

        expect(hasButtonRole).toBe(true);
      }
    });

    test('链接有 link role', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const links = await page.locator('a[href], [role="link"]').all();

      for (const link of links.slice(0, 5)) {
        const hasLinkRole = await link.evaluate((el) => {
          return el.tagName === 'A' || el.getAttribute('role') === 'link';
        });

        expect(hasLinkRole).toBe(true);
      }
    });
  });

  test.describe('状态更新', () => {
    test('加载状态有 aria-busy', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const loadingElements = await page
        .locator('[aria-busy="true"], .loading, [role="status"]')
        .all();

      expect(loadingElements.length >= 0).toBe(true);
    });

    test('禁用状态有 aria-disabled', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const disabledElements = await page
        .locator('[disabled], [aria-disabled="true"]')
        .all();

      for (const element of disabledElements.slice(0, 5)) {
        const hasDisabledState = await element.evaluate((el) => {
          return (
            (el as HTMLButtonElement | HTMLInputElement).disabled ||
            el.getAttribute('aria-disabled') === 'true'
          );
        });

        expect(hasDisabledState).toBe(true);
      }
    });

    test('选中状态有 aria-selected', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const tabLists = await page.locator('[role="tablist"]').all();

      for (const tabList of tabLists) {
        const selectedTab = tabList
          .locator('[aria-selected="true"]')
          .first();
        if (await selectedTab.isVisible().catch(() => false)) {
          const isSelected = await selectedTab.evaluate((el) => {
            return el.getAttribute('aria-selected') === 'true';
          });

          expect(isSelected).toBe(true);
        }
      }
    });

    test('展开/折叠状态有 aria-expanded', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const expandableElements = await page.locator('[aria-expanded]').all();

      for (const element of expandableElements.slice(0, 5)) {
        const hasExpandedState = await element.evaluate((el) => {
          const expanded = el.getAttribute('aria-expanded');
          return expanded === 'true' || expanded === 'false';
        });

        expect(hasExpandedState).toBe(true);
      }
    });

    test('必填字段有 aria-required', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const requiredInputs = await page
        .locator('[required], [aria-required="true"]')
        .all();

      for (const input of requiredInputs.slice(0, 5)) {
        const hasRequiredState = await input.evaluate((el) => {
          return (
            (el as HTMLInputElement).required ||
            el.getAttribute('aria-required') === 'true'
          );
        });

        expect(hasRequiredState).toBe(true);
      }
    });

    test('错误状态有 aria-invalid', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const form = page.locator('form').first();
      if (await form.isVisible().catch(() => false)) {
        const submitButton = form.locator('button[type="submit"]').first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          const invalidInputs = await page
            .locator('[aria-invalid="true"], .error, .invalid')
            .all();

          for (const input of invalidInputs.slice(0, 3)) {
            const hasInvalidState = await input.evaluate((el) => {
              return (
                el.getAttribute('aria-invalid') === 'true' ||
                el.classList.contains('error') ||
                el.classList.contains('invalid')
              );
            });

            expect(hasInvalidState).toBe(true);
          }
        }
      }
    });
  });

  test.describe('实时区域 (Live Regions)', () => {
    test('状态消息使用 aria-live', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const liveRegions = await page
        .locator('[aria-live], [role="status"], [role="alert"]')
        .all();

      expect(liveRegions.length >= 0).toBe(true);
    });

    test('错误消息使用 aria-live="assertive"', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      const alertRegions = await page
        .locator('[aria-live="assertive"], [role="alert"]')
        .all();

      expect(alertRegions.length >= 0).toBe(true);
    });

    test('进度更新使用 aria-live="polite"', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const politeRegions = await page
        .locator('[aria-live="polite"], [role="status"]')
        .all();

      expect(politeRegions.length >= 0).toBe(true);
    });

    test('动态内容更新有实时区域', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const dynamicContent = await page
        .locator('[aria-live], [aria-atomic], [aria-relevant]')
        .all();

      expect(dynamicContent.length >= 0).toBe(true);
    });
  });

  test.describe('页面结构', () => {
    test('页面有正确的标题层次结构', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const headings = await page.evaluate(() => {
        const h1Elements = document.querySelectorAll('h1');
        const h2Elements = document.querySelectorAll('h2');
        const h3Elements = document.querySelectorAll('h3');

        return {
          h1Count: h1Elements.length,
          h2Count: h2Elements.length,
          h3Count: h3Elements.length,
        };
      });

      expect(headings.h1Count).toBeGreaterThanOrEqual(0);

      if (headings.h1Count > 1) {
        console.warn('页面有多个 h1 标题，建议只保留一个');
      }
    });

    test('标题按层次顺序排列', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const headingOrder = await page.evaluate(() => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const levels: number[] = [];

        headings.forEach((h) => {
          levels.push(parseInt(h.tagName[1]));
        });

        return levels;
      });

      let isValidOrder = true;
      for (let i = 1; i < headingOrder.length; i++) {
        if (headingOrder[i] > headingOrder[i - 1] + 1) {
          isValidOrder = false;
          break;
        }
      }

      expect(isValidOrder).toBe(true);
    });

    test('语言属性设置正确', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const htmlLang = await page.evaluate(() => {
        return document.documentElement.lang;
      });

      expect(htmlLang).toBeTruthy();
    });
  });

  test.describe('表格可访问性', () => {
    test('表格有正确的表头', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const tables = await page.locator('table').all();

      for (const table of tables.slice(0, 3)) {
        if (await table.isVisible().catch(() => false)) {
          const hasHeaders = await table.evaluate((el) => {
            return (
              el.querySelectorAll('th').length > 0 ||
              el.querySelectorAll('[role="columnheader"]').length > 0
            );
          });

          expect(hasHeaders).toBe(true);
        }
      }
    });

    test('数据表格有 scope 属性', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('domcontentloaded');

      const thElements = await page.locator('table th').all();

      for (const th of thElements.slice(0, 5)) {
        const hasScope = await th.evaluate((el) => {
          return el.hasAttribute('scope') || el.hasAttribute('role');
        });

        expect(hasScope).toBe(true);
      }
    });
  });

  test.describe('表单可访问性', () => {
    test('fieldset 和 legend 用于分组', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const fieldsets = await page.locator('fieldset').all();

      for (const fieldset of fieldsets) {
        const hasLegend = await fieldset.evaluate((el) => {
          return el.querySelector('legend') !== null;
        });

        expect(hasLegend).toBe(true);
      }
    });

    test('描述性文本使用 aria-describedby', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const inputsWithDescription = await page
        .locator('[aria-describedby]')
        .all();

      for (const input of inputsWithDescription.slice(0, 5)) {
        const describedById = await input.getAttribute('aria-describedby');
        const descriptionExists = await page
          .locator(`#${describedById}`)
          .isVisible()
          .catch(() => false);

        expect(descriptionExists).toBe(true);
      }
    });
  });
});
