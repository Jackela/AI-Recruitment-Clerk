import { BasePage } from './BasePage';
import type { Page } from '@playwright/test';
import { waitForAppHydration } from '../test-utils/hydration';

/**
 * Dashboard Page - 仪表板页面
 */
export class DashboardPage extends BasePage {
  private readonly selectors = {
    container: 'dashboard-container',
    pageTitle: 'page-title',
    statsCard: 'stats-card',
    jobCount: 'job-count',
    resumeCount: 'resume-count',
    analysisCount: 'analysis-count',
    recentJobs: 'recent-jobs',
    quickActions: 'quick-actions',
    createJobButton: 'create-job-button',
    goToAnalysisButton: 'go-to-analysis-button',
    goToReportsButton: 'go-to-reports-button',
    navigation: 'main-navigation',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    await this.page.goto('/dashboard');
    // 使用最小级别的 hydration（最快，适合简单仪表板页面）
    await waitForAppHydration(this.page, { level: 'minimal' });
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.selectors.container);
  }

  async getJobCount(): Promise<string> {
    return await this.getTextByTestId(this.selectors.jobCount);
  }

  async getResumeCount(): Promise<string> {
    return await this.getTextByTestId(this.selectors.resumeCount);
  }

  async clickCreateJob(): Promise<void> {
    await this.clickByTestId(this.selectors.createJobButton);
  }

  async clickGoToAnalysis(): Promise<void> {
    await this.clickByTestId(this.selectors.goToAnalysisButton);
  }

  async clickGoToReports(): Promise<void> {
    await this.clickByTestId(this.selectors.goToReportsButton);
  }

  async navigateToJobs(): Promise<void> {
    await this.page.goto('/jobs');
  }

  async navigateToReports(): Promise<void> {
    await this.page.goto('/reports');
  }

  async isStatsVisible(): Promise<boolean> {
    const count = await this.getCountByTestId(this.selectors.statsCard);
    return count > 0;
  }
}
