# Performance and Architecture Review

This document captures the main architectural and performance risks in the project and turns them into a concrete follow-up plan.

## Current State

The project is in a much better place than the original monolith:

- The runtime is split into smaller modules.
- The OBS overlay payload is separated from the streamer dashboard.
- Twitch/YouTube/Kick capture still works through the extension.
- The dashboard now reuses DOM nodes instead of clearing and rebuilding every list on every render.
- Currency conversion is only used for streamer-side ranking and totals, not for the OBS overlay.

That said, there are still a few risks that will matter more as the stream gets longer and the message volume increases.

## Main Risks

### 1. Monetized history can grow without bound

Chat messages are capped, but monetized events are not:

- superchats
- Twitch subs
- YouTube members

That means the stored history can keep growing for the entire session.

Why this matters:

- `localStorage` grows with every monetized event.
- Sorting and filtering get more expensive as history increases.
- Long streams can eventually hit browser storage or slow down the dashboard.

### 2. The dashboard still recomputes too much on every render

Even after the incremental DOM update work, the render path still does a lot of full-collection processing:

- filters all visible events
- sorts the collections
- decorates every superchat with currency data
- recomputes totals
- warms currency rates by scanning the full superchat list again

Why this matters:

- the UI feels heavier as the history grows
- CPU usage increases with stream duration
- the performance cost scales with total history instead of just new events

### 3. Twitch capture is still the most fragile input path

Twitch relies on DOM observers, wrapper scanning, and delayed rescans.

Why this matters:

- Twitch re-renders can trigger extra work
- layout changes can break selectors
- retry/rescan logic is necessary, but it can also become expensive under heavy chat activity

### 4. Settings are cached now, but the transport is still coupled to configuration

The extension no longer reads `chrome.storage` on every send, which is good.

But the message send path still mixes:

- transport
- payload envelope
- settings attachment

Why this matters:

- the data flow is harder to reason about
- transport and configuration are still not fully separated
- future changes risk reintroducing per-message overhead

## Recommended Follow-Up Order

### Step 1. Add a retention policy for monetized events

Keep chat messages capped, but introduce a separate bounded policy for monetized history.

Recommended approach:

- keep the latest monetized events visible
- evict oldest monetized events only after a deliberate threshold
- make the threshold separate from live chat and easy to tune

Goal:

- prevent unbounded growth without losing the useful recent history

### Step 2. Make streamer-side aggregation incremental

The dashboard should stop treating every render as a full recomputation.

Recommended approach:

- cache derived views for superchats and priority events
- update totals incrementally when new events arrive
- avoid re-warming currency rates for the entire collection on every render

Goal:

- keep UI cost closer to "new data only" instead of "whole history again"

### Step 3. Reduce Twitch rescanning

Twitch should keep correctness first, but avoid rescanning empty wrappers whenever possible.

Recommended approach:

- only queue delayed rescans when the wrapper actually contains content
- prefer message-node dedupe over broad subtree walking
- keep the observer scoped as narrowly as practical

Goal:

- reduce duplicate work when Twitch re-renders aggressively

### Step 4. Separate transport from settings in the extension

Keep the cache, but move toward a clearer message pipeline.

Recommended approach:

- keep session settings in a dedicated cache object
- make bridge sending accept already-prepared metadata
- avoid attaching settings in the hot path when they are not needed

Goal:

- reduce per-message overhead and make future debugging easier

## Success Criteria

This review should be considered resolved when:

- monetized history no longer grows forever
- dashboard render cost stays bounded as the stream gets long
- Twitch capture remains stable without excessive rescans
- the extension no longer performs avoidable work on each message
- the OBS overlay behavior remains unchanged

## Notes For Future Work

- Do not reintroduce a full-list rebuild in the dashboard.
- Do not let monetized events share the same retention policy as live chat.
- Prefer incremental caches over repeated full scans.
- Any future performance work should preserve the current OBS payload contract.

## Suggested Implementation Checklist

1. Add a bounded monetized-events retention policy.
2. Introduce incremental derived-state caching for the streamer dashboard.
3. Tighten Twitch observer/rescan behavior.
4. Split extension transport and configuration concerns further if needed.
5. Re-test with a long chat session and confirm memory/CPU stay stable.

