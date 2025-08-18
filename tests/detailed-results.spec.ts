import { test, expect } from '@playwright/test';

test.describe('详细结果页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到详细结果页面
    await page.goto('http://localhost:4201/results/test-session-123');
  });

  test('应该显示页面基本结构', async ({ page }) => {
    // 验证页面容器
    await expect(page.locator('.results-container')).toBeVisible();
    
    // 验证头部区域
    await expect(page.locator('.header-section')).toBeVisible();
    await expect(page.locator('h1')).toHaveText('详细分析报告');
    await expect(page.locator('.subtitle')).toContainText('test-session-123');
    
    // 验证返回按钮
    await expect(page.locator('.back-btn')).toBeVisible();
    await expect(page.locator('.back-btn')).toContainText('返回分析');
  });

  test('应该显示分析结果概览卡片', async ({ page }) => {
    // 验证概览卡片存在
    await expect(page.locator('.overview-card')).toBeVisible();
    
    // 验证评分显示
    await expect(page.locator('.score-display')).toBeVisible();
    await expect(page.locator('.score-value')).toBeVisible();
    
    // 验证候选人信息
    await expect(page.locator('.candidate-info')).toBeVisible();
    await expect(page.locator('.candidate-name')).toBeVisible();
    
    // 验证分析时间
    await expect(page.locator('.analysis-time')).toBeVisible();
  });

  test('应该显示技能分析卡片', async ({ page }) => {
    // 验证技能分析卡片
    await expect(page.locator('.skills-card')).toBeVisible();
    await expect(page.locator('.skills-card h2')).toContainText('技能分析');
    
    // 验证技能标签
    await expect(page.locator('.skill-tag').first()).toBeVisible();
    
    // 验证技能匹配度
    await expect(page.locator('.skill-match')).toBeVisible();
    
    // 验证技能热力图
    await expect(page.locator('.skills-heatmap')).toBeVisible();
  });

  test('应该显示经验分析卡片', async ({ page }) => {
    // 验证经验分析卡片
    await expect(page.locator('.experience-card')).toBeVisible();
    await expect(page.locator('.experience-card h2')).toContainText('经验分析');
    
    // 验证工作经历时间线
    await expect(page.locator('.experience-timeline')).toBeVisible();
    
    // 验证职位匹配度
    await expect(page.locator('.position-match')).toBeVisible();
  });

  test('应该显示教育背景卡片', async ({ page }) => {
    // 验证教育背景卡片
    await expect(page.locator('.education-card')).toBeVisible();
    await expect(page.locator('.education-card h2')).toContainText('教育背景');
    
    // 验证学历信息
    await expect(page.locator('.education-level')).toBeVisible();
    
    // 验证专业匹配度
    await expect(page.locator('.major-match')).toBeVisible();
  });

  test('应该显示AI推荐建议', async ({ page }) => {
    // 验证推荐建议卡片
    await expect(page.locator('.recommendations-card')).toBeVisible();
    await expect(page.locator('.recommendations-card h2')).toContainText('AI建议');
    
    // 验证建议列表
    await expect(page.locator('.recommendation-item').first()).toBeVisible();
    
    // 验证优势分析
    await expect(page.locator('.strengths-section')).toBeVisible();
    
    // 验证改进建议
    await expect(page.locator('.improvements-section')).toBeVisible();
  });

  test('应该显示详细评分雷达图', async ({ page }) => {
    // 验证雷达图卡片
    await expect(page.locator('.radar-chart-card')).toBeVisible();
    await expect(page.locator('.radar-chart-card h2')).toContainText('能力雷达图');
    
    // 验证雷达图容器
    await expect(page.locator('.radar-chart-container')).toBeVisible();
    
    // 验证图例
    await expect(page.locator('.chart-legend')).toBeVisible();
  });

  test('应该支持导出功能', async ({ page }) => {
    // 验证导出按钮组
    await expect(page.locator('.export-actions')).toBeVisible();
    
    // 验证PDF导出按钮
    await expect(page.locator('.export-pdf-btn')).toBeVisible();
    await expect(page.locator('.export-pdf-btn')).toContainText('导出PDF');
    
    // 验证Excel导出按钮
    await expect(page.locator('.export-excel-btn')).toBeVisible();
    await expect(page.locator('.export-excel-btn')).toContainText('导出Excel');
    
    // 验证分享按钮
    await expect(page.locator('.share-btn')).toBeVisible();
    await expect(page.locator('.share-btn')).toContainText('分享链接');
  });

  test('应该支持返回导航', async ({ page }) => {
    // 点击返回按钮
    await page.click('.back-btn');
    
    // 验证导航到分析页面
    await expect(page.url()).toContain('/analysis');
  });

  test('应该支持响应式布局', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 验证主要卡片仍然可见
    await expect(page.locator('.overview-card')).toBeVisible();
    await expect(page.locator('.skills-card')).toBeVisible();
    
    // 设置手机视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 验证移动端布局
    await expect(page.locator('.results-container')).toBeVisible();
    await expect(page.locator('.header-section h1')).toBeVisible();
    
    // 验证卡片堆叠布局
    await expect(page.locator('.content-grid')).toHaveClass(/mobile-layout/);
  });

  test('应该显示加载状态', async ({ page }) => {
    // 刷新页面触发加载
    await page.reload();
    
    // 验证加载指示器
    await expect(page.locator('.loading-spinner')).toBeVisible();
    await expect(page.locator('.loading-text')).toContainText('正在加载详细报告');
    
    // 等待加载完成
    await expect(page.locator('.overview-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.loading-spinner')).not.toBeVisible();
  });

  test('应该处理错误状态', async ({ page }) => {
    // 导航到无效的session ID
    await page.goto('http://localhost:4201/results/invalid-session');
    
    // 验证错误状态显示
    await expect(page.locator('.error-state')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('未找到分析结果');
    
    // 验证重试按钮
    await expect(page.locator('.retry-btn')).toBeVisible();
    await expect(page.locator('.retry-btn')).toContainText('重新加载');
  });

  test('详细结果页面完整性检查', async ({ page }) => {
    // 验证页面核心结构
    await expect(page.locator('.results-container')).toBeVisible();
    await expect(page.locator('.header-section')).toBeVisible();
    await expect(page.locator('.content-grid')).toBeVisible();
    
    // 验证所有主要卡片
    await expect(page.locator('.overview-card')).toBeVisible();
    await expect(page.locator('.skills-card')).toBeVisible();
    await expect(page.locator('.experience-card')).toBeVisible();
    await expect(page.locator('.education-card')).toBeVisible();
    await expect(page.locator('.recommendations-card')).toBeVisible();
    await expect(page.locator('.radar-chart-card')).toBeVisible();
    
    // 验证操作区域
    await expect(page.locator('.export-actions')).toBeVisible();
    await expect(page.locator('.back-btn')).toBeVisible();
    
    console.log('✅ 详细结果页面完整性检查通过');
  });
});

test.describe('详细结果页面交互测试', () => {
  test('应该支持技能标签展开/收起', async ({ page }) => {
    await page.goto('http://localhost:4201/results/test-session-123');
    
    // 点击技能展开按钮
    await page.click('.skills-expand-btn');
    
    // 验证展开状态
    await expect(page.locator('.skills-detailed')).toBeVisible();
    
    // 点击收起
    await page.click('.skills-collapse-btn');
    
    // 验证收起状态
    await expect(page.locator('.skills-detailed')).not.toBeVisible();
  });

  test('应该支持图表交互', async ({ page }) => {
    await page.goto('http://localhost:4201/results/test-session-123');
    
    // 悬停雷达图
    await page.hover('.radar-chart-container');
    
    // 验证工具提示显示
    await expect(page.locator('.chart-tooltip')).toBeVisible();
    
    // 点击图例项
    await page.click('.chart-legend .legend-item:first-child');
    
    // 验证图表更新
    await expect(page.locator('.radar-chart-container')).toHaveAttribute('data-updated', 'true');
  });

  test('应该支持导出功能交互', async ({ page }) => {
    await page.goto('http://localhost:4201/results/test-session-123');
    
    // 模拟PDF导出
    const downloadPromise = page.waitForEvent('download');
    await page.click('.export-pdf-btn');
    
    // 验证下载开始
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});