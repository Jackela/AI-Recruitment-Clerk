import { test, expect } from '@playwright/test';
import {
  measurePerformance,
  checkPerformanceBudget,
  measureMemoryUsage,
  measureNetworkRequests,
  measurePageLoad,
  PERFORMANCE_BUDGETS,
  logPerformanceResults,
  clearPerformanceEntries,
} from '../utils/performance';

test.describe('完整性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('首页性能 - Core Web Vitals', async ({ page }) => {
    const metrics = await measurePerformance(page, '/');

    // Verify against budget
    const budget = PERFORMANCE_BUDGETS.homepage;
    const result = checkPerformanceBudget(metrics, budget);

    console.log('首页性能指标:', {
      LCP: `${metrics.lcp.toFixed(2)}ms`,
      FCP: `${metrics.fcp.toFixed(2)}ms`,
      CLS: metrics.cls.toFixed(4),
      TTFB: `${metrics.ttfb.toFixed(2)}ms`,
    });

    expect(metrics.lcp).toBeLessThan(budget.lcp);
    expect(metrics.fcp).toBeLessThan(budget.fcp);
    expect(metrics.cls).toBeLessThan(budget.cls);
    expect(metrics.ttfb).toBeLessThan(budget.ttfb);
    expect(result.passed).toBe(true);
  });

  test('仪表板性能 - 数据加载和渲染', async ({ page }) => {
    // 登录并访问仪表板
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    const metrics = await measurePerformance(page, '/dashboard');
    const budget = PERFORMANCE_BUDGETS.dashboard;

    console.log('仪表板性能指标:', {
      LCP: `${metrics.lcp.toFixed(2)}ms`,
      FCP: `${metrics.fcp.toFixed(2)}ms`,
      CLS: metrics.cls.toFixed(4),
      TTFB: `${metrics.ttfb.toFixed(2)}ms`,
    });

    expect(metrics.lcp).toBeLessThan(budget.lcp);
    expect(metrics.fcp).toBeLessThan(budget.fcp);
    expect(metrics.cls).toBeLessThan(budget.cls);
    expect(metrics.ttfb).toBeLessThan(budget.ttfb);
  });

  test('岗位列表性能 - 大数据列表渲染', async ({ page }) => {
    await page.goto('/jobs');

    // 等待列表加载
    await page.waitForSelector('[data-testid="jobs-list"]', {
      state: 'visible',
      timeout: 10000,
    });

    const metrics = await measurePerformance(page, '/jobs');
    const budget = PERFORMANCE_BUDGETS.jobsList;

    // 检查页面大小
    const networkMetrics = await measureNetworkRequests(page);

    console.log('岗位列表性能指标:', {
      LCP: `${metrics.lcp.toFixed(2)}ms`,
      FCP: `${metrics.fcp.toFixed(2)}ms`,
      CLS: metrics.cls.toFixed(4),
      TTFB: `${metrics.ttfb.toFixed(2)}ms`,
      总请求数: networkMetrics.totalRequests,
      总大小: `${(networkMetrics.totalSize / 1024).toFixed(2)}KB`,
    });

    expect(metrics.lcp).toBeLessThan(budget.lcp);
    expect(metrics.fcp).toBeLessThan(budget.fcp);
    expect(metrics.cls).toBeLessThan(budget.cls);
    expect(networkMetrics.totalSize).toBeLessThan(budget.size);
  });

  test('文件上传性能 - 上传速度和进度', async ({ page }) => {
    await page.goto('/jobs/new');

    // 创建测试文件
    const testFileContent = 'x'.repeat(1024 * 1024 * 2); // 2MB
    const testFile = new File([testFileContent], 'test-resume.pdf', {
      type: 'application/pdf',
    });

    const startTime = Date.now();

    // 设置文件上传监听器
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('[data-testid="file-upload-button"]'),
    ]);

    await fileChooser.setFiles([
      {
        name: 'test-resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(testFileContent),
      },
    ]);

    // 等待上传完成
    await page.waitForSelector('[data-testid="upload-success"]', {
      state: 'visible',
      timeout: 30000,
    });

    const uploadDuration = Date.now() - startTime;
    const uploadSpeed = (2 * 1024 * 1024) / (uploadDuration / 1000); // bytes/second

    console.log('文件上传性能:', {
      文件大小: '2MB',
      上传时间: `${uploadDuration}ms`,
      上传速度: `${(uploadSpeed / 1024 / 1024).toFixed(2)}MB/s`,
    });

    // 上传应在30秒内完成
    expect(uploadDuration).toBeLessThan(30000);
  });

  test('分析功能性能 - AI分析处理', async ({ page }) => {
    await page.goto('/analysis');

    // 选择一个简历进行分析
    await page.waitForSelector('[data-testid="resume-item"]', {
      timeout: 5000,
    });
    await page.click('[data-testid="resume-item"]:first-child');

    const startTime = Date.now();

    // 触发分析
    await page.click('[data-testid="start-analysis-button"]');

    // 等待分析完成
    await page.waitForSelector('[data-testid="analysis-complete"]', {
      state: 'visible',
      timeout: 70000,
    });

    const analysisDuration = Date.now() - startTime;
    const metrics = await measurePerformance(page, '/analysis');

    console.log('分析功能性能:', {
      总处理时间: `${analysisDuration}ms`,
      LCP: `${metrics.lcp.toFixed(2)}ms`,
      FCP: `${metrics.fcp.toFixed(2)}ms`,
    });

    expect(analysisDuration).toBeLessThan(
      PERFORMANCE_BUDGETS.analysis.duration,
    );
    expect(metrics.lcp).toBeLessThan(PERFORMANCE_BUDGETS.analysis.lcp);
  });

  test('关键路径性能 - 端到端用户流程', async ({ page }) => {
    const flowMetrics: Record<string, number> = {};

    // 1. 首页加载
    let startTime = Date.now();
    await page.goto('/');
    flowMetrics.homepageLoad = Date.now() - startTime;

    // 2. 登录
    await page.click('[data-testid="login-link"]');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    startTime = Date.now();
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    flowMetrics.login = Date.now() - startTime;

    // 3. 导航到岗位列表
    startTime = Date.now();
    await page.click('[data-testid="jobs-menu"]');
    await page.waitForSelector('[data-testid="jobs-list"]', {
      state: 'visible',
    });
    flowMetrics.jobsListLoad = Date.now() - startTime;

    // 4. 创建新岗位
    startTime = Date.now();
    await page.click('[data-testid="create-job-button"]');
    await page.waitForSelector('[data-testid="job-form"]', {
      state: 'visible',
    });
    flowMetrics.jobFormLoad = Date.now() - startTime;

    console.log('关键路径性能:', flowMetrics);

    // 验证各步骤性能
    expect(flowMetrics.homepageLoad).toBeLessThan(3000);
    expect(flowMetrics.login).toBeLessThan(5000);
    expect(flowMetrics.jobsListLoad).toBeLessThan(3000);
    expect(flowMetrics.jobFormLoad).toBeLessThan(2000);
  });

  test('页面大小预算 - 资源加载控制', async ({ page }) => {
    const pages = [
      { url: '/', name: '首页', budget: PERFORMANCE_BUDGETS.homepage.size },
      {
        url: '/jobs',
        name: '岗位列表',
        budget: PERFORMANCE_BUDGETS.jobsList.size,
      },
      {
        url: '/dashboard',
        name: '仪表板',
        budget: PERFORMANCE_BUDGETS.dashboard.size,
      },
    ];

    for (const { url, name, budget } of pages) {
      await page.goto(url, { waitUntil: 'networkidle' });
      const networkMetrics = await measureNetworkRequests(page);

      console.log(`${name}资源大小:`, {
        总大小: `${(networkMetrics.totalSize / 1024).toFixed(2)}KB`,
        预算: `${(budget / 1024).toFixed(2)}KB`,
        请求数: networkMetrics.totalRequests,
      });

      expect(networkMetrics.totalSize).toBeLessThan(budget);
    }
  });
});
