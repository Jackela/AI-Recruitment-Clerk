import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { JobsPage } from '../pages/JobsPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { TEST_USERS, SAMPLE_RESUMES } from '../fixtures/test-data';

/**
 * 完整招聘流程测试 - Complete Hiring Flow
 *
 * 测试场景：
 * 1. HR 创建职位
 * 2. 候选人上传简历
 * 3. 系统分析并匹配
 * 4. 生成报告
 * 5. 验证报告内容
 */
test.describe('Complete Hiring Flow', () => {
  test('HR can create job, candidate can apply, and system generates report', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const jobsPage = new JobsPage(page);
    const analysisPage = new AnalysisPage(page);

    // Step 1: HR 登录并创建职位
    await loginPage.navigateTo();
    await loginPage.login(TEST_USERS["hr"].email, TEST_USERS["hr"].password);

    await dashboardPage.waitForPageLoad();
    await expect(page).toHaveURL(/\/dashboard/);

    // 创建职位
    await dashboardPage.clickCreateJob();
    await expect(page).toHaveURL(/\/jobs\/create/);

    const jobData = {
      title: 'Senior Full Stack Developer',
      description: `We are looking for a Senior Full Stack Developer with:
        - 5+ years of experience in Node.js and React
        - Experience with TypeScript, PostgreSQL, MongoDB
        - Knowledge of microservices architecture
        - Strong problem-solving skills`,
    };

    await jobsPage.fillJobForm(jobData);
    await jobsPage.submitJobForm();

    // 验证职位创建成功
    await expect(page).toHaveURL(/\/jobs/);
    await expect(
      page.locator('[data-testid="job-card"]').first(),
    ).toBeVisible();
    await expect(
      page.locator('text=Senior Full Stack Developer'),
    ).toBeVisible();

    // Step 2: 候选人上传简历
    await page.evaluate(() => localStorage.clear());
    await loginPage.navigateTo();
    await loginPage.login(
      TEST_USERS["candidate"].email,
      TEST_USERS["candidate"].password,
    );

    await page.goto('/upload');
    await expect(
      page.locator('[data-testid="upload-container"]'),
    ).toBeVisible();

    // 上传简历文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUMES["seniorDeveloper"]);

    await page.click('[data-testid="upload-submit-button"]');

    // Step 3: 等待系统分析完成
    await expect(
      page.locator('[data-testid="analysis-progress"]'),
    ).toBeVisible();
    await page.waitForSelector('[data-testid="analysis-complete"]', {
      timeout: 60000,
    });

    // Step 4: 生成报告
    await analysisPage.navigateTo();
    await analysisPage.waitForPageLoad();

    await page.click('[data-testid="generate-report-button"]');
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();

    // Step 5: 验证报告内容
    await expect(
      page.locator('[data-testid="report-job-title"]'),
    ).toContainText('Senior Full Stack Developer');
    await expect(
      page.locator('[data-testid="report-match-score"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="report-skills-match"]'),
    ).toBeVisible();

    // 验证匹配分数在合理范围内
    const matchScoreText = await page
      .locator('[data-testid="report-match-score"]')
      .textContent();
    const matchScore = parseInt(matchScoreText?.replace(/\D/g, '') || '0', 10);
    expect(matchScore).toBeGreaterThanOrEqual(0);
    expect(matchScore).toBeLessThanOrEqual(100);

    // 验证报告可以下载
    await page.click('[data-testid="download-report-button"]');
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-download"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('end-to-end flow with multiple candidates and ranking', async ({
    page,
  }) => {
    const loginPage = new LoginPage(page);
    const jobsPage = new JobsPage(page);

    // HR 登录并创建职位
    await loginPage.navigateTo();
    await loginPage.login(TEST_USERS["hr"].email, TEST_USERS["hr"].password);

    // 创建职位
    await jobsPage.navigateToCreateJob();
    await jobsPage.fillJobForm({
      title: 'Frontend Developer',
      description: 'Looking for a Frontend Developer with React experience',
    });
    await jobsPage.submitJobForm();

    // 模拟多个候选人申请
    const candidates = [
      { email: 'candidate1@test.com', resume: SAMPLE_RESUMES["juniorDeveloper"] },
      { email: 'candidate2@test.com', resume: SAMPLE_RESUMES["seniorDeveloper"] },
      {
        email: 'candidate3@test.com',
        resume: SAMPLE_RESUMES["fullStackDeveloper"],
      },
    ];

    for (const candidate of candidates) {
      await page.evaluate(() => localStorage.clear());
      await loginPage.navigateTo();
      await loginPage.login(candidate.email, 'password123');

      await page.goto('/upload');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(candidate.resume);
      await page.click('[data-testid="upload-submit-button"]');
      await page.waitForSelector('[data-testid="upload-success"]', {
        timeout: 30000,
      });
    }

    // HR 查看候选人排名
    await page.evaluate(() => localStorage.clear());
    await loginPage.navigateTo();
    await loginPage.login(TEST_USERS["hr"].email, TEST_USERS["hr"].password);

    await page.goto('/analysis/ranking');
    await expect(page.locator('[data-testid="ranking-list"]')).toBeVisible();

    // 验证有 3 个候选人
    const candidateCount = await page
      .locator('[data-testid="candidate-rank-item"]')
      .count();
    expect(candidateCount).toBe(3);

    // 验证排名按分数排序
    const scores: number[] = [];
    for (let i = 0; i < candidateCount; i++) {
      const scoreText = await page
        .locator('[data-testid="candidate-score"]')
        .nth(i)
        .textContent();
      const score = parseInt(scoreText?.replace(/\D/g, '') || '0', 10);
      scores.push(score);
    }

    // 验证分数按降序排列
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });
});
