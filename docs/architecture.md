# Architecture

## Purpose

YTB Superchat centralizes live chat capture and turns selected messages into an OBS-ready overlay.

## Main Components

### Extension

The browser extension is responsible for:

- reading supported live chat pages
- normalizing raw DOM content into message payloads
- forwarding chat events into the local dashboard bridge

The extension is not the overlay renderer.

### Portal

The portal is a static frontend that:

- receives normalized chat events
- manages UI state and filters in the browser
- lets the streamer pick which message should be shown on stream
- pushes the selected overlay payload to the backend

There are two session concepts:

- `bridge session`: links extension and dashboard
- `overlay session`: identifies the overlay state served by the backend

These two sessions are intentionally separate so that dashboard capture flow and OBS overlay flow do not overwrite each other accidentally.

### Go Backend

The Go backend is the shared state layer. It:

- stores session state in memory
- serves the overlay assets
- exposes HTTP endpoints for session and event operations
- broadcasts updates over WebSocket

It does not capture chat directly.

## Request Flow

1. A supported chat page is open in the browser.
2. The extension extracts message data from the page DOM.
3. The extension forwards normalized data to the dashboard bridge.
4. The dashboard stores, filters, and renders those events.
5. When the streamer selects a message, the portal sends an overlay event to the backend.
6. The backend updates the session state and broadcasts the change.
7. The OBS browser source consumes `/overlay?session=...` and updates in realtime.

## State Boundaries

### Browser-local state

- dashboard filters
- local card state
- bridge session persistence
- overlay session persistence

### Backend shared state

- latest overlay payload per session
- event history per session
- connected WebSocket rooms

## Public Repo Boundaries

This public version intentionally avoids pushing a shared secret into browser runtime state. That keeps the repo safer to publish, but also means the default setup should be treated as:

- local development
- self-hosted usage
- demo and portfolio flow

If you need stronger production controls, add auth in front of the backend rather than distributing a client-side secret.
