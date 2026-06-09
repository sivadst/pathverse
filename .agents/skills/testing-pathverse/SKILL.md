---
name: testing-pathverse
description: Test the PathVerse local browser UI, including product cockpit mentor/resume flows and the GPU ops command center.
---

# Testing PathVerse

Use this skill when validating PathVerse browser behavior end-to-end on a local Devin VM.

## Devin Secrets Needed

- None for local UI validation.

## Local Setup

1. Use Node 22 from nvm:
   ```bash
   source "$HOME/.nvm/nvm.sh"
   nvm use 22
   ```
2. Install dependencies if needed:
   ```bash
   npm install
   ```
3. Start the dev server from the repo root:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000/` in Chrome.

## Primary UI Assertions

### Product cockpit (`/`)

- Header should show `PathVerse`, `AI growth operating system`, and an `Ops` link/button.
- Voice toggle (`aria-label="Toggle voice assistant"`) and theme toggle (`aria-label="Toggle theme"`) should visibly change icon/state.
- In `AI Career Mentor`, submitting `resume advice` should append a mentor answer beginning `Lead with measurable AI product outcomes`.
- In `AI Resume Analyzer`, clicking `Analyze resume signal` with the default resume text should show `ATS prediction` score `92` and include `Strong ownership verbs are present.`

### GPU ops (`/ops`)

- Navigate using the visible `Open GPU ops` link or `/ops` URL.
- Expected healthy state: boot overlay clears and shows `PATHVERSE AI COMMAND GRID` plus `Realtime Navigation OS`.
- Initial status tiles should show `Winner` as `Standby`, `Path Cost` as `--`, and `Race Events` as `0` before running a battle.
- `Run Battle` should change `Winner` away from `Standby` and change `Path Cost` to a numeric value.
- Command shell input placeholder is `simulate | predict | train | battle`; entering `train` should append `Neural core trained for 24 epochs.`

## Troubleshooting Notes

- `/ops` might show a Next.js hydration mismatch overlay if server-rendered and client-rendered command-center telemetry diverge. Inspect `components/command-center/command-center.tsx` `StatusTile` values and non-deterministic initial state in `src/engine/state/use-command-center-store.ts` / `src/engine/ai/neural-learning-engine.ts`.
- If `/ops` is blocked by a hydration overlay, do not claim `Run Battle` or command shell behavior passed; mark those assertions untested and capture the overlay screenshot.
- If Next warns about multiple lockfiles, check for an accidental `/home/ubuntu/package-lock.json` created by running npm outside the repo root.
