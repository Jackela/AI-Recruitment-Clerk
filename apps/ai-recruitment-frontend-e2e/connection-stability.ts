/**
 * Connection Stability Utilities
 * 
 * Unified connection retry and stability utilities for all browsers
 */

import { Page, expect } from '@playwright/test';

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  timeoutMs?: number;
  browserName?: string;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
  retries?: number;
}

/**
 * Browser-specific optimization settings
 */
export const BROWSER_CONFIGS = {
  chromium: {
    navigationTimeout: 45000,
    actionTimeout: 15000,
    retryDelay: 1000
  },
  firefox: {
    navigationTimeout: 60000,
    actionTimeout: 20000,
    retryDelay: 1500
  },
  webkit: {
    navigationTimeout: 60000,
    actionTimeout: 20000,
    retryDelay: 2000
  }
} as const;

/**
 * Enhanced navigation with retry logic and browser-specific optimizations
 */
export async function stableNavigation(
  page: Page, 
  url: string, 
  options: NavigationOptions = {},
  browserName: string = 'chromium'
): Promise<void> {
  const config = BROWSER_CONFIGS[browserName as keyof typeof BROWSER_CONFIGS] || BROWSER_CONFIGS.chromium;
  const maxRetries = options.retries || 3;
  const timeout = options.timeout || config.navigationTimeout;
  const waitUntil = options.waitUntil || 'domcontentloaded';
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Navigation attempt ${attempt}/${maxRetries} to ${url} [${browserName}]`);
      
      await page.goto(url, { 
        waitUntil, 
        timeout 
      });
      
      console.log(`✅ Navigation successful on attempt ${attempt} [${browserName}]`);
      return;
      
    } catch (error) {
      lastError = error as Error;
      console.log(`⚠️ Navigation attempt ${attempt} failed: ${error.message} [${browserName}]`);
      
      if (attempt < maxRetries) {
        const delay = config.retryDelay * attempt; // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry [${browserName}]...`);
        await page.waitForTimeout(delay);
      }
    }
  }
  
  throw new Error(`Navigation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Enhanced element visibility check with retry logic
 */
export async function stableElementCheck(
  page: Page, 
  selector: string, 
  options: RetryOptions = {},
  browserName: string = 'chromium'
): Promise<boolean> {
  const config = BROWSER_CONFIGS[browserName as keyof typeof BROWSER_CONFIGS] || BROWSER_CONFIGS.chromium;
  const maxRetries = options.maxRetries || 3;
  const timeout = options.timeoutMs || config.actionTimeout;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Element check attempt ${attempt}/${maxRetries} for ${selector} [${browserName}]`);
      
      await expect(page.locator(selector)).toBeVisible({ timeout });
      
      console.log(`✅ Element found on attempt ${attempt} [${browserName}]`);
      return true;
      
    } catch (error) {
      console.log(`⚠️ Element check attempt ${attempt} failed: ${error.message} [${browserName}]`);
      
      if (attempt < maxRetries) {
        const delay = config.retryDelay;
        await page.waitForTimeout(delay);
      }
    }
  }
  
  return false;
}

/**
 * Browser-specific JavaScript evaluation with error handling
 */
export async function stableEvaluate<T>(
  page: Page,
  evaluateFunction: () => T,
  options: RetryOptions = {},
  browserName: string = 'chromium'
): Promise<T> {
  const config = BROWSER_CONFIGS[browserName as keyof typeof BROWSER_CONFIGS] || BROWSER_CONFIGS.chromium;
  const maxRetries = options.maxRetries || 2;
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`⚡ JavaScript evaluation attempt ${attempt}/${maxRetries} [${browserName}]`);
      
      const result = await page.evaluate(evaluateFunction);
      
      console.log(`✅ JavaScript evaluation successful on attempt ${attempt} [${browserName}]`);
      return result;
      
    } catch (error) {
      lastError = error as Error;
      console.log(`⚠️ JavaScript evaluation attempt ${attempt} failed: ${error.message} [${browserName}]`);
      
      if (attempt < maxRetries) {
        await page.waitForTimeout(config.retryDelay);
      }
    }
  }
  
  throw new Error(`JavaScript evaluation failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Connection health check utility
 */
export async function checkConnectionHealth(
  page: Page,
  baseUrl: string,
  browserName: string = 'chromium'
): Promise<boolean> {
  try {
    console.log(`🏥 Connection health check for ${baseUrl} [${browserName}]`);
    
    // Simple navigation test
    await stableNavigation(page, baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      retries: 2
    }, browserName);
    
    // Check if basic elements are present
    const bodyVisible = await stableElementCheck(page, 'body', {
      maxRetries: 2,
      timeoutMs: 10000
    }, browserName);
    
    if (bodyVisible) {
      console.log(`✅ Connection health check passed [${browserName}]`);
      return true;
    } else {
      console.log(`❌ Connection health check failed - no body element [${browserName}]`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Connection health check failed: ${error.message} [${browserName}]`);
    return false;
  }
}

/**
 * Performance monitoring utility
 */
export async function measurePerformance(
  page: Page,
  operationName: string,
  browserName: string = 'chromium'
): Promise<{ duration: number; success: boolean }> {
  const startTime = Date.now();
  let success = false;
  
  try {
    console.log(`📊 Starting performance measurement for ${operationName} [${browserName}]`);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    success = true;
    
  } catch (error) {
    console.log(`📊 Performance measurement failed: ${error.message} [${browserName}]`);
  } finally {
    const duration = Date.now() - startTime;
    console.log(`📊 Performance measurement complete: ${operationName} took ${duration}ms [${browserName}]`);
    
    return { duration, success };
  }
}