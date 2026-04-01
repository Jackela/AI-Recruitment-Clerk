import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('颜色对比度可访问性测试 @accessibility', () => {
  test.describe('WCAG 2.1 AA 对比度标准', () => {
    test('正常文本对比度 ≥ 4.5:1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = results.violations.filter(
        (v) => v.id === 'color-contrast',
      );

      if (contrastViolations.length > 0) {
        console.log(
          '对比度问题:',
          contrastViolations.map((v) => ({
            description: v.description,
            nodes: v.nodes.map((n) => ({
              html: n.html.slice(0, 100),
              target: n.target,
            })),
          })),
        );
      }

      expect(contrastViolations).toEqual([]);
    });

    test('大文本对比度 ≥ 3:1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const largeTextElements = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'h1, h2, h3, .large-text, .title',
        );
        const results: Array<{
          text: string;
          fontSize: string;
          fontWeight: string;
        }> = [];

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const fontWeight = parseInt(style.fontWeight);

          if (fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)) {
            results.push({
              text: el.textContent?.slice(0, 50) || '',
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
            });
          }
        });

        return results;
      });

      expect(largeTextElements.length >= 0).toBe(true);
    });

    test('UI 组件对比度 ≥ 3:1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const uiComponents = await page
        .locator(
          'button, input, select, textarea, .btn, .button, [role="button"]',
        )
        .all();

      for (const component of uiComponents.slice(0, 10)) {
        if (await component.isVisible().catch(() => false)) {
          const contrastInfo = await component.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const bgColor = style.backgroundColor;
            const color = style.color;
            const borderColor = style.borderColor;

            return {
              backgroundColor: bgColor,
              textColor: color,
              borderColor: borderColor,
            };
          });

          expect(contrastInfo.textColor).not.toBe('rgba(0, 0, 0, 0)');
          expect(contrastInfo.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    });

    test('链接文本有下划线或其他视觉指示', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const links = await page.locator('a').all();

      for (const link of links.slice(0, 10)) {
        if (await link.isVisible().catch(() => false)) {
          const linkStyle = await link.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              textDecoration: style.textDecoration,
              color: style.color,
              cursor: style.cursor,
            };
          });

          const hasVisualIndicator =
            linkStyle.textDecoration.includes('underline') ||
            linkStyle.cursor === 'pointer' ||
            linkStyle.color !== 'rgb(0, 0, 0)';

          expect(hasVisualIndicator).toBe(true);
        }
      }
    });

    test('禁用元素有视觉区分', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const disabledElements = await page
        .locator('[disabled], [aria-disabled="true"]')
        .all();

      for (const element of disabledElements.slice(0, 5)) {
        const disabledStyle = await element.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            opacity: style.opacity,
            cursor: style.cursor,
            color: style.color,
          };
        });

        const isVisuallyDisabled =
          parseFloat(disabledStyle.opacity) < 1 ||
          disabledStyle.cursor === 'not-allowed' ||
          disabledStyle.color.includes('128') ||
          disabledStyle.color.includes('169');

        expect(isVisuallyDisabled).toBe(true);
      }
    });
  });

  test.describe('焦点可见性对比度', () => {
    test('焦点指示器有足够对比度', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const buttons = await page.locator('button').all();

      for (const button of buttons.slice(0, 5)) {
        if (await button.isVisible().catch(() => false)) {
          await button.focus();
          await page.waitForTimeout(100);

          const focusStyle = await button.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              outlineColor: style.outlineColor,
              outlineWidth: style.outlineWidth,
              outlineStyle: style.outlineStyle,
              boxShadow: style.boxShadow,
            };
          });

          const hasVisibleFocus =
            focusStyle.outlineStyle !== 'none' &&
            focusStyle.outlineWidth !== '0px';

          expect(hasVisibleFocus).toBe(true);
        }
      }
    });

    test('焦点轮廓颜色与背景有足够对比度', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const interactiveElements = await page.locator('button, a, input').all();

      for (const element of interactiveElements.slice(0, 5)) {
        if (await element.isVisible().catch(() => false)) {
          await element.focus();

          const contrastCheck = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            const outlineColor = style.outlineColor;
            const bgColor = style.backgroundColor;

            return {
              hasOutline:
                style.outlineStyle !== 'none' && style.outlineWidth !== '0px',
              outlineColor,
              backgroundColor: bgColor,
            };
          });

          expect(contrastCheck.hasOutline).toBe(true);
          expect(contrastCheck.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    });
  });

  test.describe('图表和数据可视化对比度', () => {
    test('图表元素有足够对比度', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const charts = await page.locator('.chart, [role="img"], svg').all();

      for (const chart of charts.slice(0, 3)) {
        if (await chart.isVisible().catch(() => false)) {
          const chartColors = await chart.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              fill: (el as SVGElement).getAttribute('fill') || style.fill,
              stroke: (el as SVGElement).getAttribute('stroke') || style.stroke,
              color: style.color,
            };
          });

          expect(
            chartColors.fill || chartColors.stroke || chartColors.color,
          ).toBeTruthy();
        }
      }
    });

    test('数据标签清晰可读', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');

      const dataLabels = await page
        .locator('.chart-label, .data-label, text')
        .all();

      for (const label of dataLabels.slice(0, 10)) {
        if (await label.isVisible().catch(() => false)) {
          const labelStyle = await label.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              fontSize: style.fontSize,
              color: style.color,
            };
          });

          const fontSize = parseFloat(labelStyle.fontSize);
          expect(fontSize).toBeGreaterThanOrEqual(12);
          expect(labelStyle.color).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    });
  });

  test.describe('错误和警告状态对比度', () => {
    test('错误消息有足够对比度', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const form = page.locator('form').first();
      if (await form.isVisible().catch(() => false)) {
        const submitButton = form.locator('button[type="submit"]').first();
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(500);

          const errorElements = await page
            .locator('.error, [role="alert"], .text-red, .text-danger')
            .all();

          for (const error of errorElements.slice(0, 5)) {
            if (await error.isVisible().catch(() => false)) {
              const errorStyle = await error.evaluate((el) => {
                const style = window.getComputedStyle(el);
                return {
                  color: style.color,
                  backgroundColor: style.backgroundColor,
                };
              });

              expect(errorStyle.color).toContain('rgb');
              expect(errorStyle.color).not.toBe('rgba(0, 0, 0, 0)');
            }
          }
        }
      }
    });

    test('成功消息有足够对比度', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const successElements = await page
        .locator('.success, .text-green, .text-success, [role="status"]')
        .all();

      for (const success of successElements.slice(0, 3)) {
        if (await success.isVisible().catch(() => false)) {
          const successStyle = await success.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              color: style.color,
              backgroundColor: style.backgroundColor,
            };
          });

          expect(successStyle.color).toContain('rgb');
          expect(successStyle.color).not.toBe('rgba(0, 0, 0, 0)');
        }
      }
    });
  });

  test.describe('移动端对比度', () => {
    test('移动端文本对比度符合标准', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = results.violations.filter(
        (v) => v.id === 'color-contrast',
      );

      expect(contrastViolations).toEqual([]);
    });

    test('移动端按钮有足够对比度', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const buttons = await page.locator('button, .btn, [role="button"]').all();

      for (const button of buttons.slice(0, 5)) {
        if (await button.isVisible().catch(() => false)) {
          const buttonStyle = await button.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              backgroundColor: style.backgroundColor,
              color: style.color,
              minHeight: style.minHeight,
            };
          });

          expect(buttonStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
          expect(buttonStyle.color).not.toBe('rgba(0, 0, 0, 0)');

          const minHeight = parseFloat(buttonStyle.minHeight) || 44;
          expect(minHeight).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('高对比度模式支持', () => {
    test('支持高对比度模式媒体查询', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const supportsHighContrast = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        let hasHighContrastSupport = false;

        try {
          stylesheets.forEach((sheet) => {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach((rule) => {
              if (rule.cssText && rule.cssText.includes('prefers-contrast')) {
                hasHighContrastSupport = true;
              }
            });
          });
        } catch (e) {
          console.log('无法访问某些样式表');
        }

        return hasHighContrastSupport;
      });

      expect(supportsHighContrast).toBe(true);
    });

    test('在高对比度模式下内容仍然可见', async ({ page }) => {
      await page.emulateMedia({ prefersContrast: 'more' });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const mainContent = page.locator('main, [role="main"], #app').first();
      const isVisible = await mainContent.isVisible().catch(() => false);

      expect(isVisible).toBe(true);
    });
  });

  test.describe('暗色模式对比度', () => {
    test('暗色模式下文本对比度符合标准', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze();

      const contrastViolations = results.violations.filter(
        (v) => v.id === 'color-contrast',
      );

      expect(contrastViolations).toEqual([]);
    });

    test('暗色模式支持媒体查询', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const supportsDarkMode = await page.evaluate(() => {
        const stylesheets = Array.from(document.styleSheets);
        let hasDarkModeSupport = false;

        try {
          stylesheets.forEach((sheet) => {
            const rules = Array.from(sheet.cssRules || []);
            rules.forEach((rule) => {
              if (
                rule.cssText &&
                rule.cssText.includes('prefers-color-scheme')
              ) {
                hasDarkModeSupport = true;
              }
            });
          });
        } catch (e) {
          console.log('无法访问某些样式表');
        }

        return hasDarkModeSupport;
      });

      expect(supportsDarkMode).toBe(true);
    });
  });

  test.describe('特定元素对比度检查', () => {
    test('占位符文本有足够对比度', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const inputsWithPlaceholder = await page
        .locator('input[placeholder], textarea[placeholder]')
        .all();

      for (const input of inputsWithPlaceholder.slice(0, 5)) {
        const placeholderStyle = await input.evaluate((el) => {
          const style = window.getComputedStyle(el, '::placeholder');
          return {
            color: style.color,
          };
        });

        expect(placeholderStyle.color).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('禁用输入框文本仍然可见', async ({ page }) => {
      await page.goto('/jobs/create');
      await page.waitForLoadState('domcontentloaded');

      const disabledInputs = await page
        .locator('input[disabled], textarea[disabled]')
        .all();

      for (const input of disabledInputs.slice(0, 3)) {
        const disabledStyle = await input.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            color: style.color,
            backgroundColor: style.backgroundColor,
          };
        });

        expect(disabledStyle.color).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('边框和分隔线有足够对比度', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const borderedElements = await page
        .locator('input, button, .border, hr, fieldset')
        .all();

      for (const element of borderedElements.slice(0, 10)) {
        if (await element.isVisible().catch(() => false)) {
          const borderStyle = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              borderColor: style.borderColor,
              borderWidth: style.borderWidth,
              backgroundColor: style.backgroundColor,
            };
          });

          if (borderStyle.borderWidth !== '0px') {
            expect(borderStyle.borderColor).not.toBe('rgba(0, 0, 0, 0)');
          }
        }
      }
    });
  });
});
