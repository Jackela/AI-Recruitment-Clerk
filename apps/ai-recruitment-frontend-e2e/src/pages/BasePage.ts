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
    timeout = 5000,
  ): Promise<Locator> {
    const element = this.getByTestId(testId);
    await element.waitFor({ state: 'visible', timeout });
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
