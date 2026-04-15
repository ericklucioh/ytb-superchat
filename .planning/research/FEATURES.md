# Feature Landscape: Local Streaming Server

**Domain:** OBS Browser Source Utilities
**Researched:** May 2024

## Table Stakes

Features users expect in a local streaming utility.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| WebSocket Bridge | Real-time updates to OBS. | Medium | Requires robust Hub-Client implementation. |
| Static Overlay Serving | OBS needs to load the HTML/CSS/JS. | Low | Use `embed` for single-binary ease. |
| Health Monitoring | Ensure the server is up and responding. | Low | Simple `/health` endpoint. |
| Auto-Reconnect | Clients (OBS) must survive server restarts. | Low | Handled in JS client logic. |

## Differentiators

Features that set this project apart.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single-Binary Dist | No Node.js/Python dependency for end-user. | Low | Enabled by Go's `embed`. |
| Zero-Alloc Messaging | Minimal impact on streamer's PC. | Medium | Use `sync.Pool` for buffers. |
| Multi-Platform Support | Serve Twitch, YT, etc., from one local hub. | High | Requires multiple source integrations. |
| Secure Local Overlay | Only allow local or authorized connections. | Medium | Origin/IP checking middleware. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| External Database | Overkill for a local utility; adds complexity. | Use in-memory state (`sync.Map`). |
| Heavy Frameworks | Unnecessary memory/binary bloat. | Use Go Standard Library. |
| Cloud Sync | Privacy concerns for streamers; complexity. | Keep all data local. |

## Feature Dependencies

```
Static Overlay Serving → WebSocket Bridge (Overlays need WS to receive data)
WebSocket Bridge → Zero-Alloc Messaging (Performance optimization)
```

## MVP Recommendation

Prioritize:
1. **Static Overlay Serving**: Foundation for OBS Browser Source.
2. **WebSocket Bridge**: Core functionality for real-time updates.
3. **Single-Binary Dist**: Crucial for user adoption (low friction).

Defer: **Zero-Alloc Messaging** (until load testing shows it's necessary).

## Sources

- OBS Studio Browser Source Documentation
- Community Best Practices for Local Streaming Tools
