import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';
import { waitForDeferredComponents } from './test-utils/hydration';

const COACH_ROUTE = '/coach';

test.describe('PDF UAT - Real File', () => {
  test('Coach page accepts JD + real PDF and shows correct skills', async ({
    page,
  }) => {
    const root = process.cwd();
    const jdPath = path.resolve(root, 'UAT_Architect_JD.txt');
    const pdfPath = path.resolve(root, '简历.pdf');

    expect(fs.existsSync(jdPath)).toBeTruthy();
    expect(fs.existsSync(pdfPath)).toBeTruthy();

    const jd = fs.readFileSync(jdPath, 'utf-8');

    await page.goto(COACH_ROUTE);
    await waitForDeferredComponents(page);

    const jdTextarea = page
      .locator('#jd, textarea[name="jd"], [data-testid="jd-input"]')
      .first();
    await expect(jdTextarea).toBeVisible({ timeout: 10000 });
    await jdTextarea.fill(jd);

    const fileInput = page
      .locator('#resume, input[type="file"], [data-testid="resume-upload"]')
      .first();
    await expect(fileInput).toBeVisible({ timeout: 10000 });
    await fileInput.setInputFiles(pdfPath);

    const analyzeButton = page
      .getByRole('button', { name: /analyze|分析|提交|start/i })
      .first();
    await expect(analyzeButton).toBeEnabled({ timeout: 10000 });
    await analyzeButton.click();

    await expect(
      page.getByRole('heading', { name: /diagnostic report/i }),
    ).toBeVisible({ timeout: 20000 });

    const matchedSection = page
      .getByText(/Matched Skills/i)
      .locator('xpath=..');
    await expect(matchedSection).toContainText(/aws/i);
    await expect(matchedSection).toContainText(/kubernetes/i);

    const missingSection = page
      .getByText(/Missing Skills/i)
      .locator('xpath=..');
    await expect(missingSection).toContainText(/azure/i);
  });
});
