import { BasePage } from './BasePage';
import type { Page } from '@playwright/test';

/**
 * Login Page - 登录页面
 */
export class LoginPage extends BasePage {
  private readonly selectors = {
    container: 'login-container',
    pageTitle: 'page-title',
    emailInput: 'email-input',
    passwordInput: 'password-input',
    submitButton: 'submit-button',
    errorMessage: 'error-message',
    rememberMeCheckbox: 'remember-me-checkbox',
    forgotPasswordLink: 'forgot-password-link',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    await this.page.goto('/login');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.selectors.container);
  }

  async fillEmail(email: string): Promise<void> {
    await this.fillByTestId(this.selectors.emailInput, email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.fillByTestId(this.selectors.passwordInput, password);
  }

  async clickSubmit(): Promise<void> {
    await this.clickByTestId(this.selectors.submitButton);
  }

  async checkRememberMe(): Promise<void> {
    await this.getByTestId(this.selectors.rememberMeCheckbox).check();
  }

  async clickForgotPassword(): Promise<void> {
    await this.clickByTestId(this.selectors.forgotPasswordLink);
  }

  async getErrorMessage(): Promise<string> {
    const error = this.getByTestId(this.selectors.errorMessage);
    if ((await error.count()) > 0) {
      return (await error.textContent()) || '';
    }
    return '';
  }

  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickSubmit();
  }

  async isErrorVisible(): Promise<boolean> {
    return (await this.getCountByTestId(this.selectors.errorMessage)) > 0;
  }
}
