# Gemini Web Utility

Gemini Web Utility is a Manifest V3 Chrome extension that adds focused quality-of-life improvements to the Gemini web app.

It stays inside Gemini's normal interface instead of replacing it with a separate popup-heavy workflow.

## Features

- Clean Copy
  Standard text selection copy no longer prepends `Gemini said`.
- Copy as Markdown
  Copy Gemini responses as Markdown when you want clean notes or docs.
- Code Block Copy Fix
  Remove line-number and gutter noise from copied code blocks.
- `GU` Settings Panel
  Toggle features on and off, and rebind shortcuts from the in-page menu.
- Auto-Expand Responses
  Automatically open truncated Gemini responses when an expand control is visible.
- Export Conversation
  Save the current conversation as a local Markdown file named after the chat.
- Watermark Removal
  Remove the visible watermark from Gemini-generated images inside the web app.

## Privacy

Privacy policy:

`https://7dev.io/gemini-web-utility/privacy-policy`

## Installation

Chrome Web Store listing is being prepared. Until then, install from source:

1. Open `chrome://extensions` or the Chromium equivalent.
2. Enable Developer Mode.
3. Choose `Load unpacked`.
4. Select this repo folder.

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

- Install deps: `npm install`
- Unit + MV3 fixture suite: `npm test`
- Build a Chrome Web Store zip: `npm run build:zip`
- Live authenticated Gemini validation:
  - `GWU_RUN_LIVE=1 npm run test:live`
  - required:
    - `GWU_LIVE_CHAT_URL=https://gemini.google.com/app/<chat-id>`
  - optional:
    - `GWU_LIVE_PROFILE_DIR=/path/to/persistent/chromium/profile`

## Status

- Current public pre-`1.0` line: `0.9.9`
- `1.0.0` is intentionally reserved for the final release line after public-launch validation.
