# Fastlane Handover

This file is the quickest way to continue Fastlane on another PC without having to reconstruct context from chat history.

## Project Summary

- App name: `Fastlane`
- Repo: `https://github.com/ramsaijanapana/FastLane.git`
- Stack: Expo + React Native + React Native Web + Express
- Platforms: Web, Android, iOS
- Current branch target: `main`
- Purpose: fasting tracking, meal logging, calorie tracking, hydration tracking, gamified streak/quest loop, auth/sync, Google/Facebook login support

## Current Status

As of the latest tested state:

- Dashboard is a fixed-window style home screen instead of one long page
- Fasting stages use a segmented circular dial
- Active fast start time can be corrected with a dropdown-style picker overlay
- Journal supports:
  - manual meal logging
  - calorie logging
  - plain-language food estimation, for example `large latte`
  - food/drink code scanning entry point
- Insights and Account screens are compacted from the earlier long-scroll version
- Theme switching is implemented
- Local auth, sync, Google login, and Facebook login flows exist in the codebase
- Starter web deployment is set up for Render and Fly

## Most Important Files

App shell and state:

- `src/AppShell.tsx`
- `src/constants.ts`
- `src/types.ts`
- `src/utils.ts`
- `src/theme.ts`

Main screens:

- `src/screens/DashboardScreen.tsx`
- `src/screens/JournalScreen.tsx`
- `src/screens/InsightsScreen.tsx`
- `src/screens/SettingsScreen.tsx`

Shared UI:

- `src/components/ui.tsx`

Client services:

- `src/services/api.ts`
- `src/services/authStorage.ts`
- `src/services/socialAuth.ts`
- `src/services/foodEstimate.ts`
- `src/services/foodLookup.ts`
- `src/services/backup.ts`
- `src/services/haptics.ts`
- `src/services/notifications.native.ts`
- `src/services/notifications.web.ts`

Backend:

- `server/index.js`

Deployment config:

- `app.json`
- `eas.json`
- `render.yaml`
- `fly.toml`
- `Dockerfile`

Tests:

- `__tests__/utils.test.ts`
- `__tests__/foodEstimate.test.ts`
- `__tests__/foodLookup.test.ts`

## What Was Recently Changed

Most recent functional work:

1. Fixed the active-fast start time editor so it opens as a centered overlay instead of being clipped inside the dashboard card.
2. Kept the picker in dropdown form with:
   - `Date`
   - `Hour`
   - `Min`
   - `AM / PM`
3. Re-verified the browser flows after the overlay change.

Recent commits before this handover:

- `ced6d43` Fix start time editor overlay
- `3f270c2` Polish fast start picker controls
- `163c0ad` Add plain-language meal calorie estimation
- `2ce1148` Add fast start editing and food code scanning

## What Has Been Verified

Automated verification that passed on the working machine:

- `npm run typecheck`
- `npm test -- --runInBand`
- `npm run build:web`

Browser smoke flow that passed:

- register
- logout
- login
- theme save
- start fast
- meal logging
- calorie tracking
- water logging
- fast history edit
- insights view
- manual cloud push

Additional targeted browser checks that passed:

- open the active-fast start time editor
- confirm `Apply Start Time` stays inside the viewport
- adjust a running fast start time back by 3 hours
- verify the timer updates
- confirm `Scan Food / Drink Code` is visible
- confirm plain-language estimation fills expected values, such as `large latte` -> `Latte` and `247`

## Setup On A New PC

### 1. Install prerequisites

- Git
- Node.js 18+ (LTS is fine)
- npm
- Optional:
  - Android Studio for Android device/emulator work
  - Xcode for iOS work on macOS
  - Expo account for EAS builds

### 2. Clone the repo

```bash
git clone https://github.com/ramsaijanapana/FastLane.git
cd FastLane
```

### 3. Install packages

```bash
npm install
```

### 4. Create local environment file

Copy `.env.example` to `.env`.

Windows:

```bash
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Minimum local values are already scaffolded in `.env.example`.

Important values:

- `PORT=4000`
- `EXPO_PUBLIC_API_URL=http://localhost:4000`
- `OAUTH_PUBLIC_BASE_URL=http://localhost:4000`
- `ALLOWED_WEB_ORIGINS=http://localhost:19006,http://127.0.0.1:19006`

### 5. Start the backend

```bash
npm run server
```

### 6. Start the app

For Expo dev:

```bash
npm run start
```

Or directly for web:

```bash
npm run web
```

### 7. Run checks

```bash
npm run typecheck
npm test -- --runInBand
npm run build:web
```

## Local Production-Style Web Run

If you want the single-origin web app behavior locally:

```bash
npm run build:web
set NODE_ENV=production
set SERVE_WEB_DIST=1
set ENFORCE_HTTPS=0
set TRUST_PROXY=0
npm run start:prod
```

Then open the local server URL shown by Express.

## Secrets And Non-Repo Items To Transfer Separately

Do not rely on git for these:

- `.env`
- Google OAuth client ID and secret
- Facebook app ID and secret
- `FASTLANE_JWT_SECRET`
- Expo token if using EAS
- Fly token if deploying with Fly
- Apple / Google Play credentials if doing native release work

If social login or hosted deployment needs to work immediately on the new PC, transfer the real `.env` values securely outside git.

## Deployment Notes

Web deployment options already wired in the repo:

- Render via `render.yaml`
- Fly via `fly.toml`

Native deployment setup already present:

- `eas.json`
- `.github/workflows/mobile-preview.yml`
- `.github/workflows/mobile-release.yml`

Important limitation:

- persistence is still file-backed on the backend
- that is okay for local work and simple single-machine hosting
- for serious multi-instance production, this should move to a real database

## Known Practical Notes

- On some Windows shells, `node` or `npm` may not resolve until a new terminal session is opened after Node installation.
- If that happens, reopen the terminal first.
- If it still fails, use:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
```

- Camera-based scanning on iOS/Android requires a rebuild after native dependency changes.
- Web camera scanning works on `localhost` or HTTPS.

## Good First Checks On The New Machine

If you want to confirm the environment is healthy quickly:

1. Run `npm install`
2. Run `npm run typecheck`
3. Run `npm test -- --runInBand`
4. Run `npm run build:web`
5. Start backend with `npm run server`
6. Start Expo web with `npm run web`
7. Verify these flows manually:
   - start a fast
   - edit the start time
   - log food with calories
   - estimate food from words
   - add water
   - open insights
   - change theme

## Suggested Next Work

If work continues from here, the most sensible next buckets are:

1. Production hardening
   - move persistence from local JSON to a database
   - add stronger integration tests
   - tighten release/build automation

2. UX polish
   - continue refining the dashboard home layout
   - improve mobile spacing in the compact views
   - add better visual feedback around syncing and scan flows

3. Native release readiness
   - rebuild with the latest native dependency set
   - verify camera, notifications, and social auth on real devices
   - complete App Store / Play Console setup

## Short Resume Prompt

If another person or another Codex session picks this up, this prompt is enough to restart with context:

> Continue work on the Fastlane Expo/React Native fasting tracker. The repo already includes dashboard, journal, insights, account screens, auth/sync, social login wiring, hydration, food estimation, food scanning, theming, and deployment config. Start by reading `HANDOVER.md`, `README.md`, `src/AppShell.tsx`, and `src/screens/DashboardScreen.tsx`, then continue from the latest `main` branch state.
