# ytb-go session persistence and history

## Goal
Make session state more durable and useful for support.

## Problem
Sessions, overlay state and event history live only in memory and the event history is capped at 50 items.

## Work
- Decide whether to persist session state across restarts or keep the current in-memory model as an explicit limitation.
- Increase or redesign the event history limit for operational support.
- Make the restart behavior clear to users and operators.

## Done When
- The restart story is explicit and acceptable for production.
- Event history is sufficient for debugging real usage.

