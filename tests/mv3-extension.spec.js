const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, test, expect } = require('@playwright/test');

test('loads the MV3 extension and persists settings through the GU panel', async () => {
  const extensionPath = path.resolve(__dirname, '..');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwu-mv3-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  try {
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent('serviceworker');
    }

    expect(serviceWorker.url()).toContain('chrome-extension://');

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/settings-panel.html');

    await expect(page.locator('#gwu-settings-button')).toHaveText('GU');
    await page.locator('#gwu-settings-button').click();
    await expect(page.locator('#gwu-settings-panel')).toBeVisible();

    await page.locator('[data-gwu-shortcut-key="shortcutNewChat"]').click();
    await expect(page.locator('#gwu-shortcut-modal-overlay')).toBeVisible();
    await page.keyboard.press('Control+Alt+Space');
    await expect(page.locator('[data-gwu-shortcut-key="shortcutNewChat"]')).toHaveText('Ctrl+Alt+Space');

    const storedAfterCapture = await serviceWorker.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get('gwuSettings', resolve);
      });
    });
    expect(storedAfterCapture.gwuSettings.shortcutNewChat).toBe('Ctrl+Alt+Space');

    await page.locator('#gwu-reset-settings').click();
    await expect(page.locator('[data-gwu-shortcut-key="shortcutNewChat"]')).toHaveText('Ctrl+Alt+N');

    const storedAfterReset = await serviceWorker.evaluate(async () => {
      return new Promise((resolve) => {
        chrome.storage.local.get('gwuSettings', resolve);
      });
    });
    expect(storedAfterReset.gwuSettings.shortcutNewChat).toBe('Ctrl+Alt+N');
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
});
