# Service worker backlog recovery

## Goal
Confirm that backlog replay survives service worker restarts and page reloads.

## Problem
The worker now owns the persistent backlog and dedup state for the dashboard bridge.

## Work
- Test hydration from `chrome.storage.session`.
- Test replay after worker restart.
- Test dashboard reconnect while source messages are still arriving.

## Done When
- Previously delivered events are recovered after restart.
- The dashboard receives the stored backlog in the correct order.

