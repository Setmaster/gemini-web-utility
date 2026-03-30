const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium, test, expect } = require('@playwright/test');
const { buildTestExtension } = require('./build-test-extension.js');

async function launchExtensionContext() {
  const extensionPath = buildTestExtension();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwu-mv3-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'http://127.0.0.1:8765'
  });

  return { context, serviceWorker, userDataDir, extensionPath };
}

async function closeExtensionContext(context, userDataDir, extensionPath) {
  await context.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
  fs.rmSync(extensionPath, { recursive: true, force: true });
}

async function readStoredSettings(serviceWorker) {
  return serviceWorker.evaluate(async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get('gwuSettings', resolve);
    });
  });
}

test('persists shortcut changes and reset through the GU panel', async () => {
  const { context, serviceWorker, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    expect(serviceWorker.url()).toContain('chrome-extension://');

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/settings-panel.html');

    await expect(page.locator('bard-upsell-menu-button')).toBeHidden();

    await expect(page.locator('#gwu-settings-button')).toHaveText('GU');
    await page.locator('#gwu-settings-button').click();
    await expect(page.locator('#gwu-settings-panel')).toBeVisible();
    const panelStyle = await page.locator('#gwu-settings-panel').evaluate((panel) => {
      const styles = window.getComputedStyle(panel);
      const scrollHost = panel.querySelector('.gwu-settings-panel-scroll');
      const scrollStyles = window.getComputedStyle(scrollHost);
      const buttonStyles = window.getComputedStyle(document.getElementById('gwu-settings-button'));
      return {
        buttonRight: buttonStyles.right,
        buttonBottom: buttonStyles.bottom,
        panelRight: styles.right,
        panelBottom: styles.bottom,
        panelOverflow: styles.overflow,
        panelRadius: styles.borderRadius,
        scrollMarginRight: scrollStyles.marginRight,
        scrollOverflowY: scrollStyles.overflowY,
        scrollGutter: scrollStyles.scrollbarGutter,
        scrollRadius: scrollStyles.borderRadius
      };
    });
    expect(panelStyle.buttonRight).toBe('24px');
    expect(panelStyle.buttonBottom).toBe('24px');
    expect(panelStyle.panelRight).toBe('24px');
    expect(panelStyle.panelBottom).toBe('76px');
    expect(panelStyle.panelOverflow).toBe('hidden');
    expect(panelStyle.panelRadius).toBe('16px');
    expect(panelStyle.scrollMarginRight).toBe('4.48px');
    expect(panelStyle.scrollOverflowY).toBe('scroll');
    expect(panelStyle.scrollGutter).toContain('stable');
    expect(panelStyle.scrollRadius).toBe('16px');

    await page.locator('[data-gwu-shortcut-key="shortcutNewChat"]').click();
    await expect(page.locator('#gwu-shortcut-modal-overlay')).toBeVisible();
    await page.keyboard.press('Control+Alt+Space');
    await expect(page.locator('[data-gwu-shortcut-key="shortcutNewChat"]')).toHaveText('Ctrl+Alt+Space');

    const storedAfterCapture = await readStoredSettings(serviceWorker);
    expect(storedAfterCapture.gwuSettings.shortcutNewChat).toBe('Ctrl+Alt+Space');

    const upgradeToggle = page
      .locator('.gwu-settings-option')
      .filter({ hasText: 'Hide Upgrade Button' })
      .locator('input[type="checkbox"]');
    await upgradeToggle.uncheck();
    await expect(page.locator('bard-upsell-menu-button')).toBeVisible();

    await page.locator('#gwu-reset-settings').click();
    await expect(page.locator('[data-gwu-shortcut-key="shortcutNewChat"]')).toHaveText('Ctrl+Alt+N');
    await expect(page.locator('bard-upsell-menu-button')).toBeHidden();

    const storedAfterReset = await readStoredSettings(serviceWorker);
    expect(storedAfterReset.gwuSettings.shortcutNewChat).toBe('Ctrl+Alt+N');
    expect(storedAfterReset.gwuSettings.hideUpgradeButton).toBe(true);
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('can disable the expanded image editor overlay in the MV3 runtime', async () => {
  const { context, serviceWorker, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const settingsPage = await context.newPage();
    await settingsPage.goto('http://127.0.0.1:8765/tests/pages/settings-panel.html');
    await settingsPage.locator('#gwu-settings-button').click();

    const editorToggle = settingsPage
      .locator('.gwu-settings-option')
      .filter({ hasText: 'Expanded Image Editor' })
      .locator('input[type="checkbox"]');
    await editorToggle.uncheck();

    const storedSettings = await readStoredSettings(serviceWorker);
    expect(storedSettings.gwuSettings.expandedImageEditor).toBe(false);

    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/lightbox-watermark.html');
    await page.locator('.image-button').click();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const maskCanvas = document.querySelector('mat-dialog-container .mask-canvas');
            const editToolbar = document.querySelector('mat-dialog-container edit-toolbar');
            const doneButton = document.querySelector('mat-dialog-container [data-test-id="edit-done-button"]');
            if (!maskCanvas || !editToolbar || !doneButton) {
              return null;
            }

            return {
              maskCanvas: getComputedStyle(maskCanvas).display,
              editToolbar: getComputedStyle(editToolbar).display,
              doneButton: getComputedStyle(doneButton).display
            };
          }),
        { timeout: 8000 }
      )
      .toMatchObject({
        maskCanvas: 'none',
        editToolbar: 'none',
        doneButton: 'none'
      });
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('handles clean copy selection and copy markdown in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/copy-markdown.html');

    const copiedSelection = await page.evaluate(() => {
      window.prepareSelectionCopy();
      const clipboardData = new DataTransfer();
      const event = new ClipboardEvent('copy', {
        clipboardData,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      const out = {};
      for (const type of clipboardData.types) {
        out[type] = clipboardData.getData(type);
      }
      return out;
    });

    expect(copiedSelection['text/plain']).not.toContain('Gemini said');
    expect(copiedSelection['text/plain']).toContain('Weekly Plan');
    expect(copiedSelection['text/markdown']).toContain('### Weekly Plan');

    await expect(page.locator('[data-gwu-copy-markdown]')).toHaveText('Copy Markdown');
    await page.evaluate(() => window.beginCopyCapture());
    await page.locator('[data-gwu-copy-markdown]').click();
    await expect(page.locator('[data-gwu-copy-markdown]')).toHaveText('Markdown Copied');

    await expect.poll(() => page.evaluate(() => window.__gwuLastCopy)).not.toBeNull();
    const copiedButtonPayload = await page.evaluate(() => window.__gwuLastCopy);
    expect(copiedButtonPayload['text/plain']).toContain('### Weekly Plan');
    expect(copiedButtonPayload['text/markdown']).toContain('### Weekly Plan');
    expect(copiedButtonPayload['text/plain']).toContain("```js\nconsole.log('fixture');\n```");
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('intercepts code-block copy in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/code-copy.html');

    await page.evaluate(() => window.beginCopyCapture());
    await page.getByRole('button', { name: 'Copy code' }).click();
    const state = await page.evaluate(() => window.getCodeCopyState());
    expect(state.nativeClicked).toBe(false);
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('intercepts copy image and writes the displayed image blob in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/copy-image.html');

    await expect
      .poll(() => page.locator('.image').evaluate((img) => img.dataset.gwuImageState || ''))
      .toBe('skipped');

    await page.getByRole('button', { name: 'Copy image' }).click();
    await expect
      .poll(() => page.locator('#gwu-toast').textContent(), { timeout: 5000 })
      .toBe('Image copied');

    const copyState = await page.evaluate(() => ({
      nativeCalls: window.__nativeCopyImageCalls,
      buttonText: document.getElementById('copy-image')?.textContent || ''
    }));

    expect(copyState.nativeCalls).toBe(0);
    expect(copyState.buttonText).toBe('Copy image');
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('triggers shipped keyboard shortcuts in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/keyboard-shortcuts.html');

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'n',
        code: 'KeyN',
        ctrlKey: true,
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
    });
    await expect(page.locator('#status')).toHaveText('new-chat');

    await page.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
        cancelable: true
      }));
    });
    await expect(page.locator('#status')).toHaveText('stop');
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('auto-expands responses and exports conversations in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const expandPage = await context.newPage();
    await expandPage.goto('http://127.0.0.1:8765/tests/pages/auto-expand.html');
    await expect
      .poll(() => expandPage.evaluate(() => window.getAutoExpandState()))
      .toMatchObject({
        clickCount: 1,
        buttonText: 'Expanded',
        processedState: 'done',
        expandedDisplay: 'block'
      });
    await expandPage.close();

    const exportPage = await context.newPage();
    await exportPage.goto('http://127.0.0.1:8765/tests/pages/export-conversation.html');
    await exportPage.locator('#gwu-settings-button').click();
    const downloadPromise = exportPage.waitForEvent('download');
    await exportPage.locator('#gwu-export-conversation').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('Fixture Conversation.md');
    const downloadPath = await download.path();
    const markdown = fs.readFileSync(downloadPath, 'utf8');
    expect(markdown).toContain('# Fixture Conversation');
    expect(markdown).toContain('## User');
    expect(markdown).toContain('## Gemini');
    expect(markdown).toContain('Boil water.');
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});

test('retries processing for delayed Gemini lightbox images in the MV3 runtime', async () => {
  const { context, userDataDir, extensionPath } = await launchExtensionContext();
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8765/tests/pages/lightbox-watermark.html');

    await page.locator('.image-button').click();
    await expect
      .poll(() => page.evaluate(() => window.getLightboxState()), { timeout: 8000 })
      .toMatchObject({
        width: 589
      });

    await expect
      .poll(
        () => page.evaluate(() => {
          const state = window.getLightboxState();
          return state ? { state: state.state, reason: state.reason, src: state.src } : null;
        }),
        { timeout: 8000 }
      )
      .toMatchObject({
        state: 'skipped',
        reason: 'no-watermark-detected'
      });
  } finally {
    await closeExtensionContext(context, userDataDir, extensionPath);
  }
});
