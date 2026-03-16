import { BasePage } from './BasePage';
import type { Page } from '@playwright/test';
import type { JobData } from '../fixtures/test-data';

/**
 * Jobs Page - 岗位管理页面
 */
export class JobsPage extends BasePage {
  // Selectors
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
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    await this.page.goto('/jobs');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.selectors.container);
    await this.waitForElement(this.selectors.pageTitle);
  }

  async navigateToCreateJob(): Promise<void> {
    await this.page.goto('/jobs/create');
    await this.waitForElement(this.selectors.createJobForm);
  }

  async clickCreateJob(): Promise<void> {
    await this.clickByTestId(this.selectors.createJobButton);
  }

  async fillJobTitle(title: string): Promise<void> {
    await this.fillByTestId(this.selectors.jobTitleInput, title);
  }

  async fillJobDescription(description: string): Promise<void> {
    await this.fillByTestId(this.selectors.jdTextarea, description);
  }

  async clickSubmit(): Promise<void> {
    await this.clickByTestId(this.selectors.submitButton);
  }

  async getJobCount(): Promise<number> {
    return await this.getCountByTestId(this.selectors.jobCard);
  }

  async getPageTitle(): Promise<string> {
    return await this.getTextByTestId(this.selectors.pageTitle);
  }

  async isContainerVisible(): Promise<boolean> {
    return await this.isElementVisible(
      `[data-testid="${this.selectors.container}"]`,
    );
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
