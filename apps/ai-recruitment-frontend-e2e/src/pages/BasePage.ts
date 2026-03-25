import type { Page, Locator } from '@playwright/test';

/**
 * Base Page Object Model
 * All page objects should extend this class
 */
export abstract class BasePage {
  constructor(protected page: Page) {}

  abstract navigateTo(): Promise<void>;
  abstract waitForPageLoad(): Promise<void>;

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
    });
  }

  async isElementVisible(selector: string): Promise<boolean> {
    return await this.page
      .locator(selector)
      .isVisible()
      .catch(() => false);
  }

  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  protected async waitForElement(
    testId: string,
    timeout = 20000,
  ): Promise<Locator> {
    const element = this.getByTestId(testId);
    try {
      await element.waitFor({ state: 'visible', timeout });
    } catch (error) {
      console.log(
        `⚠️ Element with data-testid="${testId}" not visible after ${timeout}ms`,
      );
      // Take a screenshot for debugging
      await this.takeScreenshot(`wait-failed-${testId}`);
      throw error;
    }
    return element;
  }

  /**
   * 等待元素通过 CSS 选择器可见
   * @param selector CSS 选择器
   * @param timeout 超时时间（毫秒），默认 15000
   */
  async waitForElementBySelector(
    selector: string,
    timeout = 15000,
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    try {
      await element.waitFor({ state: 'visible', timeout });
    } catch (error) {
      console.log(
        `⚠️ Element with selector="${selector}" not visible after ${timeout}ms`,
      );
      // Take a screenshot for debugging
      await this.takeScreenshot(
        `wait-failed-selector-${selector.replace(/[^a-zA-Z0-9]/g, '_')}`,
      );
      throw error;
    }
    return element;
  }

  /**
   * 等待多个选择器中的至少一个可见（健壮性等待）
   * @param selectors 选择器数组
   * @param timeout 超时时间
   */
  protected async waitForAnyElement(
    selectors: string[],
    timeout = 15000,
  ): Promise<Locator> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      for (const selector of selectors) {
        const element = this.page.locator(selector);
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          return element;
        }
      }
      // 短暂等待后重试
      await this.page.waitForTimeout(100);
    }

    console.log(
      `⚠️ None of the selectors found after ${timeout}ms:`,
      selectors,
    );
    await this.takeScreenshot('wait-failed-any-element');
    throw new Error(`None of the selectors found: ${selectors.join(', ')}`);
  }

  /**
   * 安全的点击操作，带有重试机制
   */
  protected async safeClick(testId: string, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await this.getByTestId(testId).click({ timeout: 5000 });
        return;
      } catch (error) {
        console.log(`Click attempt ${i + 1}/${retries} failed for ${testId}`);
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(500);
      }
    }
  }

  /**
   * 安全的填充操作，带有重试机制
   */
  protected async safeFill(
    testId: string,
    value: string,
    retries = 3,
  ): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        const element = this.getByTestId(testId);
        await element.waitFor({ state: 'visible', timeout: 5000 });
        await element.fill(value);
        return;
      } catch (error) {
        console.log(`Fill attempt ${i + 1}/${retries} failed for ${testId}`);
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(500);
      }
    }
  }

  protected async clickByTestId(testId: string): Promise<void> {
    await this.getByTestId(testId).click();
  }

  protected async fillByTestId(testId: string, value: string): Promise<void> {
    await this.getByTestId(testId).fill(value);
  }

  protected async getTextByTestId(testId: string): Promise<string> {
    return (await this.getByTestId(testId).textContent()) || '';
  }

  protected async getCountByTestId(testId: string): Promise<number> {
    return await this.page.getByTestId(testId).count();
  }

  /**
   * 检查页面是否完全加载（包含网络空闲）
   */
  async waitForFullLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout during full load');
    });
  }
}
