import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';
import { waitForDeferredComponents } from './test-utils/hydration';

const ANALYSIS_URL = 'http://localhost:4202/analysis';
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TEST_RESUME_PATH = path.resolve(
  CURRENT_DIR,
  'test-data/resumes/image-only-resume.pdf',
);

type SocketEventType = 'progress' | 'step_change' | 'completed';

interface SocketEventPayload {
  type: SocketEventType;
  data: Record<string, unknown>;
}

async function gotoAnalysis(page: Page): Promise<void> {
  await page.goto(ANALYSIS_URL);
  await waitForDeferredComponents(page);
}

async function setupApiMocks(page: Page, sessionId: string): Promise<void> {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = request.url();
    const method = request.method();

    if (
      method === 'POST' &&
      url.includes('/api/guest/resume/analyze')
    ) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            analysisId: sessionId,
            filename: 'image-only-resume.pdf',
            uploadedAt: new Date().toISOString(),
            estimatedCompletionTime: new Date(Date.now() + 60_000).toISOString(),
            isGuestMode: true,
            fileSize: 1_200_000,
          },
        }),
      });
      return;
    }

    // Default mock for all other API calls
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });
}

async function registerSocketHarness(
  page: Page,
  sessionId: string,
): Promise<void> {
  await page.evaluate(({ sessionId: id }) => {
    const root = document.querySelector('arc-unified-analysis');
    if (!root) {
      throw new Error('UnifiedAnalysisComponent root element not found');
    }

    const getComponentInstance = (element: Element): any => {
      const ng = (window as any).ng;
      if (ng?.getComponent) {
        return ng.getComponent(element);
      }

      const context = (element as any).__ngContext__;
      if (Array.isArray(context)) {
        for (const item of context) {
          if (item && typeof item === 'object' && item.constructor?.ɵcmp) {
            return item;
          }
        }
      }

      return null;
    };

    const componentInstance = getComponentInstance(root);
    if (!componentInstance) {
      throw new Error('Unable to resolve UnifiedAnalysisComponent instance');
    }

    const webSocketService = componentInstance['webSocketService'];
    if (!webSocketService || !webSocketService['messages$']) {
      throw new Error('WebSocketService or its message stream is unavailable');
    }

    (window as any).__arcPushSocketEvent = (event: SocketEventPayload) => {
      webSocketService['messages$'].next({
        type: event.type,
        sessionId: id,
        data: event.data,
        timestamp: new Date(),
      });
    };
  }, { sessionId });
}

async function emitSocketEvent(
  page: Page,
  payload: SocketEventPayload,
): Promise<void> {
  await page.evaluate(({ event }) => {
    const push = (window as any).__arcPushSocketEvent;
    if (typeof push !== 'function') {
      throw new Error('Socket harness has not been registered');
    }
    push(event);
  }, { event: payload });
}

test.describe('Unified Analysis - Resume Upload Flow', () => {
  test('should walk through resume upload, live progress, and completion', async ({
    page,
  }) => {
    const sessionId = 'session-regression-001';
    await setupApiMocks(page, sessionId);
    await gotoAnalysis(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_RESUME_PATH);

    const submitButton = page.getByRole('button', { name: '开始AI分析' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await page.waitForResponse((response) => {
      const request = response.request();
      return (
        request.method() === 'POST' &&
        response.url().includes('/api/guest/resume/analyze')
      );
    });

    const progressPanel = page.locator('arc-analysis-progress');
    await expect(progressPanel).toBeVisible();

    await registerSocketHarness(page, sessionId);

    const stepItem = (label: string) =>
      progressPanel.locator('.step-item', { hasText: label });

    // Parse step progress
    await emitSocketEvent(page, {
      type: 'progress',
      data: {
        currentStep: '解析简历',
        progress: 45,
        message: '解析简历中',
      },
    });
    await expect(stepItem('解析简历').locator('.progress-text')).toHaveText(
      '45%',
    );
    await expect(stepItem('解析简历')).toHaveClass(/active/);

    // Move to information extraction
    await emitSocketEvent(page, {
      type: 'step_change',
      data: { step: '提取关键信息' },
    });
    await emitSocketEvent(page, {
      type: 'progress',
      data: {
        currentStep: '提取关键信息',
        progress: 60,
        message: '提取关键信息',
      },
    });
    await expect(stepItem('解析简历')).toHaveClass(/completed/);
    await expect(stepItem('信息提取')).toHaveClass(/active/);
    await expect(stepItem('信息提取').locator('.progress-text')).toHaveText(
      '60%',
    );

    // Intelligent analysis stage
    await emitSocketEvent(page, {
      type: 'step_change',
      data: { step: '智能分析' },
    });
    await emitSocketEvent(page, {
      type: 'progress',
      data: {
        currentStep: '智能分析',
        progress: 80,
        message: '智能分析中',
      },
    });
    await expect(stepItem('信息提取')).toHaveClass(/completed/);
    await expect(stepItem('智能分析')).toHaveClass(/active/);
    await expect(stepItem('智能分析').locator('.progress-text')).toHaveText(
      '80%',
    );

    // Report generation
    await emitSocketEvent(page, {
      type: 'step_change',
      data: { step: '生成报告' },
    });
    await emitSocketEvent(page, {
      type: 'progress',
      data: {
        currentStep: '生成报告',
        progress: 100,
        message: '生成报告中',
      },
    });
    await expect(stepItem('智能分析')).toHaveClass(/completed/);
    await expect(stepItem('生成报告')).toHaveClass(/active/);
    await expect(stepItem('生成报告').locator('.progress-text')).toHaveText(
      '100%',
    );

    // Completion event
    await emitSocketEvent(page, {
      type: 'completed',
      data: {
        analysisId: sessionId,
        result: {
          score: 92,
          summary: '候选人技能与岗位高度匹配',
          details: {
            skills: ['TypeScript', 'Angular', 'Node.js'],
            experience: '5年全栈开发经验',
            education: '计算机科学学士',
            recommendations: [
              '保持前端生态的持续学习',
              '准备系统设计相关案例',
              '可补充项目业务影响力描述',
            ],
          },
          reportUrl: 'https://example.com/report.pdf',
        },
        processingTime: 3200,
      },
    });

    const resultsPanel = page.locator('arc-analysis-results');
    await expect(resultsPanel).toBeVisible();
    await expect(resultsPanel.locator('.results-card h2')).toHaveText('✅ 分析完成');
    await expect(
      resultsPanel.locator('.insight-card', { hasText: 'TypeScript' }),
    ).toBeVisible();

    await expect(progressPanel).not.toBeVisible();
  });
});
