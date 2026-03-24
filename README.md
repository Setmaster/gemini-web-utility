# Gemini Web Utility

Manifest V3 Chrome/Chromium extension for the Gemini web app.

## Shipped Features

- Clean Copy for Gemini responses
- Copy as Markdown
- Code Block Copy Fix
- `GU` settings panel with feature toggles and shortcut rebinding
- Auto-Expand Responses
- Export Conversation to Markdown
- Watermark removal for Gemini-generated images

## Local Install

1. Open `chrome://extensions` or the Chromium equivalent.
2. Enable Developer Mode.
3. Choose `Load unpacked`.
4. Select this repo folder.

## Development

- Install deps: `npm install`
- Unit + MV3 fixture suite: `npm test`
- Live authenticated Gemini validation:
  - `GWU_RUN_LIVE=1 npm run test:live`
  - optional overrides:
    - `GWU_LIVE_PROFILE_DIR=/tmp/gwu-mv3-headed-profile`
    - `GWU_LIVE_CHAT_URL=https://gemini.google.com/app/<chat-id>`

## Notes

- The default local live-profile path matches the persistent Chromium profile used during development on this machine.
- `1.0.0` is intentionally reserved for the final release after human review.
