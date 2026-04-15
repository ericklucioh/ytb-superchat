# Technology Stack

**Project:** YTB Superchat
**Researched:** May 2024

## Recommended Stack

### Capture Layer (Browser Extension)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| JavaScript (Vanilla) | ES6+ | DOM Scraping | Lowest overhead for content scripts; avoids library bloat in platform tabs. |
| MutationObserver | Native | Chat Monitoring | Industry standard for real-time DOM changes; bypasses polling. |
| Chrome/Edge/Firefox | Modern | Runtime Environment | High compatibility with platform chat pages. |

### Distribution Layer (Local Server)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Go | 1.22+ | Backend Server | High performance, single binary deployment, low memory footprint. |
| Gorilla/WS (or similar) | Latest | WebSockets | Real-time communication between dashboard, extension, and OBS. |
| Embed (Go feature) | Native | Static File Serving | Packages UI/assets inside the Go binary for "one-click" runs. |

### UI Layer (Dashboard & Overlay)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| HTML5/CSS3 | Modern | Streamer View | Standard for OBS browser sources and local dashboards. |
| Vanilla JS / jQuery | N/A | UI Interactions | Existing project uses these for dashboard logic; maintains simplicity. |
| LocalStorage | Native | Persistence | Stores session IDs and basic preferences without a local database. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Capture | Extension Scraping | Official API Polling | YouTube API is expensive/rate-limited; Twitch API requires OAuth flow. |
| Backend | Go | Node.js (Electron) | Go produces a smaller, faster standalone executable without the Node runtime overhead. |
| Communication | WebSockets | WebRTC (P2P) | WebRTC is great for browser-to-browser but overkill for local server-to-browser; WebSockets are simpler for Go. |

## Installation

```bash
# Backend (Go)
cd ytb-go
go mod download
go build ./cmd/ytb-go

# Frontend (Dashboard)
npm install
npm run dev

# Extension
# Load unpacked in chrome://extensions
```

## Sources

- SocialStream.ninja GitHub (Steve Seguin)
- Chatty Open Source Documentation
- Gorilla WebSocket Performance Benchmarks
- Reddit /r/Twitch (Community feedback on performance)
