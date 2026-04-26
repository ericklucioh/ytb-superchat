# YouTube observer guard

## Goal
Prevent the YouTube chat capture from breaking when the live chat container is not mounted yet or changes structure.

## Problem
The current bootstrap assumes the target node exists immediately and calls `observer.observe(...)` without a null guard.

## Work
- Add a null check before attaching the observer.
- Retry attachment until the YouTube live chat root exists.
- Keep the capture path idempotent so the observer is not duplicated after retries.

## Done When
- YouTube capture keeps working when the chat popup loads slowly.
- A DOM timing change does not stop the whole capture script.

