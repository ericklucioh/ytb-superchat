# Domain Pitfalls: Chat Overlays

**Domain:** Live Streaming Support Tools
**Researched:** May 2024

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Brittle DOM Selectors
**What goes wrong:** YouTube or Twitch updates their UI, and the browser extension stops capturing chat because the CSS classes or HTML structure changed.
**Why it happens:** Relying on specific, non-semantic classes like `.yt-live-chat-text-message-renderer`.
**Consequences:** The overlay breaks mid-stream, frustrating the user.
**Prevention:** Use a combination of tag names, IDs, and "data" attributes which are less likely to change frequently. Implement a "fallback" capture method if possible.
**Detection:** Monitor for "zero messages captured" while the page is active.

### Pitfall 2: Memory Leaks in Long Streams
**What goes wrong:** The browser extension or Go server slowly consumes more and more RAM.
**Why it happens:** Chat messages are added to a list/history but never cleared. Some streams last 24+ hours.
**Consequences:** The computer slows down, causing "frame drops" in the stream or even a system crash.
**Prevention:** Implement a "Maximum History" limit (e.g., keep only the last 100 messages in memory). Periodically clear the DOM in the extension's hidden background pages if used.

### Pitfall 3: Insecure Local WebSockets
**What goes wrong:** Other software on the streamer's computer (or someone on the same LAN) can send fake chat messages to the overlay.
**Why it happens:** Using a generic port (like 8080) without any authentication or unique session validation.
**Consequences:** "Trolling" where fake donations or offensive messages appear on the stream.
**Prevention:** Require a `sessionID` for all WebSocket connections. Ensure the Go server only accepts connections from `localhost` by default.

## Moderate Pitfalls

### Pitfall 1: Emote Scaling
**What goes wrong:** Emotes look blurry or "pixelated" on high-res streams (4K).
**Prevention:** Always try to fetch the highest resolution version of the emote (e.g., Twitch allows `@2x` or `@4x` URLs).

### Pitfall 2: Reconnection Jitter
**What goes wrong:** When the internet blips, the extension reconnects but misses messages that were sent during the downtime.
**Prevention:** Platforms like Twitch keep a short history in the DOM. When the extension reconnects, it should check for the "last seen message ID" to avoid duplicates or gaps.

## Minor Pitfalls

### Pitfall 1: Avatar Placeholders
**What goes wrong:** YouTube sometimes fails to load avatars instantly, leading to "broken image" icons on the overlay.
**Prevention:** Use a default "anonymous" avatar if the capture fails to find an image URL.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Go Server** | WebSocket connection drops. | Implement a robust heart-beat (ping/pong) and auto-reconnect logic. |
| **Extension** | Cross-Origin (CORS) issues. | Ensure the manifest.json has correct permissions for the local Go server domain. |
| **Dashboard** | Data "Staleness" on refresh. | Load the last N messages from the Go server immediately upon dashboard connection. |

## Sources

- SocialStream.ninja GitHub Issues (Common bugs reported by users)
- Reddit /r/Twitch (Discussion on "overlay lag" and "Streamlabs resource usage")
- Chrome Extension Documentation (Best practices for background scripts)
