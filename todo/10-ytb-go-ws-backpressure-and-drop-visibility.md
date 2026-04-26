# ytb-go WebSocket backpressure

## Goal
Prevent silent message loss when the overlay client or browser source slows down.

## Problem
The WebSocket client queue is small and drops packets when it fills up without strong visibility.

## Work
- Review the `send` buffer size and enqueue behavior.
- Add a clear strategy for slow consumers: retry, coalesce, or bounded persistence.
- Log or surface dropped packets so production issues are visible.

## Done When
- Burst traffic does not silently disappear.
- Any remaining drop policy is explicit and observable.

