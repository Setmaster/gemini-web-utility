const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, test, expect } = require('@playwright/test');

const LIVE_ENABLED = process.env.GWU_RUN_LIVE === '1';
const LIVE_PROFILE_DIR =
  process.env.GWU_LIVE_PROFILE_DIR || path.join(os.tmpdir(), 'gwu-mv3-live-profile');
const LIVE_CHAT_URL = process.env.GWU_LIVE_CHAT_URL || '';

test.skip(!LIVE_ENABLED, 'Set GWU_RUN_LIVE=1 to run authenticated Gemini validation.');

test('validates the extension against a live Gemini chat', async () => {
  if (!fs.existsSync(LIVE_PROFILE_DIR)) {
    throw new Error('Live Gemini profile not found at ' + LIVE_PROFILE_DIR);
  }

  if (!LIVE_CHAT_URL) {
    throw new Error('Set GWU_LIVE_CHAT_URL to a real Gemini chat URL before running the live test.');
  }

  const extensionPath = path.resolve(__dirname, '..');
  const context = await chromium.launchPersistentContext(LIVE_PROFILE_DIR, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    const page = await context.newPage();
    await page.goto(LIVE_CHAT_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(7000);

    await expect(page.locator('#gwu-settings-button')).toHaveText('GU');
    await page.locator('#gwu-settings-button').click();
    await expect(page.locator('#gwu-settings-panel')).toBeVisible();
    await expect(page.locator('#gwu-export-conversation')).toHaveText('Export Conversation (.md)');

    const liveUiInfo = await page.evaluate(() => ({
      responseContainers: document.querySelectorAll('.response-container').length,
      generatedImages: document.querySelectorAll('generated-image img').length
    }));
    expect(liveUiInfo.responseContainers).toBeGreaterThan(0);
    expect(liveUiInfo.generatedImages).toBeGreaterThan(0);

    const imageInfo = await page.locator('generated-image img').first().evaluate((img) => ({
      src: img.src,
      currentSrc: img.currentSrc,
      state: img.dataset.gwuImageState || '',
      reason: img.dataset.gwuDebugReason || '',
      error: img.dataset.gwuDebugError || '',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    }));

    expect(imageInfo.state).toBe('ready');
    expect(imageInfo.currentSrc.startsWith('blob:')).toBe(true);
    expect(imageInfo.naturalWidth).toBeGreaterThan(0);
    expect(imageInfo.naturalHeight).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
