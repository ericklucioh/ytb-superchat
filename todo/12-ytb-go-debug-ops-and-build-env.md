# ytb-go debug and build ops

## Goal
Improve supportability and remove environment-specific friction during builds and validation.

## Problem
The Go tests pass, but the build environment can still fail on cache cleanup and the current logs are mostly operational rather than diagnostic.

## Work
- Make the Go test/build flow work cleanly in the intended environment.
- Add minimal diagnostic logs or metrics for session creation, event drops and reconnects.
- Document the expected cache or build directory setup for local and production use.

## Done When
- CI or local validation runs without cache-related surprises.
- Operators can diagnose backend issues from logs.

