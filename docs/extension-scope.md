# Extension Scope

## Main Maintained Path

The extension should be understood primarily as a capture bridge for:

- YouTube live chat
- Twitch pop-out chat

Kick support exists in the codebase, but should be treated as secondary until validated in the target environment.

## Legacy Integrations

The `extension/sources/` directory still contains older or less-central integrations. They remain in the repository for historical continuity and possible future cleanup, but they are not the main promise of the project.

If you are evaluating the project publicly, judge the extension primarily by the maintained flow above, not by the total number of source scripts.

## Responsibilities

The extension is responsible for:

- reading chat page DOM
- normalizing chat messages
- delivering events to the dashboard bridge

The extension is not responsible for:

- serving the OBS overlay
- storing shared session state
- acting as the system of record

Those concerns live in the dashboard and Go backend.
