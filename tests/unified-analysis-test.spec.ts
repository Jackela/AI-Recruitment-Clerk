import { test, expect } from '@playwright/test';

test.describe('统一分析页面功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到统一分析页面
    await page.goto('http://localhost:4201/analysis');
  });

  test('应该正确显示页面头部和主要元素', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('h1')).toHaveText('AI智能简历分析');
    await expect(page.locator('.subtitle')).toContainText('上传简历，获得专业的AI驱动分析报告');

    // 验证主要卡片存在
    await expect(page.locator('.upload-card')).toBeVisible();
    
    // 验证文件上传区域
    await expect(page.locator('.file-drop-zone')).toBeVisible();
    await expect(page.locator('.drop-content h3')).toHaveText('拖拽文件到这里');
    
    // 验证候选人信息表单
    await expect(page.locator('.info-section h3')).toHaveText('候选人信息 (可选)');
    await expect(page.locator('input[name="candidateName"]')).toBeVisible();
    await expect(page.locator('input[name="candidateEmail"]')).toBeVisible();
    await expect(page.locator('input[name="targetPosition"]')).toBeVisible();
    await expect(page.locator('textarea[name="notes"]')).toBeVisible();
    
    // 验证操作按钮
    await expect(page.locator('.primary-btn')).toContainText('开始AI分析');
    await expect(page.locator('.secondary-btn')).toContainText('查看演示');
  });

  test('应该显示侧边栏统计信息和提示', async ({ page }) => {
    // 验证侧边栏存在
    await expect(page.locator('.side-panel')).toBeVisible();
    
    // 验证统计卡片
    await expect(page.locator('.stats-card h3')).toContainText('使用统计');
    await expect(page.locator('.stat-item').first()).toBeVisible();
    
    // 验证提示卡片
    await expect(page.locator('.tips-card h3')).toContainText('使用提示');
    await expect(page.locator('.tips-list li').first()).toContainText('确保简历文件清晰完整');
  });

  test('应该支持文件选择功能', async ({ page }) => {
    // 创建测试文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content for Unified Analysis');
    
    // 上传文件
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    // 验证文件已选择
    await expect(page.locator('.file-selected')).toBeVisible();
    await expect(page.locator('.file-info h4')).toContainText('test-resume.pdf');
    await expect(page.locator('.file-info p')).toContainText('B'); // 文件大小显示
    
    // 验证移除按钮存在
    await expect(page.locator('.remove-btn')).toBeVisible();
    
    // 验证分析按钮已启用
    await expect(page.locator('.primary-btn')).not.toBeDisabled();
  });

  test('应该支持文件移除功能', async ({ page }) => {
    // 创建测试文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume');
    
    // 上传文件
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    // 验证文件已选择
    await expect(page.locator('.file-selected')).toBeVisible();
    
    // 点击移除按钮
    await page.click('.remove-btn');
    
    // 验证文件已移除
    await expect(page.locator('.file-selected')).not.toBeVisible();
    await expect(page.locator('.drop-content')).toBeVisible();
    
    // 验证分析按钮已禁用
    await expect(page.locator('.primary-btn')).toBeDisabled();
  });

  test('应该显示分析进度界面', async ({ page }) => {
    // 创建测试文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    
    // 填写表单信息
    await page.fill('input[name="candidateName"]', '张三');
    await page.fill('input[name="candidateEmail"]', 'zhangsan@example.com');
    await page.fill('input[name="targetPosition"]', '前端开发工程师');
    await page.fill('textarea[name="notes"]', '资深前端开发人员');
    
    // 上传文件
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    // 提交表单
    await page.click('.primary-btn');
    
    // 验证进度卡片出现
    await expect(page.locator('.progress-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.progress-card h2')).toContainText('正在分析');
    
    // 验证分析步骤
    await expect(page.locator('.steps-overview')).toBeVisible();
    const stepItems = page.locator('.step-item');
    await expect(stepItems).toHaveCount(5);
    
    // 验证第一个步骤标题
    await expect(stepItems.first().locator('.step-content h4')).toContainText('文件上传');
    
    // 验证进度追踪器集成
    await expect(page.locator('app-progress-tracker')).toBeVisible();
    
    // 验证取消按钮
    await expect(page.locator('.cancel-btn')).toBeVisible();
    await expect(page.locator('.cancel-btn')).toContainText('取消分析');
  });

  test('应该显示演示功能', async ({ page }) => {
    // 点击演示按钮
    await page.click('.secondary-btn');
    
    // 验证进度界面出现
    await expect(page.locator('.progress-card')).toBeVisible({ timeout: 10000 });
    
    // 验证分析步骤显示
    await expect(page.locator('.steps-overview')).toBeVisible();
    
    // 验证进度追踪器
    await expect(page.locator('app-progress-tracker')).toBeVisible();
  });

  test('应该处理无文件提交错误', async ({ page }) => {
    // 不选择文件直接提交
    await page.click('.primary-btn');
    
    // 验证错误状态或保持在上传界面
    // 由于按钮应该是禁用的，我们验证页面状态没有改变
    await expect(page.locator('.upload-card')).toBeVisible();
    await expect(page.locator('.primary-btn')).toBeDisabled();
  });

  test('应该支持响应式布局', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // 验证主要元素仍然可见
    await expect(page.locator('.header-section h1')).toBeVisible();
    await expect(page.locator('.upload-card')).toBeVisible();
    await expect(page.locator('.file-drop-zone')).toBeVisible();
    
    // 验证侧边栏在平板视图下的显示
    await expect(page.locator('.side-panel')).toBeVisible();
    
    // 设置手机视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 验证移动端布局
    await expect(page.locator('.header-section h1')).toBeVisible();
    await expect(page.locator('.upload-card')).toBeVisible();
    await expect(page.locator('.info-grid')).toBeVisible();
    
    // 验证按钮在移动端的布局
    await expect(page.locator('.action-section')).toBeVisible();
  });

  test('应该正确格式化文件大小', async ({ page }) => {
    // 创建不同大小的测试文件
    const smallFile = Buffer.from('Small file content');
    const mediumFile = Buffer.alloc(1024 * 5, 'Medium file content'); // 5KB
    const largeFile = Buffer.alloc(1024 * 1024 * 2, 'Large file content'); // 2MB
    
    // 测试小文件
    await page.setInputFiles('input[type="file"]', {
      name: 'small.pdf',
      mimeType: 'application/pdf',
      buffer: smallFile,
    });
    await expect(page.locator('.file-info p')).toContainText('B');
    
    // 测试中等文件
    await page.setInputFiles('input[type="file"]', {
      name: 'medium.pdf',
      mimeType: 'application/pdf',
      buffer: mediumFile,
    });
    await expect(page.locator('.file-info p')).toContainText('KB');
    
    // 测试大文件
    await page.setInputFiles('input[type="file"]', {
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: largeFile,
    });
    await expect(page.locator('.file-info p')).toContainText('MB');
  });

  test('应该支持取消分析功能', async ({ page }) => {
    // 创建测试文件并开始分析
    const fileContent = Buffer.from('%PDF-1.4 Test Resume');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });
    
    await page.click('.primary-btn');
    
    // 等待进度界面出现
    await expect(page.locator('.progress-card')).toBeVisible({ timeout: 10000 });
    
    // 点击取消按钮
    await page.click('.cancel-btn');
    
    // 验证回到上传界面
    await expect(page.locator('.upload-card')).toBeVisible();
    await expect(page.locator('.progress-card')).not.toBeVisible();
    
    // 验证表单状态重置
    await expect(page.locator('.file-selected')).not.toBeVisible();
    await expect(page.locator('.primary-btn')).toBeDisabled();
  });

  test('统一分析页面完整性检查', async ({ page }) => {
    // 验证页面基本结构
    await expect(page.locator('.analysis-container')).toBeVisible();
    await expect(page.locator('.header-section')).toBeVisible();
    await expect(page.locator('.content-grid')).toBeVisible();
    
    // 验证上传功能完整性
    await expect(page.locator('.upload-card')).toBeVisible();
    await expect(page.locator('.file-drop-zone')).toBeVisible();
    await expect(page.locator('.info-section')).toBeVisible();
    await expect(page.locator('.action-section')).toBeVisible();
    
    // 验证侧边栏功能
    await expect(page.locator('.side-panel')).toBeVisible();
    await expect(page.locator('.stats-card')).toBeVisible();
    await expect(page.locator('.tips-card')).toBeVisible();
    
    // 验证所有输入字段
    await expect(page.locator('input[name="candidateName"]')).toBeVisible();
    await expect(page.locator('input[name="candidateEmail"]')).toBeVisible();
    await expect(page.locator('input[name="targetPosition"]')).toBeVisible();
    await expect(page.locator('textarea[name="notes"]')).toBeVisible();
    
    // 验证按钮状态
    await expect(page.locator('.primary-btn')).toBeDisabled();
    await expect(page.locator('.secondary-btn')).not.toBeDisabled();
    
    console.log('✅ 统一分析页面功能完整性检查通过');
  });
});

test.describe('统一分析页面导航测试', () => {
  test('应该支持结果页面导航', async ({ page }) => {
    // 由于详细结果需要完整的分析流程，这里测试路由配置
    await page.goto('http://localhost:4201/results/test-session-123');
    
    // 验证详细结果页面加载
    await expect(page.locator('.results-container')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('h1')).toContainText('详细分析报告');
    await expect(page.locator('.subtitle')).toContainText('test-session-123');
    
    // 验证返回按钮
    await expect(page.locator('.back-btn')).toBeVisible();
    await expect(page.locator('.back-btn')).toContainText('返回分析');
    
    // 测试返回功能
    await page.click('.back-btn');
    
    // 验证返回到分析页面
    await expect(page.url()).toContain('/analysis');
    await expect(page.locator('.analysis-container')).toBeVisible();
  });
});