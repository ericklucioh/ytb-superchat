# Production dependency audit

## Goal
Find any external dependency that can still block chat capture in real usage.

## Work
- Inventory external HTTP calls made by the extension sources.
- Classify which ones are critical, optional or debug-only.
- Remove or downgrade any call that can delay message delivery.

## Done When
- The capture path has no unnecessary third-party dependency.
- Any remaining network calls are clearly optional.

