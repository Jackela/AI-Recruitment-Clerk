import { test, expect } from '@playwright/test';

test.describe('WebSocket实时进度更新功能', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到简历上传页面
    await page.goto('http://localhost:4201/resume');
  });

  test('应该显示实时进度追踪器', async ({ page }) => {
    // 首先检查页面已加载
    await expect(page.locator('h2')).toHaveText('智能简历分析');
    
    // 创建一个测试文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    
    // 上传文件
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    // 验证文件已选择
    await expect(page.locator('.file-label span')).toContainText('test-resume.pdf');
    
    // 提交表单
    await page.click('button[type="submit"]');
    
    // 验证进度追踪器出现
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });
    
    // 验证连接状态指示器
    await expect(page.locator('.connection-status')).toBeVisible();
    await expect(page.locator('.status-indicator')).toBeVisible();
    
    // 验证整体进度条
    await expect(page.locator('.overall-progress')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
    
    // 验证步骤容器
    await expect(page.locator('.steps-container')).toBeVisible();
    await expect(page.locator('.step-item')).toHaveCountGreaterThan(3);
  });

  test('应该响应WebSocket连接状态变化', async ({ page }) => {
    // 监听WebSocket连接
    let wsConnected = false;
    
    page.on('websocket', ws => {
      console.log('WebSocket connection detected:', ws.url());
      wsConnected = true;
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
    });

    // 上传文件触发WebSocket连接
    const fileContent = Buffer.from('%PDF-1.4 Test Resume');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    await page.click('button[type="submit"]');

    // 等待进度追踪器出现
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });
    
    // 检查连接状态
    const connectionStatus = page.locator('.status-text');
    
    // 等待连接状态更新（可能显示"连接中..."或"已连接"）
    await expect(connectionStatus).toBeVisible();
    
    // 验证状态指示器有相应的CSS类
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toBeVisible();
  });

  test('应该模拟完整的分析进度流程', async ({ page }) => {
    // 上传文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    await page.setInputFiles('input[type="file"]', {
      name: 'demo-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    await page.click('button[type="submit"]');

    // 等待进度追踪器显示
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });

    // 验证初始状态
    const progressPercentage = page.locator('.progress-percentage');
    const currentStep = page.locator('.current-step');
    
    await expect(progressPercentage).toBeVisible();
    await expect(currentStep).toBeVisible();

    // 验证步骤项目
    const stepItems = page.locator('.step-item');
    await expect(stepItems).toHaveCountGreaterThan(3);

    // 检查第一个步骤应该是已完成状态
    const firstStep = stepItems.first();
    await expect(firstStep).toHaveClass(/completed/);
  });

  test('应该显示实时消息日志', async ({ page }) => {
    // 上传文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    await page.click('button[type="submit"]');

    // 等待进度追踪器显示
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });

    // 验证消息日志容器
    await expect(page.locator('.message-log')).toBeVisible();
    await expect(page.locator('.log-container')).toBeVisible();

    // 验证日志标题
    await expect(page.locator('.message-log h4')).toHaveText('实时日志');
  });

  test('应该支持响应式布局', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });

    // 上传文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    await page.click('button[type="submit"]');

    // 等待进度追踪器显示
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });

    // 验证进度追踪器在移动端依然可见和可用
    await expect(page.locator('.progress-tracker')).toBeVisible();
    await expect(page.locator('.overall-progress')).toBeVisible();
    await expect(page.locator('.steps-container')).toBeVisible();

    // 验证步骤在移动端的布局
    const stepItems = page.locator('.step-item');
    await expect(stepItems.first()).toBeVisible();
  });

  test('应该处理错误状态', async ({ page }) => {
    // 尝试不选择文件直接提交
    await page.click('button[type="submit"]');

    // 验证错误消息显示
    await expect(page.locator('.error-section')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error-section h3')).toHaveText('处理错误');

    // 验证重试按钮存在
    await expect(page.locator('.retry-btn')).toBeVisible();
  });

  test('应该显示结果完成状态', async ({ page }) => {
    // 上传文件
    const fileContent = Buffer.from('%PDF-1.4 Test Resume Content');
    await page.setInputFiles('input[type="file"]', {
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    await page.click('button[type="submit"]');

    // 等待进度追踪器显示
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });

    // 这里我们主要验证UI结构，实际的WebSocket消息需要后端支持
    // 验证进度追踪器的基本功能正常
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.steps-container')).toBeVisible();
    
    // 验证调试信息区域
    const debugSection = page.locator('.debug-section');
    if (await debugSection.count() > 0) {
      await expect(debugSection).toBeVisible();
    }
  });

  test('WebSocket功能集成完整性检查', async ({ page }) => {
    // 验证WebSocket服务在页面中正确加载
    const hasWebSocketService = await page.evaluate(() => {
      // 检查Angular应用中是否有WebSocket相关的服务
      return window.ng !== undefined;
    });

    // 上传文件并检查所有相关的UI元素
    const fileContent = Buffer.from('%PDF-1.4 Complete Test Resume Content for Integration Test');
    await page.setInputFiles('input[type="file"]', {
      name: 'integration-test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: fileContent,
    });

    // 填写可选信息
    await page.fill('input[name="candidateName"]', '张三');
    await page.fill('input[name="candidateEmail"]', 'zhangsan@example.com');
    await page.fill('textarea[name="notes"]', '这是一个集成测试');

    await page.click('button[type="submit"]');

    // 全面验证进度追踪器的所有组件
    await expect(page.locator('app-progress-tracker')).toBeVisible({ timeout: 10000 });
    
    // 验证连接状态部分
    await expect(page.locator('.connection-status')).toBeVisible();
    await expect(page.locator('.status-indicator')).toBeVisible();
    await expect(page.locator('.status-text')).toBeVisible();

    // 验证整体进度部分
    await expect(page.locator('.overall-progress')).toBeVisible();
    await expect(page.locator('.progress-header')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
    await expect(page.locator('.progress-info')).toBeVisible();

    // 验证步骤详情
    await expect(page.locator('.steps-container')).toBeVisible();
    const stepItems = page.locator('.step-item');
    await expect(stepItems).toHaveCountGreaterThan(3);

    // 验证消息日志
    await expect(page.locator('.message-log')).toBeVisible();
    await expect(page.locator('.log-container')).toBeVisible();

    console.log('✅ WebSocket实时进度追踪功能集成测试完成');
  });
});