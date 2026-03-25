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
    timeout = 10000,
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
}
