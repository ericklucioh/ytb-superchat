# Extension

This folder contains the browser extension used to capture supported live chat pages and deliver normalized events into the dashboard bridge.

## Primary Scope

Main maintained path:

- YouTube live chat
- Twitch pop-out chat

Secondary path:

- Kick support is present, but should be treated as less proven than the core YouTube/Twitch flow

Legacy or experimental sources still exist in `sources/`. They are not the main maintained contract of the project.

## Responsibilities

- read live chat page DOM
- normalize incoming events
- forward them to the local dashboard bridge

The extension does not own overlay rendering or shared state persistence.

## Important Files

- `manifest.json`
- `sources/shared-runtime.js`
- `sources/local-chat-bridge.js`
- `sources/dashboard-relay.js`
- `sources/youtube.js`
- `sources/twitch.js`
- `settings/options.html`

## Local Development

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select the `extension/` directory

Then keep a supported chat page open while the local portal is running.

## Notes

- The extension depends on page structure from the target platform.
- If the platform UI changes, selectors may need maintenance.
- Debug logging can be enabled from the extension options page.

See [../docs/extension-scope.md](../docs/extension-scope.md) for the public scope statement.
