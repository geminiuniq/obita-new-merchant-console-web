# Frontend (Legacy)

Static SPA from before the backend was wired in. Preserved as the visual /
design baseline for the new `frontend/` to evolve toward — the design tokens,
component patterns, and editorial direction in [`design.md`](design.md) remain
authoritative.

This directory is **not** part of the runtime build. It is reference-only.

## Files

| File | Notes |
|---|---|
| `index.html` (1727 lines) | Original SPA shell |
| `app.js` (25,601 lines) | All UI logic + inline mock data |
| `styles.css` (4432 lines) | Design tokens + component styles |
| `banner_bg.png` | Hero banner asset |
| `design.md` | Editorial design system spec — referenced by future frontend |

## Why kept

The new `frontend/` demo focuses on proving the backend works end-to-end (4
flows). It deliberately does **not** try to reproduce 25k lines of UI in one
session. When the backend team completes their integration and the design
team picks up production frontend work, this directory is the visual brief.
