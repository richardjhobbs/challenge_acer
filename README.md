# Acer Challenge

This repository hosts a standalone HTML build of the Acer Challenge game.

## Local preview

Open `index.html` directly in a browser, or serve it with any static file server.

## Hosting notes (Codex + Vercel)

- **Static hosting is enough today.** The app is a single HTML file with inlined CSS/JS.
- **SpeechSynthesis is best-effort.** UK female voice selection varies by device, and speech often requires a user gesture. Keep it tied to button clicks.
- **Determinism for multiplayer.** Client-side randomness is fine for single-player, but a multiplayer mode should receive a seed from the server so all clients share the same tiles and target.
- **Timing integrity.** Do not trust client timers for competitive results; validate with server timestamps and accept submissions only within the server window.
- **Solver cost.** The best-answer solver runs in the browser and may spike on low-end devices; move it server-side or precompute for competitive play.
- **State machine.** The reveal sequence is an implicit state machine; formalize it (LOBBY, REVEALING, TARGET_ROLLING, READY, RUNNING, FINISHED) to prevent desync.
- **Realtime needs.** Multiplayer will require a backend (Vercel serverless functions or another service) plus a realtime channel (WebSockets).

## Vercel quick deploy

1. Push this repository to GitHub.
2. In Vercel, import the repo and deploy as a static site.
3. Set the project root to the repository root; the output is `index.html`.

