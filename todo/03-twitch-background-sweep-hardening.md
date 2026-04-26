# Twitch background sweep hardening

## Goal
Reduce CPU cost in Twitch while the popup is in background without regressing capture reliability.

## Problem
The Twitch source still uses periodic sweep logic on the whole document as a fallback.

## Work
- Keep MutationObserver as the primary capture mechanism.
- Limit background sweep frequency and scope.
- Revisit whether delayed rescans can be narrowed further or removed.

## Done When
- The Twitch popup stays lighter in background.
- The fallback still recovers missed nodes when the DOM shape changes.

