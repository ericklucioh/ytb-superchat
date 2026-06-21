# Security Model

## Current Public-Repo Position

This repository is published in a safer public form than the original working copy:

- no shared API token is injected into browser runtime state
- no token is appended to overlay URLs
- no token is appended to WebSocket URLs
- browser clients are treated as public clients

## Trust Boundary

Default trusted boundary:

- your local machine
- your own browser session
- your self-hosted backend instance

Default untrusted boundary:

- arbitrary external clients
- any browser page outside the supported local/dev flow
- remote users consuming the code without additional hardening

## What This Means In Practice

The current public version is appropriate for:

- local development
- demo environments
- self-hosted use where you control access to the backend

It is not a full production auth model by itself.

## Recommended Hardening For Real Production

If you want to expose the backend on the internet for real users:

- put the backend behind a reverse proxy or authenticated edge
- restrict who can reach session/event endpoints
- enforce origin/network rules outside the browser
- add server-issued short-lived credentials if public clients must authenticate
- add durable session persistence and operational monitoring

## Remaining Risks

- supported chat pages may change their DOM structure and break capture
- in-memory session state can be lost on process restart
- the extension still includes legacy integrations that widen perceived surface area

## Deliberate Tradeoff

The previous approach of sending a global secret to the browser was removed because it is a bad fit for a public repository and a poor signal in a portfolio project. The current repo favors safer publication and clearer boundaries over pretending to have production-grade auth inside a static/browser-driven client flow.
