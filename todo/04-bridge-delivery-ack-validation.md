# Bridge delivery ack validation

## Goal
Validate the new source-to-worker delivery contract before production.

## Problem
The bridge now relies on pending queues, persistent storage and explicit acks. That needs real validation.

## Work
- Verify that `publish` packets are acked exactly once.
- Verify that duplicates do not grow the pending queue.
- Verify that reconnects and session switches do not leave stale pending state.

## Done When
- The ack/pending flow is confirmed to be idempotent.
- No duplicate chat event appears in the dashboard during reconnect tests.

