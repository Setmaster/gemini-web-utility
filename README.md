![Gemini Web Utility banner](docs/readme-banner-v2.png)

# Gemini Web Utility

Gemini Web Utility is a Manifest V3 Chrome extension that adds focused quality-of-life improvements to the Gemini web app.

It stays inside Gemini's existing interface instead of replacing it with a separate dashboard or popup-driven workflow. The goal is simple: make Gemini feel cleaner, faster, and less frustrating for people who use it heavily.

## At a Glance

- fixes real Gemini paper cuts instead of layering on a separate workflow
- keeps everything in-page, including settings, export, and copy improvements
- ships as a modern Manifest V3 extension for current Chrome

## Why It Exists

Gemini already does a lot well, but the web app still has a few rough edges that show up quickly in day-to-day use:

- copied responses can include extra wrapper text
- copied code can include visual gutter noise
- long responses can stay collapsed
- useful export/share paths are missing
- generated images can still carry an in-app watermark

Gemini Web Utility fixes those problems in place, without trying to redesign the whole product.

## Highlights

- Clean Copy
  Standard text selection copy no longer prepends `Gemini said`.
- Copy as Markdown
  Copy Gemini responses as Markdown when you want clean notes, docs, or issue comments.
- Code Block Copy Fix
  Remove line-number and gutter noise from copied code blocks.
- `GU` Settings Panel
  Toggle features on and off, rebind shortcuts, and reset everything back to defaults from the in-page menu.
- Auto-Expand Responses
  Automatically open truncated Gemini responses when an expand control is visible.
- Export Conversation
  Save the current conversation as a local Markdown file named after the chat.
- Watermark Removal
  Remove the visible watermark from Gemini-generated images inside the web app.

## Before / After

Clean Copy:

```text
Before:
Gemini said
I like potatoes

After:
I like potatoes
```

Export Conversation:

```text
Before:
google-gemini

After:
Fixture Conversation.md
```

## Architecture

The extension is intentionally small:

- `content_script.js`
  Runs inside Gemini pages, injects the `GU` UI, handles copy/export/shortcut behavior, and coordinates image cleanup.
- `service_worker.js`
  Provides the Manifest V3 fetch bridge needed for Gemini image processing.
- `tests/`
  Covers pure logic, MV3 extension behavior, and optional live Gemini validation through Playwright.

## Privacy

Privacy policy:

`https://7dev.io/gemini-web-utility/privacy-policy`

## Installation

Chrome Web Store submission packaging is ready. Until the listing is live, install from source:

1. Open `chrome://extensions` or the Chromium equivalent.
2. Enable Developer Mode.
3. Choose `Load unpacked`.
4. Select this repo folder.

If you want the packaged submission artifact locally, build it with:

```bash
npm run build:zip
```

## Permissions

The extension requests:

- `storage`
  For local feature settings and shortcut preferences.
- `https://gemini.google.com/*`
  To run on Gemini pages.
- `https://*.googleusercontent.com/*`
- `https://lh3.google.com/*`
  To fetch Gemini-generated image resources needed for local image cleanup.

## Development

Install dependencies:

```bash
npm install
```

Run the core automated suite:

```bash
npm test
```

Build a Chrome Web Store zip:

```bash
npm run build:zip
```

Run the optional live authenticated Gemini check:

```bash
GWU_RUN_LIVE=1 \
GWU_LIVE_CHAT_URL=https://gemini.google.com/app/<chat-id> \
npm run test:live
```

Optional:

- `GWU_LIVE_PROFILE_DIR=/path/to/persistent/chromium/profile`

## Testing

The repo includes three test layers:

- unit tests for core transformation logic
- MV3 Playwright tests against local fixture pages
- optional live Gemini validation with an authenticated Chromium profile

## Status

- Current public pre-`1.0` line: `0.9.12`
- `1.0.0` is intentionally reserved for the final release line after public-launch validation.

## License

MIT
