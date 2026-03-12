import { expect, test, chromium } from '@playwright/test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

test('loads the extension new-tab page and shows all critical regions without fatal errors', async () => {
  const extensionPath = path.resolve(process.cwd(), 'dist');
  const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), '4000-weeks-extension-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    env: {
      ...process.env,
      HOME: userDataDir,
      TMPDIR: userDataDir,
    },
    args: [
      '--disable-crash-reporter',
      '--disable-crashpad',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    const errors: string[] = [];
    const page = await context.newPage();

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    await page.goto('chrome://newtab/', { waitUntil: 'domcontentloaded', timeout: 10_000 });

    await expect(page.getByTestId('onboarding-region')).toBeVisible();

    await page.getByTestId('birthday-input').fill('1990-01-01');
    await page.getByRole('button', { name: /begin countdown/i }).click();

    await expect(page.getByTestId('life-counter-region')).toBeVisible();
    await expect(page.getByTestId('quote-region')).toBeVisible();
    await expect(page.getByTestId('interactive-units-region')).toBeVisible();
    await expect(page.getByTestId('week-grid-region')).toBeVisible();

    await page.getByTestId('week-dot-0').evaluate((element: HTMLElement) => {
      element.click();
    });
    await expect(page.getByTestId('journal-section')).toBeVisible();

    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
});
