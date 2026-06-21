# Public Release Notes

## Goal

This repository was sanitized to make it safer and more coherent as a public portfolio project.

## Main Changes In The Public Version

- removed shared token injection from browser runtime state
- removed token propagation through overlay URLs
- removed token propagation through WebSocket URLs
- reduced hardcoded references to private personal domains in the main public path
- replaced internal planning material with public-facing documentation
- tightened README and scope messaging around supported flow and limitations

## What Was Intentionally Kept

- the existing product structure
- the current frontend, extension, and Go backend split
- the working local development flow
- existing tests where still relevant

## What Still Needs Future Improvement

- split larger JS modules into smaller units
- reduce legacy integration surface in the extension
- add richer portfolio artifacts such as screenshots or a GIF demo
- strengthen production deployment guidance beyond local/self-hosted use
