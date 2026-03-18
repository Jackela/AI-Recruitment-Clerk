import { test, expect } from '@playwright/test';
import {
  measureMemoryUsage,
  detectMemoryLeak,
  clearPerformanceEntries,
} from '../utils/performance';

test.describe('内存性能测试', () => {
  test.beforeEach(async ({ page }) => {
    await clearPerformanceEntries(page);
  });

  test('内存使用基准测试', async ({ page }) => {
    await page.goto('/');

    // 获取初始内存使用
    const initialMemory = await measureMemoryUsage(page);

    console.log('初始内存使用:', {
      已用堆内存: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      总堆内存: `${(initialMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      堆内存限制: `${(initialMemory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
    });

    // 确保内存使用在合理范围内
    expect(initialMemory.usedJSHeapSize).toBeGreaterThan(0);
    expect(initialMemory.jsHeapSizeLimit).toBeGreaterThan(0);

    // 已用内存应小于限制的80%
    const usageRatio =
      initialMemory.usedJSHeapSize / initialMemory.jsHeapSizeLimit;
    expect(usageRatio).toBeLessThan(0.8);
  });

  test('仪表板内存使用监测', async ({ page }) => {
    // 登录并访问仪表板
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    const dashboardMemory = await measureMemoryUsage(page);

    console.log('仪表板内存使用:', {
      已用堆内存: `${(dashboardMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      总堆内存: `${(dashboardMemory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
    });

    // 仪表板不应使用过多内存
    expect(dashboardMemory.usedJSHeapSize).toBeLessThan(
      200 * 1024 * 1024, // 200MB
    );
  });

  test('内存泄漏检测 - 重复导航', async ({ page }) => {
    await page.goto('/');

    // 执行多次导航操作并监测内存
    const { hasLeak, growthRate, samples } = await detectMemoryLeak(
      page,
      async () => {
        await page.goto('/jobs');
        await page.goto('/dashboard');
        await page.goto('/');
      },
      5, // 5次迭代
    );

    console.log('内存泄漏检测结果:', {
      存在泄漏: hasLeak,
      增长率: `${(growthRate / 1024 / 1024).toFixed(2)}MB/次`,
      样本数: samples.length,
    });

    // 内存增长不应超过1MB/次迭代
    expect(growthRate).toBeLessThan(1024 * 1024);
    expect(hasLeak).toBe(false);
  });

  test('内存泄漏检测 - 表单操作', async ({ page }) => {
    await page.goto('/jobs/new');

    const { hasLeak, growthRate, samples } = await detectMemoryLeak(
      page,
      async () => {
        // 填写并提交表单
        await page.fill('[data-testid="job-title"]', '测试岗位');
        await page.fill(
          '[data-testid="job-description"]',
          '这是一个测试岗位描述',
        );
        await page.fill('[data-testid="job-location"]', '北京');

        // 清空表单
        await page.click('[data-testid="clear-form"]');
      },
      10,
    );

    console.log('表单操作内存泄漏检测:', {
      存在泄漏: hasLeak,
      增长率: `${(growthRate / 1024 / 1024).toFixed(2)}MB/次`,
    });

    expect(growthRate).toBeLessThan(512 * 1024); // 512KB阈值
  });

  test('内存泄漏检测 - 模态框开关', async ({ page }) => {
    await page.goto('/jobs');

    const { hasLeak, growthRate } = await detectMemoryLeak(
      page,
      async () => {
        // 打开模态框
        await page.click('[data-testid="create-job-button"]');
        await page.waitForSelector('[data-testid="job-modal"]', {
          state: 'visible',
        });

        // 关闭模态框
        await page.click('[data-testid="close-modal"]');
        await page.waitForSelector('[data-testid="job-modal"]', {
          state: 'hidden',
        });
      },
      20, // 更多次迭代
    );

    console.log('模态框内存泄漏检测:', {
      存在泄漏: hasLeak,
      增长率: `${(growthRate / 1024).toFixed(2)}KB/次`,
    });

    // 模态框不应有内存泄漏
    expect(growthRate).toBeLessThan(256 * 1024); // 256KB阈值
  });

  test('垃圾回收验证', async ({ page }) => {
    await page.goto('/');

    // 获取初始内存
    const initialMemory = await measureMemoryUsage(page);

    // 执行一些内存密集型操作
    await page.evaluate(() => {
      // 创建大量临时对象
      const temp = [];
      for (let i = 0; i < 10000; i++) {
        temp.push(new Array(1000).fill(i));
      }
      // 释放引用
      // temp = null; // 让垃圾回收器处理
    });

    // 强制等待一段时间让垃圾回收运行
    await page.waitForTimeout(2000);

    // 再次测量内存
    const afterOperationMemory = await measureMemoryUsage(page);

    console.log('垃圾回收验证:', {
      操作前内存: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      操作后内存: `${(afterOperationMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      内存变化: `${((afterOperationMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / 1024 / 1024).toFixed(2)}MB`,
    });

    // 内存应在可控范围内，即使有临时增长
    const memoryIncrease =
      afterOperationMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 增长不超过50MB
  });

  test('长时间运行内存稳定性', async ({ page }) => {
    await page.goto('/dashboard');

    const memorySnapshots: number[] = [];

    // 模拟长时间使用
    for (let i = 0; i < 10; i++) {
      // 导航到不同页面
      await page.goto('/jobs');
      await page.waitForTimeout(500);

      await page.goto('/analysis');
      await page.waitForTimeout(500);

      await page.goto('/dashboard');
      await page.waitForTimeout(500);

      // 记录内存
      const memory = await measureMemoryUsage(page);
      memorySnapshots.push(memory.usedJSHeapSize);
    }

    // 计算内存增长趋势
    const firstSnapshot = memorySnapshots[0];
    const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
    const growth = lastSnapshot - firstSnapshot;

    console.log('长时间运行内存稳定性:', {
      初始内存: `${(firstSnapshot / 1024 / 1024).toFixed(2)}MB`,
      最终内存: `${(lastSnapshot / 1024 / 1024).toFixed(2)}MB`,
      总增长: `${(growth / 1024 / 1024).toFixed(2)}MB`,
      快照数: memorySnapshots.length,
    });

    // 长时间运行后内存增长应有限
    expect(growth).toBeLessThan(100 * 1024 * 1024); // 不超过100MB增长
  });

  test('大型数据列表内存性能', async ({ page }) => {
    await page.goto('/jobs');

    // 等待加载大量数据
    await page.waitForSelector('[data-testid="jobs-list"]', {
      timeout: 10000,
    });

    const beforeLoad = await measureMemoryUsage(page);

    // 滚动加载更多数据
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
    }

    const afterLoad = await measureMemoryUsage(page);
    const memoryIncrease = afterLoad.usedJSHeapSize - beforeLoad.usedJSHeapSize;

    console.log('大型数据列表内存性能:', {
      加载前: `${(beforeLoad.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      加载后: `${(afterLoad.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      增长: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
    });

    // 加载大量数据后内存增长应合理
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 不超过100MB
  });
});
