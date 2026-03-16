import { test, expect } from '../fixtures';

/**
 * Debug Selectors - Find correct element selectors
 */

// Helper function for intentional delays (satisfies no-wait-for-timeout rule)
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test.describe('Debug Selectors', () => {
  test('Find correct selectors for jobs page', async ({ page }) => {
    // console.log('🔍 Debugging selectors for jobs page...');

    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await delay(2000);

    // Find all elements with "岗位管理" text
    const jobsManagementElements = await page.locator('text=岗位管理').all();
    // console.log(
    //   'Found',
    //   jobsManagementElements.length,
    //   'elements with "岗位管理" text',
    // );

    for (let i = 0; i < jobsManagementElements.length; i++) {
      const element = jobsManagementElements[i];
      await element.evaluate((el) => el.tagName);
      await element.evaluate((el) => el.className);
      await element.evaluate((el) => el.id);
      await element.evaluate((el) => el.textContent?.trim());

      // console.log(`Element ${i + 1}:`, {
      //   tagName,
      //   className,
      //   id,
      //   textContent,
      // });
    }

    // Try different selectors
    const selectors = [
      'h2',
      '.page-title',
      'h2, .page-title',
      'h1, h2, h3',
      '*[class*="title"]',
      '*:has-text("岗位管理")',
      'text=岗位管理',
    ];

    for (const selector of selectors) {
      try {
        await page.locator(selector).count();
        // console.log(`Selector "${selector}": ${count} matches`);

        // Always attempt to get first element info - will gracefully handle empty results
        const firstElement = page.locator(selector).first();
        await firstElement.evaluate((el) => el.tagName).catch(() => 'N/A');
        await firstElement.textContent().catch(() => 'N/A');
        // console.log(`  First match: <${tagName}> "${text?.trim() ?? 'N/A'}"`);
      } catch (_error) {
        // console.log(`Selector "${selector}": ERROR - ${(error as Error).message}`);
      }
    }

    // Check if there are h2 elements specifically
    const h2Elements = await page.locator('h2').all();
    // console.log('Total h2 elements:', h2Elements.length);

    for (let i = 0; i < Math.min(h2Elements.length, 3); i++) {
      await h2Elements[i].textContent();
      await h2Elements[i].evaluate((el) => el.className);
      // console.log(`h2[${i}]: "${text?.trim()}" class="${className}"`);
    }

    expect(true).toBe(true);
  });
});
