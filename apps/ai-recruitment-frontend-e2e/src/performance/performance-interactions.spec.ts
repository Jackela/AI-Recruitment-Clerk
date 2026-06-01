import { test, expect } from '@playwright/test';
import {
  measureInteractionLatency,
  measureInputDelay,
  measureFrameRate,
  clearPerformanceEntries,
} from '../utils/performance';

test.describe('交互性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('点击响应时间 - 导航菜单', async ({ page }) => {
    await page.goto('/');

    // 测试导航链接点击响应
    const navLinks = [
      { selector: '[data-testid="nav-home"]', name: '首页' },
      { selector: '[data-testid="nav-jobs"]', name: '岗位' },
      { selector: '[data-testid="nav-analysis"]', name: '分析' },
    ];

    for (const link of navLinks) {
      // 等待元素可见和可点击
      await page.waitForSelector(link.selector, { state: 'visible' });

      const latency = await measureInteractionLatency(
        page,
        link.selector,
        'click',
      );

      console.log(`${link.name}点击响应:`, {
        持续时间: `${latency.duration}ms`,
      });

      // 点击响应应在100ms内
      expect(latency.duration).toBeLessThan(100);

      // 返回首页继续测试
      await page.goto('/');
    }
  });

  test('点击响应时间 - 按钮交互', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="create-job-button"]', {
      state: 'visible',
    });

    const buttons = [
      { selector: '[data-testid="create-job-button"]', name: '创建岗位按钮' },
      { selector: '[data-testid="filter-button"]', name: '筛选按钮' },
    ];

    for (const btn of buttons) {
      const exists = await page.locator(btn.selector).count();
      if (exists > 0) {
        const latency = await measureInteractionLatency(
          page,
          btn.selector,
          'click',
        );

        console.log(`${btn.name}点击响应:`, {
          持续时间: `${latency.duration}ms`,
        });

        expect(latency.duration).toBeLessThan(150);
      }
    }
  });

  test('输入延迟 - 表单字段', async ({ page }) => {
    await page.goto('/jobs/new');

    const formFields = [
      { selector: '[data-testid="job-title"]', name: '岗位标题' },
      { selector: '[data-testid="job-location"]', name: '工作地点' },
    ];

    for (const field of formFields) {
      const exists = await page.locator(field.selector).count();
      if (exists > 0) {
        const testText = '这是一个测试文本输入内容';
        const result = await measureInputDelay(page, field.selector, testText);

        console.log(`${field.name}输入延迟:`, {
          总时间: `${result.duration}ms`,
          每秒字符数: result.charsPerSecond.toFixed(1),
        });

        // 输入应流畅，每秒至少50个字符
        expect(result.charsPerSecond).toBeGreaterThan(50);
      }
    }
  });

  test('输入延迟 - 搜索框实时响应', async ({ page }) => {
    await page.goto('/jobs');

    const searchExists = await page
      .locator('[data-testid="search-input"]')
      .count();

    if (searchExists > 0) {
      const searchResults: Array<{
        charCount: number;
        duration: number;
        hasResults: boolean;
      }> = [];

      // 逐步输入并测量响应
      const searchTerm = '软件工程师';
      for (let i = 1; i <= searchTerm.length; i++) {
        const partial = searchTerm.slice(0, i);
        const startTime = Date.now();

        await page.fill('[data-testid="search-input"]', partial);

        // 等待搜索结果更新
        await page.waitForTimeout(100);

        const duration = Date.now() - startTime;
        const hasResults = await page
          .locator('[data-testid="search-result"]')
          .count()
          .then((c) => c > 0);

        searchResults.push({
          charCount: i,
          duration,
          hasResults,
        });
      }

      console.log('搜索框实时响应:', searchResults);

      // 搜索响应应快速
      for (const result of searchResults) {
        expect(result.duration).toBeLessThan(300);
      }
    }
  });

  test('悬停响应时间', async ({ page }) => {
    await page.goto('/jobs');

    const hoverElements = [
      { selector: '[data-testid="job-card"]:first-child', name: '岗位卡片' },
      { selector: '[data-testid="nav-menu-item"]:first-child', name: '导航项' },
    ];

    for (const element of hoverElements) {
      const exists = await page.locator(element.selector).count();
      if (exists > 0) {
        const latency = await measureInteractionLatency(
          page,
          element.selector,
          'hover',
        );

        console.log(`${element.name}悬停响应:`, {
          持续时间: `${latency.duration}ms`,
        });

        // 悬停响应应在50ms内
        expect(latency.duration).toBeLessThan(50);
      }
    }
  });

  test('动画帧率 - 页面滚动', async ({ page }) => {
    await page.goto('/jobs');

    // 确保页面有足够内容可滚动
    await page.waitForTimeout(1000);

    // 开始测量帧率
    const frameRatePromise = measureFrameRate(page, 3000);

    // 执行滚动动画
    await page.evaluate(() => {
      const duration = 3000;
      const start = performance.now();
      const startY = window.scrollY;
      const endY = document.body.scrollHeight - window.innerHeight;

      const scroll = () => {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        window.scrollTo(0, startY + (endY - startY) * easeProgress);

        if (progress < 1) {
          requestAnimationFrame(scroll);
        }
      };

      requestAnimationFrame(scroll);
    });

    const frameRate = await frameRatePromise;

    console.log('滚动动画帧率:', {
      平均FPS: frameRate.averageFps.toFixed(1),
      最低FPS: frameRate.minFps.toFixed(1),
      最高FPS: frameRate.maxFps.toFixed(1),
    });

    // 滚动动画应保持60fps或接近
    expect(frameRate.averageFps).toBeGreaterThan(30);
    expect(frameRate.minFps).toBeGreaterThan(20);
  });

  test('动画帧率 - 模态框打开/关闭', async ({ page }) => {
    await page.goto('/jobs');

    const frameRatePromise = measureFrameRate(page, 2000);

    // 打开模态框
    await page.click('[data-testid="create-job-button"]');
    await page.waitForTimeout(500);

    // 关闭模态框
    await page.click('[data-testid="close-modal"]');

    const frameRate = await frameRatePromise;

    console.log('模态框动画帧率:', {
      平均FPS: frameRate.averageFps.toFixed(1),
      最低FPS: frameRate.minFps.toFixed(1),
    });

    // 模态框动画应流畅
    expect(frameRate.averageFps).toBeGreaterThan(30);
  });

  test('列表滚动性能', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-list"]', {
      state: 'visible',
    });

    const scrollMetrics: Array<{
      timestamp: number;
      scrollY: number;
      frameCount: number;
    }> = [];

    // 监听滚动事件
    await page.evaluate(() => {
      let frameCount = 0;
      const countFrames = () => {
        frameCount++;
        requestAnimationFrame(countFrames);
      };
      requestAnimationFrame(countFrames);

      window.addEventListener('scroll', () => {
        (window as unknown as Record<string, unknown>).scrollMetrics.push({
          timestamp: performance.now(),
          scrollY: window.scrollY,
          frameCount,
        });
      });

      (window as unknown as Record<string, unknown>).scrollMetrics = [];
      (window as unknown as Record<string, unknown>).getFrameCount = () =>
        frameCount;
    });

    // 执行快速滚动
    await page.mouse.move(500, 500);
    await page.mouse.wheel(0, 5000);
    await page.waitForTimeout(500);

    const metrics = await page.evaluate(() => {
      return {
        data: (window as unknown as Record<string, unknown>)
          .scrollMetrics as Array<{
          timestamp: number;
          scrollY: number;
          frameCount: number;
        }>,
        totalFrames: (
          window as unknown as Record<string, () => number>
        ).getFrameCount(),
      };
    });

    console.log('列表滚动性能:', {
      滚动事件数: metrics.data.length,
      总帧数: metrics.totalFrames,
      平均每事件帧数: metrics.data.length
        ? (metrics.totalFrames / metrics.data.length).toFixed(1)
        : 'N/A',
    });

    // 滚动应流畅，有足够的事件处理
    expect(metrics.data.length).toBeGreaterThan(5);
  });

  test('复杂交互序列性能', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForTimeout(1000);

    const interactions = [
      {
        action: 'click',
        selector: '[data-testid="filter-button"]',
        name: '打开筛选',
      },
      {
        action: 'fill',
        selector: '[data-testid="search-input"]',
        value: '开发',
        name: '搜索',
      },
      {
        action: 'click',
        selector: '[data-testid="job-card"]:first-child',
        name: '选择卡片',
      },
      {
        action: 'click',
        selector: '[data-testid="close-detail"]',
        name: '关闭详情',
      },
    ];

    const timings: Array<{ name: string; duration: number }> = [];

    for (const interaction of interactions) {
      const startTime = Date.now();

      if (interaction.action === 'click') {
        const exists = await page.locator(interaction.selector).count();
        if (exists > 0) {
          await page.click(interaction.selector);
        }
      } else if (interaction.action === 'fill') {
        const exists = await page.locator(interaction.selector).count();
        if (exists > 0) {
          await page.fill(interaction.selector, interaction.value || '');
        }
      }

      const duration = Date.now() - startTime;
      timings.push({ name: interaction.name, duration });

      // 短暂等待UI更新
      await page.waitForTimeout(100);
    }

    console.log('复杂交互序列:', timings);

    // 所有交互都应快速响应
    for (const timing of timings) {
      expect(timing.duration).toBeLessThan(300);
    }

    // 总交互时间应合理
    const totalTime = timings.reduce((a, b) => a + b.duration, 0);
    expect(totalTime).toBeLessThan(2000);
  });

  test('首屏交互准备时间 (TTI近似)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // 等待关键元素可交互
    await page.waitForSelector('[data-testid="nav-home"]', {
      state: 'visible',
    });

    // 尝试点击一个元素来验证交互性
    const isInteractive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });

    const tti = Date.now() - startTime;

    console.log('可交互时间 (TTI近似):', {
      时间: `${tti}ms`,
      可交互: isInteractive,
    });

    // TTI应在5秒内
    expect(tti).toBeLessThan(5000);
    expect(isInteractive).toBe(true);
  });

  test('键盘导航性能', async ({ page }) => {
    await page.goto('/jobs');

    // 按Tab键导航
    const tabTimings: Array<{ element: string; time: number }> = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await page.keyboard.press('Tab');
      const duration = Date.now() - startTime;

      // 获取当前焦点元素
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? el.getAttribute('data-testid') || el.tagName : 'none';
      });

      tabTimings.push({ element: focusedElement, time: duration });
    }

    console.log('键盘导航性能:', tabTimings);

    // Tab导航应即时响应
    for (const timing of tabTimings) {
      expect(timing.time).toBeLessThan(50);
    }
  });
});
