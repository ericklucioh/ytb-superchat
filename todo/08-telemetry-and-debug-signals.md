# Telemetry and debug signals

## Goal
Make future production support easier without adding heavy instrumentation.

## Work
- Add minimal debug signals for reconnects, ack timeouts and backlog hydration.
- Keep logs concise and session-scoped.
- Expose enough state to diagnose message loss or duplicate delivery.

## Done When
- A failed session can be explained from logs alone.
- Debug output is low noise and useful in production support.

