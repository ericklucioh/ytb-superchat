# ytb-go auth and CORS hardening

## Goal
Protect the Go backend so it can be exposed for a real client without accepting arbitrary event injection.

## Problem
The HTTP API and WebSocket endpoints are open and CORS currently allows any origin.

## Work
- Add authentication or a trusted-session gate for `/api/event`, `/api/session`, `/api/rooms`, `/ws` and `/overlay`.
- Replace permissive CORS with an allowlist or local-only policy.
- Keep the local developer flow working without extra friction.

## Done When
- Untrusted origins cannot inject or read session state.
- Local development still works with explicit trusted origins.

