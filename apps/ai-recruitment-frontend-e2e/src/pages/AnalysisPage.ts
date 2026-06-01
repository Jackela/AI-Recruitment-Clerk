import { BasePage } from './BasePage';
import type { Page } from '@playwright/test';

/**
 * Analysis Page - 智能分析页面
 */
export class AnalysisPage extends BasePage {
  private readonly selectors = {
    container: 'analysis-container',
    pageTitle: 'page-title',
    uploadArea: 'upload-area',
    fileInput: 'file-input',
    analyzeButton: 'analyze-button',
    resultsSection: 'results-section',
    loadingSpinner: 'loading-spinner',
    emptyState: 'empty-state',
    analysisCard: 'analysis-card',
    scoreDisplay: 'score-display',
    skillMatch: 'skill-match',
  } as const;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo(): Promise<void> {
    await this.page.goto('/analysis');
    await this.waitForPageLoad();
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.selectors.container);
  }

  async uploadResume(filePath: string): Promise<void> {
    const fileInput = this.getByTestId(this.selectors.fileInput);
    await fileInput.setInputFiles(filePath);
  }

  async clickAnalyze(): Promise<void> {
    await this.clickByTestId(this.selectors.analyzeButton);
  }

  async waitForAnalysis(): Promise<void> {
    await this.page
      .locator(`[data-testid="${this.selectors.resultsSection}"]`)
      .waitFor({ timeout: 30000 });
  }

  async getAnalysisResults(): Promise<boolean> {
    const count = await this.getCountByTestId(this.selectors.analysisCard);
    return count > 0;
  }

  async getScore(): Promise<string> {
    return await this.getTextByTestId(this.selectors.scoreDisplay);
  }

  async isUploadAreaVisible(): Promise<boolean> {
    return await this.isElementVisible(
      `[data-testid="${this.selectors.uploadArea}"]`,
    );
  }
}
