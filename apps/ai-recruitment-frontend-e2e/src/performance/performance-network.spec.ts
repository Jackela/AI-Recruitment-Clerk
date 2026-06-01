import { test, expect } from '@playwright/test';
import {
  measureNetworkRequests,
  measurePerformance,
  clearPerformanceEntries,
  PERFORMANCE_BUDGETS,
} from '../utils/performance';

test.describe('网络性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('网络请求基础性能', async ({ page }) => {
    await page.goto('/');

    const networkMetrics = await measureNetworkRequests(page);

    console.log('网络请求基础性能:', {
      总请求数: networkMetrics.totalRequests,
      总大小: `${(networkMetrics.totalSize / 1024).toFixed(2)}KB`,
      请求类型分布: networkMetrics.requestsByType,
    });

    // 验证网络请求数量在合理范围内
    expect(networkMetrics.totalRequests).toBeLessThan(100); // 不应超过100个请求
    expect(networkMetrics.totalSize).toBeLessThan(
      PERFORMANCE_BUDGETS.homepage.size,
    );
  });

  test('首页资源加载优化', async ({ page }) => {
    const resourceTimings: Record<
      string,
      { count: number; totalSize: number; avgDuration: number }
    > = {};

    // 监听所有请求
    page.on('requestfinished', async (request) => {
      const response = await request.response();
      if (response) {
        const url = request.url();
        const type = url.split('.').pop()?.split('?')[0] || 'unknown';
        const timing = await response.json().catch(() => null);

        if (!resourceTimings[type]) {
          resourceTimings[type] = { count: 0, totalSize: 0, avgDuration: 0 };
        }
        resourceTimings[type].count++;
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    const networkMetrics = await measureNetworkRequests(page);

    console.log('首页资源加载:', {
      资源类型分布: networkMetrics.requestsByType,
      最慢请求: networkMetrics.slowestRequests.slice(0, 5).map((r) => ({
        url: r.url.split('/').pop(),
        duration: `${r.duration.toFixed(2)}ms`,
      })),
    });

    // 关键资源（如JS/CSS）应快速加载
    const jsRequests = networkMetrics.slowestRequests.filter(
      (r) =>
        r.url.includes('.js') ||
        r.url.includes('.css') ||
        r.url.includes('.woff'),
    );

    for (const req of jsRequests.slice(0, 10)) {
      // 关键资源加载时间应小于500ms
      expect(req.duration).toBeLessThan(500);
    }
  });

  test('API请求响应时间', async ({ page }) => {
    await page.goto('/jobs');

    const apiTimings: Array<{ endpoint: string; duration: number }> = [];

    // 监听API请求
    page.on('requestfinished', async (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        const response = await request.response();
        if (response) {
          const timing = await page.evaluate((requestUrl) => {
            const entries = performance.getEntriesByType(
              'resource',
            ) as PerformanceResourceTiming[];
            const entry = entries.find((e) => e.name === requestUrl);
            return entry ? entry.responseEnd - entry.startTime : 0;
          }, url);

          apiTimings.push({
            endpoint: url.split('/api/')[1] || url,
            duration: timing,
          });
        }
      }
    });

    // 等待页面加载和API调用
    await page.waitForTimeout(3000);

    console.log('API请求响应时间:', {
      API调用数: apiTimings.length,
      平均响应时间: apiTimings.length
        ? `${(apiTimings.reduce((a, b) => a + b.duration, 0) / apiTimings.length).toFixed(2)}ms`
        : 'N/A',
      最慢API: apiTimings.sort((a, b) => b.duration - a.duration).slice(0, 5),
    });

    // API响应应快速
    for (const api of apiTimings) {
      expect(api.duration).toBeLessThan(2000); // API应在2秒内响应
    }
  });

  test('CDN缓存验证', async ({ page }) => {
    const cacheResults: Array<{
      url: string;
      cached: boolean;
      size: number;
    }> = [];

    page.on('requestfinished', async (request) => {
      const response = await request.response();
      if (response) {
        const headers = response.headers();
        const url = request.url();

        // 检查缓存头
        const isCached =
          headers['x-cache']?.includes('HIT') ||
          headers['cf-cache-status']?.includes('HIT') ||
          headers['age'] !== undefined;

        cacheResults.push({
          url: url.split('/').pop() || url,
          cached: isCached,
          size: parseInt(headers['content-length'] || '0', 10),
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // 再次访问，检查缓存
    await page.reload({ waitUntil: 'networkidle' });

    console.log('CDN缓存验证:', {
      总请求数: cacheResults.length,
      缓存命中数: cacheResults.filter((r) => r.cached).length,
      缓存命中率: `${((cacheResults.filter((r) => r.cached).length / cacheResults.length) * 100).toFixed(1)}%`,
    });

    // 静态资源应有缓存
    const staticResources = cacheResults.filter(
      (r) => r.url.includes('.js') || r.url.includes('.css'),
    );

    if (staticResources.length > 0) {
      const cachedCount = staticResources.filter((r) => r.cached).length;
      const cacheRate = cachedCount / staticResources.length;

      // 静态资源缓存率应超过50%
      expect(cacheRate).toBeGreaterThan(0.5);
    }
  });

  test('资源加载顺序优化', async ({ page }) => {
    const loadOrder: Array<{
      url: string;
      type: string;
      startTime: number;
      priority: string;
    }> = [];

    await page.route('**/*', async (route) => {
      const request = route.request();
      const url = request.url();

      // 记录加载顺序
      const startTime = await page.evaluate(() => performance.now());
      loadOrder.push({
        url: url.split('/').pop() || url,
        type: request.resourceType(),
        startTime,
        priority: request.headers()['priority'] || 'normal',
      });

      await route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // 分析加载顺序
    const criticalResources = loadOrder.filter(
      (r) =>
        r.type === 'document' || r.type === 'stylesheet' || r.type === 'script',
    );

    console.log('资源加载顺序:', {
      关键资源数: criticalResources.length,
      最早加载的5个资源: loadOrder
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, 5)
        .map((r) => ({
          url: r.url,
          type: r.type,
          时间: `${r.startTime.toFixed(2)}ms`,
        })),
    });

    // CSS应在JS之前加载
    const firstCss = loadOrder.find((r) => r.type === 'stylesheet')?.startTime;
    const firstJs = loadOrder.find(
      (r) => r.type === 'script' && r.priority === 'high',
    )?.startTime;

    if (firstCss && firstJs) {
      // 高优先级CSS应在关键JS之前或同时加载
      expect(firstCss).toBeLessThanOrEqual(firstJs + 100);
    }
  });

  test('图片优化验证', async ({ page }) => {
    const imageMetrics: Array<{
      url: string;
      size: number;
      type: string;
      width: number;
      height: number;
    }> = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        const headers = response.headers();
        imageMetrics.push({
          url: url.split('/').pop() || url,
          size: parseInt(headers['content-length'] || '0', 10),
          type: headers['content-type'] || 'unknown',
          width: 0,
          height: 0,
        });
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    console.log('图片优化:', {
      图片数量: imageMetrics.length,
      总大小: `${(imageMetrics.reduce((a, b) => a + b.size, 0) / 1024).toFixed(2)}KB`,
      平均大小: imageMetrics.length
        ? `${(imageMetrics.reduce((a, b) => a + b.size, 0) / imageMetrics.length / 1024).toFixed(2)}KB`
        : 'N/A',
      格式分布: imageMetrics.reduce(
        (acc, img) => {
          const format = img.type.split('/')[1] || 'unknown';
          acc[format] = (acc[format] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    });

    // 图片应优化（使用现代格式或合理压缩）
    for (const img of imageMetrics) {
      if (img.type.includes('png') || img.type.includes('jpg')) {
        // PNG/JPG文件应小于500KB
        expect(img.size).toBeLessThan(500 * 1024);
      }
    }
  });

  test('预加载和预连接优化', async ({ page }) => {
    await page.goto('/');

    const preloadHints = await page.evaluate(() => {
      const hints: Array<{ rel: string; href: string; as?: string }> = [];
      document.querySelectorAll('link[rel]').forEach((link) => {
        const rel = link.getAttribute('rel');
        if (
          rel &&
          (rel.includes('preload') ||
            rel.includes('preconnect') ||
            rel.includes('prefetch'))
        ) {
          hints.push({
            rel,
            href: link.getAttribute('href') || '',
            as: link.getAttribute('as') || undefined,
          });
        }
      });
      return hints;
    });

    console.log('预加载优化:', {
      预加载提示数: preloadHints.length,
      提示类型: preloadHints.map((h) => `${h.rel} (${h.as || 'N/A'})`),
    });

    // 关键资源应有预加载提示
    const hasFontPreload = preloadHints.some(
      (h) => h.rel === 'preload' && h.as === 'font',
    );
    const hasCssPreload = preloadHints.some(
      (h) => h.rel === 'preload' && h.as === 'style',
    );

    // 期望有字体预加载
    expect(hasFontPreload).toBe(true);
  });

  test('慢网络条件下的性能', async ({ page, context }) => {
    // 模拟慢3G网络
    const client = await context.newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (500 * 1024) / 8, // 500kbps
      uploadThroughput: (500 * 1024) / 8,
      latency: 200,
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log('慢网络条件下的性能:', {
      加载时间: `${loadTime}ms`,
      网络条件: 'Slow 3G (500kbps, 200ms latency)',
    });

    // 即使在慢网络下，LCP也应在一个合理的时间
    expect(loadTime).toBeLessThan(15000); // 15秒

    // 恢复网络
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });
  });

  test('请求失败率监测', async ({ page }) => {
    const requestStats = {
      total: 0,
      success: 0,
      failed: 0,
    };

    page.on('requestfinished', async (request) => {
      requestStats.total++;
      const response = await request.response();
      if (response && response.status() < 400) {
        requestStats.success++;
      } else {
        requestStats.failed++;
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    console.log('请求失败率:', {
      总请求: requestStats.total,
      成功: requestStats.success,
      失败: requestStats.failed,
      成功率: requestStats.total
        ? `${((requestStats.success / requestStats.total) * 100).toFixed(1)}%`
        : 'N/A',
    });

    // 请求失败率应低于5%
    if (requestStats.total > 0) {
      const failureRate = requestStats.failed / requestStats.total;
      expect(failureRate).toBeLessThan(0.05);
    }
  });
});
