# YouTube bootstrap null guard

## Goal
Prevent the YouTube capture from crashing when the chat container is not available yet.

## Problem
The observer attaches immediately to the root node and can throw if the live chat container has not mounted.

## Work
- Guard the `observer.observe(...)` call with a null check.
- Retry attachment until the root node exists.
- Keep the attachment idempotent so retries do not create duplicate observers.

## Done When
- YouTube capture survives slow or delayed popup initialization.
- A missing container does not break the whole script.

