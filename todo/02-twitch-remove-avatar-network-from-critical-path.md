# Twitch avatar fetch off critical path

## Goal
Remove third-party avatar lookup from the message delivery path in Twitch.

## Problem
The current Twitch flow waits for an external avatar request before sending the chat event when the local avatar is missing.

## Work
- Send the chat event immediately after capture.
- Resolve avatar enrichment asynchronously, or fall back to the local default avatar.
- Do not let a failed or slow avatar request delay `pushFeedMessage`.

## Done When
- Twitch messages reach the bridge even if the avatar endpoint is slow or down.
- No network dependency remains between capture and delivery.

