import { BasePage } from './BasePage';
import type { Page } from '@playwright/test';
import type { JobData } from '../fixtures/test-data';
import { waitForAppHydration } from '../test-utils/hydration';

/**
 * Jobs Page - 岗位管理页面
 * 增强版：更好的等待策略和错误处理
 */
export class JobsPage extends BasePage {
  // Selectors - 使用多种备选选择器提高健壮性
  private readonly selectors = {
    container: 'jobs-container',
    grid: 'jobs-grid',
    pageTitle: 'page-title',
    createJobButton: 'create-job-button',
    jobCard: 'job-card',
    emptyState: 'empty-state',
    loadingState: 'loading-state',
    createJobForm: 'create-job-form',
    jobTitleInput: 'job-title-input',
    jdTextarea: 'jd-textarea',
    submitButton: 'submit-button',
    cancelButton: 'cancel-button',
  } as const;

  // 备选选择器（用于健壮性检查）
  private readonly fallbackSelectors = {
    container: [
      '[data-testid="jobs-container"]',
      '.jobs-list-container',
      '[class*="jobs-list"]',
    ],
    pageTitle: [
      '#page-title',
      '[data-testid="page-title"]',
      '.page-title',
      'h1',
    ],
    createJobButton: [
      '[data-testid="create-job-button"]',
      'a[routerLink="/jobs/create"]',
      'a[href*="/jobs/create"]',
    ],
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    console.log('🔄 Navigating to /jobs...');
    await this.page.goto('/jobs');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    console.log('⏳ Waiting for jobs page to load...');

    // 使用基本级别的 hydration（比完整级别更快，适合列表页面）
    await waitForAppHydration(this.page, { level: 'basic' });

    // 等待页面内容加载
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {
      console.log('⚠️ Network idle timeout, continuing...');
    });

    // 等待容器可见（使用多种选择器）
    try {
      await this.waitForAnyElement(this.fallbackSelectors.container, 15000);
      console.log('✅ Jobs container is visible');
    } catch (error) {
      console.log('⚠️ Could not find jobs container, checking page content...');
      // 即使容器没找到，如果页面有其他内容也继续
      const bodyText = await this.page.textContent('body');
      if (bodyText && bodyText.length > 100) {
        console.log('✅ Page has content, continuing...');
      } else {
        throw error;
      }
    }

    // 等待页面标题或任何标题元素
    try {
      await this.waitForAnyElement(this.fallbackSelectors.pageTitle, 10000);
      console.log('✅ Page title is visible');
    } catch {
      console.log('⚠️ Page title not found, but continuing...');
    }

    console.log('✅ Jobs page loaded');
  }

  async navigateToCreateJob(): Promise<void> {
    console.log('🔄 Navigating to /jobs/create...');
    await this.page.goto('/jobs/create');

    // 使用基本级别的 hydration
    await waitForAppHydration(this.page, { level: 'basic' });

    // 等待表单可见
    await this.page.waitForLoadState('domcontentloaded');
    await this.waitForElement(this.selectors.createJobForm, 15000);
    console.log('✅ Create job form is visible');
  }

  async clickCreateJob(): Promise<void> {
    // 尝试多种方式找到创建按钮
    const buttonSelectors = this.fallbackSelectors.createJobButton;
    for (const selector of buttonSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible().catch(() => false)) {
        await element.click();
        console.log(`✅ Clicked create job button using: ${selector}`);
        return;
      }
    }
    // 如果都没找到，使用默认方法
    await this.clickByTestId(this.selectors.createJobButton);
  }

  async fillJobTitle(title: string): Promise<void> {
    await this.safeFill(this.selectors.jobTitleInput, title);
  }

  async fillJobDescription(description: string): Promise<void> {
    await this.safeFill(this.selectors.jdTextarea, description);
  }

  async clickSubmit(): Promise<void> {
    await this.safeClick(this.selectors.submitButton);
  }

  async getJobCount(): Promise<number> {
    return await this.getCountByTestId(this.selectors.jobCard);
  }

  async getPageTitle(): Promise<string> {
    // 尝试多种方式获取标题
    try {
      return await this.getTextByTestId(this.selectors.pageTitle);
    } catch {
      // 如果data-testid方式失败，尝试其他选择器
      for (const selector of this.fallbackSelectors.pageTitle) {
        const text = await this.page
          .locator(selector)
          .first()
          .textContent()
          .catch(() => null);
        if (text) return text;
      }
      return '';
    }
  }

  async isContainerVisible(): Promise<boolean> {
    // 检查任何容器选择器
    for (const selector of this.fallbackSelectors.container) {
      const isVisible = await this.isElementVisible(selector);
      if (isVisible) {
        console.log(`✅ Container visible using selector: ${selector}`);
        return true;
      }
    }
    return false;
  }

  async isEmptyStateVisible(): Promise<boolean> {
    return (await this.getCountByTestId(this.selectors.emptyState)) > 0;
  }

  async isLoadingStateVisible(): Promise<boolean> {
    return (await this.getCountByTestId(this.selectors.loadingState)) > 0;
  }

  async createJob(jobData: JobData): Promise<void> {
    await this.clickCreateJob();
    await this.fillJobTitle(jobData.title);
    if (jobData.description) {
      await this.fillJobDescription(jobData.description);
    }
    await this.clickSubmit();
  }

  async fillJobForm(jobData: JobData): Promise<void> {
    await this.fillJobTitle(jobData.title);
    if (jobData.description) {
      await this.fillJobDescription(jobData.description);
    }
  }

  async submitJobForm(): Promise<void> {
    await this.clickSubmit();
  }
}
