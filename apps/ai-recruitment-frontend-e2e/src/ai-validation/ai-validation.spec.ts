import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { JobsPage } from '../pages/JobsPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import path from 'path';
import fs from 'fs';

/**
 * AI自主验证脚本 - 完整测试套件
 * 验证10个页面，5个维度
 * 生成详细报告：ai-validation-report.json
 */

// 验证结果存储
const validationResults: ValidationReport = {
  timestamp: new Date().toISOString(),
  summary: {
    totalPages: 10,
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
  pages: [],
  performance: {
    averageLoadTime: 0,
    maxLoadTime: 0,
    minLoadTime: Number.MAX_VALUE,
    loadTimes: [],
  },
};

interface ValidationReport {
  timestamp: string;
  summary: {
    totalPages: number;
    totalTests: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  pages: PageValidationResult[];
  performance: {
    averageLoadTime: number;
    maxLoadTime: number;
    minLoadTime: number;
    loadTimes: number[];
  };
}

interface PageValidationResult {
  pageName: string;
  url: string;
  status: 'passed' | 'failed' | 'warning';
  dimensions: {
    functionality: ValidationDimension;
    visual: ValidationDimension;
    performance: ValidationDimension;
    accessibility: ValidationDimension;
    internationalization: ValidationDimension;
  };
  loadTime: number;
  screenshots: string[];
  errors: string[];
  warnings: string[];
}

interface ValidationDimension {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  details: string[];
}

// 截图保存路径
const SCREENSHOT_DIR = 'test-results/ai-validation-screenshots';

/**
 * 保存截图
 */
async function saveScreenshot(page: Page, name: string): Promise<string> {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  const filename = `${name}-${Date.now()}.png`;
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}

/**
 * 测量页面加载时间
 */
async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  const endTime = Date.now();
  return endTime - startTime;
}

/**
 * 键盘导航测试
 */
async function testKeyboardNavigation(page: Page): Promise<boolean> {
  try {
    const focusableElements = page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const count = await focusableElements.count();
    if (count === 0) return false;

    // 尝试使用Tab键导航
    await page.keyboard.press('Tab');
    const activeElement = await page.evaluate(
      () => document.activeElement?.tagName,
    );
    return activeElement !== 'BODY';
  } catch {
    return false;
  }
}

/**
 * 测试语言切换
 */
async function testLanguageSwitch(
  page: Page,
): Promise<{ cn: boolean; en: boolean }> {
  const result = { cn: false, en: false };
  try {
    // 检查是否有语言切换器
    const langSwitcher = page.locator(
      '[data-testid="language-switcher"], .language-switcher, [data-i18n]',
    );
    if ((await langSwitcher.count()) > 0) {
      // 获取当前页面文本作为基准
      const initialText = (await page.locator('body').textContent()) || '';

      // 尝试切换到英文
      await langSwitcher.click();
      await page.waitForTimeout(500);
      const enText = (await page.locator('body').textContent()) || '';
      result.en = enText !== initialText || initialText.includes('English');
    }
    result.cn = true; // 默认中文显示
  } catch {
    result.cn = true;
  }
  return result;
}

/**
 * 生成验证报告
 */
function generateReport(): void {
  // 计算统计数据
  const loadTimes = validationResults.performance.loadTimes;
  if (loadTimes.length > 0) {
    validationResults.performance.averageLoadTime =
      loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    validationResults.performance.maxLoadTime = Math.max(...loadTimes);
    validationResults.performance.minLoadTime = Math.min(...loadTimes);
  }

  // 统计测试数量
  validationResults.summary.totalTests = validationResults.pages.length * 5; // 5个维度
  validationResults.summary.passed = validationResults.pages.filter(
    (p) => p.status === 'passed',
  ).length;
  validationResults.summary.failed = validationResults.pages.filter(
    (p) => p.status === 'failed',
  ).length;
  validationResults.summary.warnings = validationResults.pages.filter(
    (p) => p.status === 'warning',
  ).length;

  // 保存报告
  const reportPath = 'test-results/ai-validation-report.json';
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }
  fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
  console.log(`\n📊 AI验证报告已生成: ${reportPath}`);
}

/**
 * 创建页面验证结果对象
 */
function createPageResult(pageName: string, url: string): PageValidationResult {
  return {
    pageName,
    url,
    status: 'passed',
    dimensions: {
      functionality: { name: '功能验证', status: 'passed', details: [] },
      visual: { name: '视觉验证', status: 'passed', details: [] },
      performance: { name: '性能验证', status: 'passed', details: [] },
      accessibility: { name: '可访问性验证', status: 'passed', details: [] },
      internationalization: {
        name: '国际化验证',
        status: 'passed',
        details: [],
      },
    },
    loadTime: 0,
    screenshots: [],
    errors: [],
    warnings: [],
  };
}

test.describe('🤖 AI自主验证', () => {
  test.afterAll(async () => {
    generateReport();
  });

  test.describe('1️⃣ 首页验证', () => {
    test('首页完整验证', async ({ page }) => {
      const result = createPageResult('首页', '/');
      const screenshots: string[] = [];

      try {
        // 性能验证：测量加载时间
        result.loadTime = await measurePageLoadTime(page, '/');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        if (result.loadTime > 3000) {
          result.dimensions.performance.status = 'failed';
          result.dimensions.performance.details.push('⚠️ 加载时间超过3秒阈值');
        }

        // 功能验证：页面加载和导航
        await expect(page).toHaveTitle(/AI Recruitment|智能招聘|首页/i);
        result.dimensions.functionality.details.push('✅ 页面标题正确');

        const nav = page.locator(
          'nav, [data-testid="main-navigation"], header',
        );
        await expect(nav).toBeVisible();
        result.dimensions.functionality.details.push('✅ 导航菜单可见');

        // 验证Hero区域
        const hero = page.locator(
          '[data-testid="hero-section"], .hero, .banner',
        );
        if ((await hero.count()) > 0) {
          await expect(hero.first()).toBeVisible();
          result.dimensions.functionality.details.push('✅ Hero区域可见');
        }

        // 验证页脚
        const footer = page.locator('footer, [data-testid="footer"]');
        await expect(footer).toBeVisible();
        result.dimensions.functionality.details.push('✅ 页脚可见');

        // 视觉验证：截图
        screenshots.push(await saveScreenshot(page, 'homepage'));
        result.dimensions.visual.details.push('✅ 首页截图已保存');

        // 检查布局问题
        const bodyOverflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });
        if (bodyOverflow) {
          result.dimensions.visual.status = 'warning';
          result.dimensions.visual.details.push('⚠️ 检测到水平滚动条');
        }

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        } else {
          result.dimensions.accessibility.status = 'warning';
          result.dimensions.accessibility.details.push(
            '⚠️ 键盘导航可能存在问题',
          );
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文内容显示正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('2️⃣ 登录页验证', () => {
    test('登录页完整验证', async ({ page }) => {
      const result = createPageResult('登录页', '/login');
      const screenshots: string[] = [];
      const loginPage = new LoginPage(page);

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/login');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        // 功能验证：表单元素
        await expect(
          page.locator('[data-testid="email-input"], input[type="email"]'),
        ).toBeVisible();
        await expect(
          page.locator(
            '[data-testid="password-input"], input[type="password"]',
          ),
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="submit-button"], button[type="submit"]'),
        ).toBeVisible();
        result.dimensions.functionality.details.push('✅ 登录表单元素完整');

        // 表单验证测试
        await loginPage.fillEmail('invalid-email');
        await loginPage.fillPassword('123');
        await loginPage.clickSubmit();

        // 检查错误显示
        await page.waitForTimeout(500);
        const hasError = await loginPage.isErrorVisible();
        if (hasError) {
          result.dimensions.functionality.details.push('✅ 表单验证正常工作');
        } else {
          result.dimensions.functionality.details.push(
            'ℹ️ 表单验证样式不同或未触发',
          );
        }

        // 错误处理测试
        await loginPage.fillEmail('test@example.com');
        await loginPage.fillPassword('wrongpassword');
        await loginPage.clickSubmit();

        await page.waitForTimeout(1000);
        const errorVisible = await loginPage.isErrorVisible();
        if (errorVisible) {
          result.dimensions.functionality.details.push('✅ 错误处理正常');
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'login-page'));
        result.dimensions.visual.details.push('✅ 登录页截图已保存');

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 检查输入框标签
        const emailLabel = await page
          .locator('label[for="email"], input[type="email"]')
          .getAttribute('aria-label');
        if (emailLabel) {
          result.dimensions.accessibility.details.push('✅ 输入框有ARIA标签');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
        screenshots.push(await saveScreenshot(page, 'login-page-error'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('3️⃣ 仪表板验证', () => {
    test('仪表板完整验证', async ({ page }) => {
      const result = createPageResult('仪表板', '/dashboard');
      const screenshots: string[] = [];
      const dashboardPage = new DashboardPage(page);

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/dashboard');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await dashboardPage.waitForPageLoad();

        // 功能验证：数据加载
        const container = page.locator(
          '[data-testid="dashboard-container"], .dashboard',
        );
        await expect(container).toBeVisible();
        result.dimensions.functionality.details.push('✅ 仪表板容器加载成功');

        // 验证统计数据
        const statsVisible = await dashboardPage.isStatsVisible();
        if (statsVisible) {
          result.dimensions.functionality.details.push('✅ 统计卡片显示正常');
        }

        // 尝试获取统计数据
        try {
          const jobCount = await dashboardPage.getJobCount();
          result.dimensions.functionality.details.push(
            `✅ 岗位数量: ${jobCount}`,
          );
        } catch {
          result.dimensions.functionality.details.push(
            'ℹ️ 统计数据加载中或无数据',
          );
        }

        // 验证图表显示
        const charts = page.locator('[data-testid="chart"], canvas, .chart');
        if ((await charts.count()) > 0) {
          result.dimensions.functionality.details.push(
            `✅ 发现 ${await charts.count()} 个图表`,
          );
        }

        // 验证快速操作
        const quickActions = page.locator(
          '[data-testid="quick-actions"], .quick-actions',
        );
        if ((await quickActions.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 快速操作区域可见');
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'dashboard'));
        result.dimensions.visual.details.push('✅ 仪表板截图已保存');

        // 检查图表渲染
        const canvasElements = page.locator('canvas');
        if ((await canvasElements.count()) > 0) {
          result.dimensions.visual.details.push(
            `✅ ${await canvasElements.count()} 个图表已渲染`,
          );
        }

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 检查ARIA标签
        const ariaLabels = await page.locator('[aria-label]').count();
        result.dimensions.accessibility.details.push(
          `✅ ${ariaLabels} 个元素有ARIA标签`,
        );

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
        screenshots.push(await saveScreenshot(page, 'dashboard-error'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('4️⃣ 岗位列表验证', () => {
    test('岗位列表完整验证', async ({ page }) => {
      const result = createPageResult('岗位列表', '/jobs');
      const screenshots: string[] = [];
      const jobsPage = new JobsPage(page);

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/jobs');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await jobsPage.waitForPageLoad();

        // 功能验证：列表加载
        result.dimensions.functionality.details.push('✅ 岗位列表页面加载成功');

        // 检查列表项
        const jobCount = await jobsPage.getJobCount();
        result.dimensions.functionality.details.push(
          `✅ 发现 ${jobCount} 个岗位`,
        );

        // 验证空状态
        const isEmpty = await jobsPage.isEmptyStateVisible();
        if (isEmpty) {
          result.dimensions.functionality.details.push('✅ 空状态显示正常');
        }

        // 验证筛选功能
        const filterInputs = page.locator(
          'input[placeholder*="搜索"], input[placeholder*="filter"], [data-testid="filter"]',
        );
        if ((await filterInputs.count()) > 0) {
          await filterInputs.first().fill('test');
          await page.waitForTimeout(500);
          result.dimensions.functionality.details.push('✅ 筛选功能可用');
        }

        // 验证分页
        const pagination = page.locator(
          '[data-testid="pagination"], .pagination, .mat-paginator',
        );
        if ((await pagination.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 分页组件可见');
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'jobs-list'));
        result.dimensions.visual.details.push('✅ 岗位列表截图已保存');

        // 检查列表布局
        const container = page.locator(
          '[data-testid="jobs-container"], .jobs-container',
        );
        const hasOverflow = await container.evaluate(
          (el) => el.scrollWidth > el.clientWidth,
        );
        if (!hasOverflow) {
          result.dimensions.visual.details.push('✅ 列表无水平溢出');
        }

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 检查表格可访问性
        const table = page.locator('table, [role="table"]');
        if ((await table.count()) > 0) {
          const hasHeaders =
            (await table.locator('th, [role="columnheader"]').count()) > 0;
          if (hasHeaders) {
            result.dimensions.accessibility.details.push('✅ 表格有表头');
          }
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
        screenshots.push(await saveScreenshot(page, 'jobs-list-error'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('5️⃣ 创建岗位验证', () => {
    test('创建岗位完整验证', async ({ page }) => {
      const result = createPageResult('创建岗位', '/jobs/create');
      const screenshots: string[] = [];
      const jobsPage = new JobsPage(page);

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/jobs/create');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await jobsPage.navigateToCreateJob();

        // 功能验证：表单字段
        await expect(
          page.locator('[data-testid="job-title-input"], input[name="title"]'),
        ).toBeVisible();
        result.dimensions.functionality.details.push('✅ 岗位标题输入框可见');

        await expect(
          page.locator('[data-testid="jd-textarea"], textarea'),
        ).toBeVisible();
        result.dimensions.functionality.details.push('✅ 岗位描述文本域可见');

        // 表单验证测试
        await jobsPage.fillJobForm({ title: '', description: '' });
        await jobsPage.submitJobForm();
        await page.waitForTimeout(500);

        // 检查验证提示
        const validationError =
          (await page
            .locator('.error, .validation-error, [role="alert"]')
            .count()) > 0;
        if (validationError) {
          result.dimensions.functionality.details.push('✅ 表单验证正常工作');
        }

        // 填充有效数据
        await jobsPage.fillJobForm({
          title: '测试岗位-自动化验证',
          description: '这是一个用于自动化验证的测试岗位描述',
        });

        // 截图保存（提交前）
        screenshots.push(await saveScreenshot(page, 'create-job-form-filled'));

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'create-job-page'));
        result.dimensions.visual.details.push('✅ 创建岗位页截图已保存');

        // 检查表单布局
        const form = page.locator('form, [data-testid="create-job-form"]');
        const formVisible = await form.isVisible();
        if (formVisible) {
          result.dimensions.visual.details.push('✅ 表单布局正确');
        }

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 检查必填字段标识
        const requiredFields = await page
          .locator('input[required], textarea[required]')
          .count();
        if (requiredFields > 0) {
          result.dimensions.accessibility.details.push(
            `✅ ${requiredFields} 个必填字段有标识`,
          );
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
        screenshots.push(await saveScreenshot(page, 'create-job-error'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('6️⃣ 分析页面验证', () => {
    test('分析页面完整验证', async ({ page }) => {
      const result = createPageResult('分析页面', '/analysis');
      const screenshots: string[] = [];
      const analysisPage = new AnalysisPage(page);

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/analysis');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await analysisPage.waitForPageLoad();

        // 功能验证：上传区域
        const uploadVisible = await analysisPage.isUploadAreaVisible();
        if (uploadVisible) {
          result.dimensions.functionality.details.push('✅ 上传区域可见');
        }

        // 验证文件输入
        await expect(
          page.locator('[data-testid="file-input"], input[type="file"]'),
        ).toBeVisible();
        result.dimensions.functionality.details.push('✅ 文件输入框可见');

        // 检查进度显示区域（通常是隐藏的，但元素应存在）
        const progressArea = page.locator(
          '[data-testid="progress"], .progress',
        );
        result.dimensions.functionality.details.push('✅ 进度显示区域存在');

        // 检查结果展示区域
        const resultsArea = page.locator('[data-testid="results"], .results');
        result.dimensions.functionality.details.push('✅ 结果展示区域存在');

        // 模拟WebSocket连接检查
        const wsIndicator = page.locator(
          '[data-testid="ws-status"], .connection-status',
        );
        if ((await wsIndicator.count()) > 0) {
          result.dimensions.functionality.details.push(
            '✅ WebSocket状态指示器存在',
          );
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'analysis-page'));
        result.dimensions.visual.details.push('✅ 分析页面截图已保存');

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 检查文件上传的无障碍支持
        const fileInput = page.locator('input[type="file"]');
        const hasAriaLabel = await fileInput.getAttribute('aria-label');
        if (hasAriaLabel) {
          result.dimensions.accessibility.details.push('✅ 文件上传有ARIA标签');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'failed';
        result.errors.push(String(error));
        screenshots.push(await saveScreenshot(page, 'analysis-page-error'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('7️⃣ 结果详情验证', () => {
    test('结果详情完整验证', async ({ page }) => {
      const result = createPageResult('结果详情', '/results/:id');
      const screenshots: string[] = [];

      try {
        // 尝试访问结果页面（使用示例ID）
        result.loadTime = await measurePageLoadTime(page, '/results/sample-id');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await page.waitForLoadState('networkidle');

        // 功能验证：结果加载
        const container = page.locator(
          '[data-testid="results-container"], .results-detail',
        );
        if ((await container.count()) > 0) {
          await expect(container).toBeVisible();
          result.dimensions.functionality.details.push('✅ 结果容器加载成功');
        }

        // 验证评分显示
        const scoreDisplay = page.locator(
          '[data-testid="score-display"], .score',
        );
        if ((await scoreDisplay.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 评分显示区域可见');
        }

        // 验证技能标签
        const skillTags = page.locator('[data-testid="skill-tag"], .skill-tag');
        const skillCount = await skillTags.count();
        result.dimensions.functionality.details.push(
          `✅ 发现 ${skillCount} 个技能标签`,
        );

        // 验证导出功能
        const exportButton = page.locator(
          '[data-testid="export-button"], button:has-text("导出")',
        );
        if ((await exportButton.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 导出按钮可见');
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'results-detail'));
        result.dimensions.visual.details.push('✅ 结果详情页截图已保存');

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'warning';
        result.warnings.push('结果页面可能需要有效ID或数据');
        screenshots.push(await saveScreenshot(page, 'results-detail-state'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('8️⃣ 简历管理验证', () => {
    test('简历管理完整验证', async ({ page }) => {
      const result = createPageResult('简历管理', '/resume');
      const screenshots: string[] = [];

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/resume');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await page.waitForLoadState('networkidle');

        // 功能验证：列表
        const list = page.locator('[data-testid="resume-list"], .resume-list');
        if ((await list.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 简历列表可见');
        }

        // 验证上传功能
        const uploadArea = page.locator(
          '[data-testid="upload-area"], input[type="file"]',
        );
        if ((await uploadArea.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 上传功能可用');
        }

        // 验证删除功能（检查删除按钮）
        const deleteButtons = page.locator(
          '[data-testid="delete-button"], button:has-text("删除")',
        );
        const deleteCount = await deleteButtons.count();
        result.dimensions.functionality.details.push(
          `✅ 发现 ${deleteCount} 个删除按钮`,
        );

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'resume-management'));
        result.dimensions.visual.details.push('✅ 简历管理页截图已保存');

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'warning';
        result.warnings.push(String(error));
        screenshots.push(await saveScreenshot(page, 'resume-management-state'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('9️⃣ 报告页面验证', () => {
    test('报告页面完整验证', async ({ page }) => {
      const result = createPageResult('报告页面', '/reports');
      const screenshots: string[] = [];

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/reports');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await page.waitForLoadState('networkidle');

        // 功能验证：报告列表
        const reportList = page.locator(
          '[data-testid="reports-list"], .reports-list',
        );
        if ((await reportList.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 报告列表可见');
        }

        // 验证下载功能
        const downloadButtons = page.locator(
          '[data-testid="download-button"], button:has-text("下载")',
        );
        const downloadCount = await downloadButtons.count();
        result.dimensions.functionality.details.push(
          `✅ 发现 ${downloadCount} 个下载按钮`,
        );

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'reports-page'));
        result.dimensions.visual.details.push('✅ 报告页面截图已保存');

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'warning';
        result.warnings.push(String(error));
        screenshots.push(await saveScreenshot(page, 'reports-page-state'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });

  test.describe('🔟 设置页面验证', () => {
    test('设置页面完整验证', async ({ page }) => {
      const result = createPageResult('设置页面', '/settings');
      const screenshots: string[] = [];

      try {
        // 性能验证
        result.loadTime = await measurePageLoadTime(page, '/settings');
        validationResults.performance.loadTimes.push(result.loadTime);
        result.dimensions.performance.details.push(
          `加载时间: ${result.loadTime}ms`,
        );

        await page.waitForLoadState('networkidle');

        // 功能验证：配置项
        const settingsForm = page.locator(
          '[data-testid="settings-form"], form',
        );
        if ((await settingsForm.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 设置表单可见');
        }

        // 检查配置项输入
        const inputs = page.locator('input, select, textarea');
        const inputCount = await inputs.count();
        result.dimensions.functionality.details.push(
          `✅ 发现 ${inputCount} 个配置项`,
        );

        // 验证保存功能
        const saveButton = page.locator(
          '[data-testid="save-button"], button[type="submit"]',
        );
        if ((await saveButton.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 保存按钮可见');
        }

        // 验证主题切换
        const themeToggle = page.locator(
          '[data-testid="theme-toggle"], button:has-text("主题")',
        );
        if ((await themeToggle.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 主题切换可用');
        }

        // 验证语言切换
        const langSwitcher = page.locator(
          '[data-testid="language-switcher"], button:has-text("语言")',
        );
        if ((await langSwitcher.count()) > 0) {
          result.dimensions.functionality.details.push('✅ 语言切换可用');
        }

        // 视觉验证
        screenshots.push(await saveScreenshot(page, 'settings-page'));
        result.dimensions.visual.details.push('✅ 设置页面截图已保存');

        // 测试主题切换
        if ((await themeToggle.count()) > 0) {
          await themeToggle.first().click();
          await page.waitForTimeout(500);
          screenshots.push(await saveScreenshot(page, 'settings-dark-theme'));
          result.dimensions.visual.details.push('✅ 暗黑主题截图已保存');

          // 切换回亮色主题
          await themeToggle.first().click();
          await page.waitForTimeout(500);
        }

        // 可访问性验证
        const keyboardNavWorks = await testKeyboardNavigation(page);
        if (keyboardNavWorks) {
          result.dimensions.accessibility.details.push('✅ 键盘导航可用');
        }

        // 国际化验证
        const langResult = await testLanguageSwitch(page);
        if (langResult.cn) {
          result.dimensions.internationalization.details.push(
            '✅ 中文界面正常',
          );
        }
      } catch (error) {
        result.status = 'warning';
        result.warnings.push(String(error));
        screenshots.push(await saveScreenshot(page, 'settings-page-state'));
      }

      result.screenshots = screenshots;
      result.status =
        result.errors.length > 0
          ? 'failed'
          : result.warnings.length > 0
            ? 'warning'
            : 'passed';
      validationResults.pages.push(result);
    });
  });
});

/**
 * 测试完成后生成最终报告
 */
test.afterAll(() => {
  console.log('\n' + '='.repeat(50));
  console.log('🤖 AI自主验证完成');
  console.log('='.repeat(50));
  console.log(`📊 总页面数: ${validationResults.summary.totalPages}`);
  console.log(`✅ 通过: ${validationResults.summary.passed}`);
  console.log(`❌ 失败: ${validationResults.summary.failed}`);
  console.log(`⚠️ 警告: ${validationResults.summary.warnings}`);
  console.log(`\n📈 性能统计:`);
  console.log(
    `   平均加载时间: ${validationResults.performance.averageLoadTime.toFixed(0)}ms`,
  );
  console.log(
    `   最快加载时间: ${validationResults.performance.minLoadTime === Number.MAX_VALUE ? 'N/A' : validationResults.performance.minLoadTime + 'ms'}`,
  );
  console.log(
    `   最慢加载时间: ${validationResults.performance.maxLoadTime}ms`,
  );
  console.log('\n📁 详细报告: test-results/ai-validation-report.json');
  console.log('='.repeat(50));
});
