# Twitch avatar lookup out of critical path

## Goal
Make Twitch message delivery immediate even when avatar lookup is slow or unavailable.

## Problem
The current flow waits for `api.socialstream.ninja` before sending the event if the local avatar is missing, and the message is marked as sent before the delivery finishes.

## Work
- Send the Twitch event as soon as capture succeeds.
- Move avatar enrichment to a non-blocking path.
- Avoid marking the DOM as fully delivered before the event is handed off.

## Done When
- A slow avatar request cannot delay the chat event.
- Twitch still delivers messages if the avatar endpoint is down.

