# Architecture Patterns: Local Chat Overlay

**Domain:** Real-time data processing and distribution
**Researched:** May 2024

## Recommended Architecture

The system uses a **Decentralized Capture, Centralized Distribution** pattern. This is a common pattern for local streaming tools where the capture must happen in the browser (due to platform restrictions) but the data management must be centralized for consistency.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Chrome Extension** | Scrapes platform DOM (YT/Twitch/Kick), normalizes messages, and sends them to the server. | Local Go Server (WebSocket) |
| **Local Go Server** | Receives messages, manages sessions, and broadcasts to all connected clients. | Extension, Dashboard, OBS Overlay |
| **Streamer Dashboard** | Provides a UI to view and moderate messages. Can "pin" messages for the overlay. | Local Go Server (WebSocket) |
| **OBS Overlay** | Renders the final aesthetic view of chat for the live stream. | Local Go Server (WebSocket) |

### Data Flow

1. **Capture:** Platform chat is rendered in a popout browser window. The extension uses `MutationObserver` to detect new messages.
2. **Normalization:** The extension extracts author name, avatar, message, and platform-specific metadata (badges, Superchat amount).
3. **Transport:** Normalized JSON is sent via a local WebSocket to the Go server.
4. **Distribution:** The Go server identifies the `sessionID` and broadcasts the JSON to the Dashboard and OBS Overlay.
5. **Rendering:** The Overlay receives the message and triggers CSS animations to show it on screen.

## Patterns to Follow

### Pattern 1: DOM Scraping (MutationObserver)
**What:** Watching for changes in the specific chat container of YouTube or Twitch.
**When:** Always use this over polling `setInterval` to reduce CPU usage.
**Example:**
```javascript
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (isChatMessage(node)) processMessage(node);
        });
    });
});
observer.observe(chatContainer, { childList: true, subtree: true });
```

### Pattern 2: WebSocket Broadcast with Session Isolation
**What:** Ensuring that messages only reach clients with the same `sessionID`.
**When:** Essential for streamers using the same local network or multiple scenes.
**Example (Go):**
```go
func (h *Hub) Broadcast(msg Message) {
    for client := range h.sessions[msg.SessionID].clients {
        client.send <- msg
    }
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Heavy Polling
**What:** Repeatedly asking the platform for new chat messages.
**Why bad:** Kills performance and increases the risk of being rate-limited.
**Instead:** Use `MutationObserver` in the browser extension.

### Anti-Pattern 2: Global State without Synchronization
**What:** Storing session data only in memory without a way to resync when a client reconnects.
**Why bad:** If OBS refreshes or the dashboard crashes, all context is lost.
**Instead:** Send the last N messages upon a new client connection.

## Scalability Considerations

| Concern | At 10 users | At 1K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Local CPU** | Negligible. | N/A (Self-hosted) | N/A (Self-hosted) |
| **Network Latency** | Low (localhost). | Low (localhost). | Low (localhost). |
| **Memory usage** | ~20MB for Go. | N/A | N/A |

*Note: Since the tool is self-hosted, scalability refers to how it handles a massive chat for a single streamer (e.g., a "raid" with 10k messages per minute). Go is well-suited for this due to its concurrent nature.*

## Sources

- Go Concurrency Patterns (Effective Go)
- MDN Documentation on MutationObserver
- SocialStream.ninja Architecture overview
