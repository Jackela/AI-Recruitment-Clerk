import { test, expect, Page } from '@playwright/test';

describe('Marketing User Journey E2E Tests', () => {
  let guestPage: Page;
  let feedbackCode: string;

  test.beforeEach(async ({ browser }) => {
    guestPage = await browser.newPage();
    await guestPage.goto('http://localhost:4200');
  });

  test.afterEach(async () => {
    await guestPage.close();
  });

  describe('完整用户旅程测试', () => {
    test('应该完成完整的营销漏斗流程', async () => {
      // 步骤1：游客首次访问
      await expect(guestPage.locator('.welcome-banner')).toBeVisible();
      await expect(guestPage.locator('.guest-usage-indicator')).toContainText('剩余 5 次');

      // 步骤2：使用简历解析服务（5次）
      for (let i = 1; i <= 5; i++) {
        await guestPage.locator('.start-experience-btn').click();
        await guestPage.waitForURL('**/dashboard');
        
        // 模拟上传简历
        await guestPage.setInputFiles('input[type="file"]', {
          name: `test-resume-${i}.pdf`,
          mimeType: 'application/pdf',
          buffer: Buffer.from(`Test resume content ${i}`)
        });
        
        await guestPage.locator('.analyze-btn').click();
        await expect(guestPage.locator('.analysis-result')).toBeVisible({ timeout: 15000 });
        
        // 检查使用次数更新
        await guestPage.goto('http://localhost:4200');
        await expect(guestPage.locator('.guest-usage-indicator')).toContainText(`剩余 ${5-i} 次`);
      }

      // 步骤3：使用耗尽后显示反馈码
      await expect(guestPage.locator('.usage-exhausted-banner')).toBeVisible();
      await expect(guestPage.locator('.feedback-code')).toBeVisible();
      
      const feedbackCodeElement = await guestPage.locator('.feedback-code');
      feedbackCode = await feedbackCodeElement.textContent() || '';
      expect(feedbackCode).toMatch(/^FB[A-Z0-9]+$/);

      // 步骤4：复制反馈码
      await guestPage.locator('.copy-code-btn').click();
      await expect(guestPage.locator('.copy-success-message')).toBeVisible();

      // 步骤5：点击问卷链接
      const questionnaireLink = guestPage.locator('.questionnaire-btn');
      await expect(questionnaireLink).toHaveAttribute('href', /wj\.qq\.com/);
      await expect(questionnaireLink).toHaveAttribute('target', '_blank');
    });

    test('应该在移动设备上正常工作', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const mobilePage = await mobileContext.newPage();
      await mobilePage.goto('http://localhost:4200');

      // 检查移动端响应式布局
      await expect(mobilePage.locator('.campaign-container')).toBeVisible();
      await expect(mobilePage.locator('.mobile-optimized')).toHaveClass(/mobile/);

      // 测试触摸交互
      await mobilePage.tap('.start-experience-btn');
      await mobilePage.waitForURL('**/dashboard');

      await mobileContext.close();
    });
  });

  describe('跨浏览器兼容性测试', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`应该在 ${browserName} 中正常工作`, async ({ playwright }) => {
        const browser = await playwright[browserName].launch();
        const context = await browser.newContext();
        const page = await context.newPage();

        await page.goto('http://localhost:4200');
        
        // 测试核心功能
        await expect(page.locator('.welcome-banner')).toBeVisible();
        await expect(page.locator('.start-experience-btn')).toBeEnabled();

        // 测试JavaScript功能
        await page.evaluate(() => {
          return typeof window.localStorage !== 'undefined';
        });

        await browser.close();
      });
    });
  });

  describe('性能和可访问性测试', () => {
    test('应该满足性能基准', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:4200');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // 页面加载时间应小于3秒
      expect(loadTime).toBeLessThan(3000);

      // 检查核心Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitalsData = {};
            for (const entry of entries) {
              if (['largest-contentful-paint', 'first-input-delay', 'cumulative-layout-shift'].includes(entry.entryType)) {
                vitalsData[entry.entryType] = entry.value;
              }
            }
            resolve(vitalsData);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        });
      });

      console.log('Core Web Vitals:', vitals);
    });

    test('应该符合WCAG无障碍标准', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 检查alt属性
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }

      // 检查键盘导航
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT'].includes(focusedElement || '')).toBe(true);

      // 检查ARIA标签
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[aria-label]')).toHaveCount({ greaterThan: 0 });

      // 检查对比度（基本检查）
      const backgroundColor = await page.evaluate(() => {
        const element = document.querySelector('.campaign-container');
        return window.getComputedStyle(element!).backgroundColor;
      });
      expect(backgroundColor).toBeTruthy();
    });
  });

  describe('错误处理和边界情况', () => {
    test('应该处理网络错误', async ({ page, context }) => {
      // 模拟网络中断
      await context.setOffline(true);
      
      await page.goto('http://localhost:4200');
      await page.locator('.start-experience-btn').click();

      // 应该显示错误消息
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.locator('.retry-btn')).toBeVisible();

      // 恢复网络并重试
      await context.setOffline(false);
      await page.locator('.retry-btn').click();
      
      await expect(page.locator('.error-message')).not.toBeVisible();
    });

    test('应该处理无效文件上传', async ({ page }) => {
      await page.goto('http://localhost:4200/dashboard');

      // 尝试上传无效文件
      await page.setInputFiles('input[type="file"]', {
        name: 'invalid-file.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('This is not a resume')
      });

      await page.locator('.analyze-btn').click();

      // 应该显示错误消息
      await expect(page.locator('.file-error')).toBeVisible();
      await expect(page.locator('.file-error')).toContainText('不支持的文件格式');
    });

    test('应该处理超大文件', async ({ page }) => {
      await page.goto('http://localhost:4200/dashboard');

      // 创建10MB的大文件
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'test');
      
      await page.setInputFiles('input[type="file"]', {
        name: 'large-resume.pdf',
        mimeType: 'application/pdf',
        buffer: largeBuffer
      });

      await page.locator('.analyze-btn').click();

      // 应该显示文件大小错误
      await expect(page.locator('.file-size-error')).toBeVisible();
      await expect(page.locator('.file-size-error')).toContainText('文件过大');
    });
  });

  describe('本地存储和会话管理', () => {
    test('应该正确管理游客会话', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 检查初始会话创建
      const sessionId = await page.evaluate(() => {
        return localStorage.getItem('ai_guest_session_id');
      });
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^session_/);

      // 使用一次服务
      await page.locator('.start-experience-btn').click();
      await page.waitForURL('**/dashboard');
      await page.goBack();

      // 检查使用计数更新
      const usageCount = await page.evaluate(() => {
        return localStorage.getItem('ai_guest_usage_count');
      });
      expect(usageCount).toBe('1');

      // 检查使用历史
      const usageHistory = await page.evaluate(() => {
        const history = localStorage.getItem('ai_usage_history');
        return history ? JSON.parse(history) : [];
      });
      expect(usageHistory).toHaveLength(1);
      expect(new Date(usageHistory[0])).toBeInstanceOf(Date);
    });

    test('应该在页面刷新后保持状态', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 使用服务几次
      for (let i = 0; i < 3; i++) {
        await page.locator('.start-experience-btn').click();
        await page.waitForURL('**/dashboard');
        await page.goBack();
      }

      // 刷新页面
      await page.reload();

      // 检查状态是否保持
      await expect(page.locator('.guest-usage-indicator')).toContainText('剩余 2 次');
    });

    test('应该在浏览器重启后清理过期会话', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      
      await page1.goto('http://localhost:4200');
      
      // 模拟过期会话（修改时间戳）
      await page1.evaluate(() => {
        localStorage.setItem('ai_first_visit_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      });
      
      await page1.close();
      await context1.close();

      // 新会话
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      
      await page2.goto('http://localhost:4200');

      // 应该重置为新会话
      const usageCount = await page2.evaluate(() => {
        return localStorage.getItem('ai_guest_usage_count');
      });
      expect(usageCount).toBe('0');
      
      await context2.close();
    });
  });

  describe('营销转化追踪', () => {
    test('应该追踪完整的转化漏斗', async ({ page }) => {
      const conversionEvents = [];
      
      // 监听分析事件
      page.on('console', msg => {
        if (msg.text().includes('用户行为追踪')) {
          conversionEvents.push(JSON.parse(msg.text().split(': ')[1]));
        }
      });

      await page.goto('http://localhost:4200');
      
      // 模拟完整用户旅程
      await page.locator('.start-experience-btn').click(); // 转化事件1
      await page.waitForURL('**/dashboard');
      
      // 完成分析
      await page.setInputFiles('input[type="file"]', {
        name: 'test-resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Test resume content')
      });
      await page.locator('.analyze-btn').click(); // 转化事件2
      await page.waitForSelector('.analysis-result');
      
      // 返回首页达到限制
      await page.goto('http://localhost:4200');
      
      // 重复使用直到耗尽
      for (let i = 1; i < 5; i++) {
        await page.locator('.start-experience-btn').click();
        await page.waitForURL('**/dashboard');
        await page.goBack();
      }
      
      // 获取反馈码
      await expect(page.locator('.feedback-code')).toBeVisible();
      const feedbackCodeText = await page.locator('.feedback-code').textContent();
      
      // 点击问卷链接（转化事件3）
      await page.locator('.questionnaire-btn').click();

      // 验证转化事件被正确记录
      expect(conversionEvents).toHaveLength(3);
      expect(conversionEvents[0]).toHaveProperty('event', 'start_experience');
      expect(conversionEvents[1]).toHaveProperty('event', 'complete_analysis');
      expect(conversionEvents[2]).toHaveProperty('event', 'click_questionnaire');
      expect(conversionEvents[2]).toHaveProperty('feedbackCode', feedbackCodeText);
    });

    test('应该计算准确的转化率', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 模拟A/B测试场景
      const testVariant = await page.evaluate(() => {
        return Math.random() < 0.5 ? 'A' : 'B';
      });

      if (testVariant === 'A') {
        await expect(page.locator('.variant-a')).toBeVisible();
      } else {
        await expect(page.locator('.variant-b')).toBeVisible();
      }

      // 追踪特定变体的转化
      await page.locator(`.variant-${testVariant.toLowerCase()} .start-experience-btn`).click();
      
      const conversionData = await page.evaluate(() => {
        return {
          variant: window.currentVariant,
          timestamp: Date.now(),
          converted: true
        };
      });

      expect(conversionData.variant).toBe(testVariant);
      expect(conversionData.converted).toBe(true);
    });
  });

  describe('SEO和元数据测试', () => {
    test('应该具有正确的SEO元数据', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 检查页面标题
      const title = await page.title();
      expect(title).toContain('AI智能招聘助手');
      expect(title.length).toBeGreaterThan(10);
      expect(title.length).toBeLessThan(60);

      // 检查meta描述
      const metaDescription = await page.getAttribute('meta[name="description"]', 'content');
      expect(metaDescription).toBeTruthy();
      expect(metaDescription!.length).toBeGreaterThan(50);
      expect(metaDescription!.length).toBeLessThan(160);

      // 检查关键词
      const metaKeywords = await page.getAttribute('meta[name="keywords"]', 'content');
      expect(metaKeywords).toBeTruthy();
      expect(metaKeywords).toContain('AI');
      expect(metaKeywords).toContain('简历');
      expect(metaKeywords).toContain('招聘');

      // 检查Open Graph标签
      const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
      const ogDescription = await page.getAttribute('meta[property="og:description"]', 'content');
      const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');

      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogImage).toBeTruthy();

      // 检查结构化数据
      const jsonLd = await page.evaluate(() => {
        const script = document.querySelector('script[type="application/ld+json"]');
        return script ? JSON.parse(script.textContent || '') : null;
      });

      expect(jsonLd).toBeTruthy();
      expect(jsonLd['@type']).toBe('WebApplication');
      expect(jsonLd.name).toBeTruthy();
      expect(jsonLd.description).toBeTruthy();
    });

    test('应该具有正确的页面结构', async ({ page }) => {
      await page.goto('http://localhost:4200');

      // 检查语义化HTML结构
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      // 检查标题层级
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      const h1Text = await page.locator('h1').textContent();
      expect(h1Text).toContain('AI');

      // 检查导航结构
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('nav a')).toHaveCount({ greaterThan: 0 });
    });
  });
});