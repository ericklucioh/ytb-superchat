# Technology Stack

**Analysis Date:** 2024-04-14

## Languages

**Primary:**
- JavaScript (ESM) - Used in Chrome Extension content scripts, service worker, and the dashboard frontend (`src/site/`, `extension/`).
- HTML/CSS - Used for the dashboard UI and extension options (`src/index.html`, `extension/main.css`).

**Secondary:**
- Go (1.22) - Used for a skeletal backend API (`ytb-go/`). Currently mostly placeholders.
- Node.js - Used for build and development automation scripts (`src/scripts/`).

## Runtime

**Environment:**
- Browser (Chrome, Firefox, Edge) - Primary execution environment via the Chrome Extension and web dashboard.
- Node.js (v18+) - Used for local development and building the extension zip.

**Package Manager:**
- npm - Used for defining scripts in `package.json`. No external npm dependencies are currently listed (uses native APIs).
- Lockfile: `package-lock.json` present but empty/minimal.

## Frameworks

**Core:**
- Chrome Extension API (Manifest V3) - The backbone of the message relay system.
- Native Web APIs (WebSockets, postMessage, IntersectionObserver) - Used for real-time communication and UI management.

**Testing:**
- Not detected - No test suites or framework configurations found.

**Build/Dev:**
- Custom Node.js scripts - `src/scripts/build.mjs` handles building the extension and preparing the static site.

## Key Dependencies

**Critical:**
- jQuery (v3.x) - Included locally in `extension/jquery.js` for DOM manipulation in some content scripts.

**Infrastructure:**
- None - The project emphasizes zero-dependency native JavaScript.

## Configuration

**Environment:**
- `.env.example` - Template for environment variables.
- `manifest.json` - Configures the Chrome extension permissions and scripts.

**Build:**
- `src/scripts/build.mjs` - Main build orchestration.
- `src/scripts/serve.mjs` - Local development server.

## Platform Requirements

**Development:**
- Node.js and npm for building.
- Go (v1.22) if developing the backend.

**Production:**
- Chrome-compatible browser for the extension.
- Static hosting for the dashboard (`ytb.ericklucioh.com`).

---

*Stack analysis: 2024-04-14*
