# Twitch background sweep review

## Goal
Reduce background work in Twitch without regressing recovery of missed nodes.

## Problem
The Twitch fallback still runs a periodic sweep over the full document in background mode.

## Work
- Reassess whether the 15s fallback sweep is still needed.
- Narrow the sweep scope or remove it if the observer plus delayed rescans are enough.
- Measure the cost of delayed rescans in long-lived background tabs.

## Done When
- Background Twitch uses the minimum work needed to stay reliable.
- No unnecessary full-document sweep remains unless it is proven necessary.

