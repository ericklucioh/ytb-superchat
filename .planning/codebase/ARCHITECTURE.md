# Architecture

**Analysis Date:** 2024-04-14

## Pattern Overview

**Overall:** Distributed Messaging Hub with WebSocket Shim.

**Key Characteristics:**
- **Decentralized Capture:** Uses browser extension content scripts to extract data from various sources (DOM scraping or WS interception).
- **Service Worker Relay:** A central extension background process (`extension/service_worker.js`) coordinates message routing based on Session IDs.
- **WebSocket Shim:** Intercepts outgoing WebSocket requests to specific domains and reroutes them through the extension's message bus.

## Layers

**Platform Capture (Source):**
- Purpose: Extracts chat, superchat, and event data from streaming platforms.
- Location: `extension/sources/*.js`
- Contains: Scrapers and event listeners tailored for specific sites (YouTube, Twitch, etc.).
- Depends on: `extension/sources/local-chat-bridge.js`
- Used by: Chrome Extension environment.

**Messaging Relay (Core):**
- Purpose: Routes messages from sources to dashboards.
- Location: `extension/service_worker.js`
- Contains: Port management (`chrome.runtime.connect`) and session backlogs.
- Depends on: Chrome Runtime API.
- Used by: Content scripts and dashboard relay.

**Dashboard Interface (Consumer):**
- Purpose: Provides the streamer with a unified view of all captured events.
- Location: `src/site/`
- Contains: Event processing, store management, and UI rendering.
- Depends on: `src/site/chat-bridge.js`
- Used by: The end user (streamer).

## Data Flow

**Message Capture & Broadcast:**

1. **Source Capture:** A content script (e.g., `youtube.js`) detects a new message.
2. **Local Bridge:** The message is sent to the service worker via `LocalChatBridge.publish`.
3. **Session Routing:** The service worker identifies the session for the sending port.
4. **Relay Broadcast:** The service worker broadcasts the message to all other ports (Dashboards) connected with the same Session ID.
5. **Dashboard Delivery:** The dashboard relay (`dashboard-relay.js`) receives the broadcast and emits a `window.postMessage`.
6. **UI Update:** The dashboard app (`streamer-app.js`) listens for the message, processes it via `streamer-events.js`, and updates the view.

**State Management:**
- **In-Memory Store:** `src/site/streamer-store.js` manages the current session state and chat history.
- **Chrome Storage:** Persists extension-level settings like user preferences.

## Key Abstractions

**Chat Bridge:**
- Purpose: Provides a uniform interface for sending and receiving messages across different environments.
- Examples: `src/site/chat-bridge.js` (Web), `extension/sources/local-chat-bridge.js` (Extension).

**WebSocket Shim:**
- Purpose: Transparently intercepts WebSocket traffic.
- Example: `extension/sources/local-chat-bridge.js` (`installLegacyOverlaySocketShim`).

## Entry Points

**Streamer Dashboard:**
- Location: `src/index.html` (redirects to `/portal`)
- Triggers: User opening the website.
- Responsibilities: Initialization of the store, view, and chat bridge.

**Extension Service Worker:**
- Location: `extension/service_worker.js`
- Triggers: Browser startup or extension load.
- Responsibilities: Managing port connections and session message backlogs.

## Error Handling

**Strategy:** Fail-silent with console logging for debugging.

**Patterns:**
- Try/Catch blocks around message emission and listener execution.
- Disconnect listeners to cleanup ports when they are no longer needed.

## Cross-Cutting Concerns

**Logging:** Standard `console.log` throughout the codebase.
**Validation:** `cleanSession` utility used to normalize session IDs across components.
**Authentication:** Implicit via Session IDs; anyone with the ID can join the session.

---

*Architecture analysis: 2024-04-14*
