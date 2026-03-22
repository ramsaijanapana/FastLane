# Fastlane

Fastlane is a single-codebase Expo app for iPhone, Android, and web. It now includes local auth + sync, native reminder support, backup import/export, hydration tracking, weekly insights, and a lightweight progression loop with XP, streaks, quests, and badges.

## What is included

- Cross-platform React Native app with web support
- Live fasting timer with target presets
- Food logging that automatically closes an active fast
- Meal edit/delete flows and editable fast history
- Hydration logging with daily water goals
- Dashboard, journal, insights, and settings tabs
- Local auth and cloud-style sync through the included backend
- Google and Facebook sign-in routed through the included backend
- Single-origin production web hosting through the Node server
- Secure token storage on native platforms
- Reminder scheduling with Expo Notifications
- Backup export/import using native file-sharing flows
- Fasting stage timeline with encouragement copy
- XP, streak, quests, badge-based gamification, and weekly targets
- Local persistence with AsyncStorage
- Jest test coverage for core utility logic

## Run locally

1. Install Node.js 18 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy environment defaults:

```bash
copy .env.example .env
```

4. Start the included backend:

```bash
npm run server
```

5. Start the Expo app:

```bash
npm run start
```

6. Launch a platform:

```bash
npm run android
npm run ios
npm run web
```

7. Run automated tests:

```bash
npm test
```

## Production web hosting

Fastlane can now be deployed as a single HTTPS web application: the Node server serves the built Expo web app from `dist`, exposes the API on the same origin, and keeps OAuth callbacks on the same domain. That avoids permissive cross-origin production setups.

### Starter deployment stack

This repo is set up for the lowest-friction starter stack that matches the current architecture:

- Web: Fly.io single-machine Docker deploy with a mounted volume for `server/data`
- Mobile builds: Expo EAS Build
- Mobile submission: Expo EAS Submit
- CI/CD: GitHub Actions in `.github/workflows`

This is intentionally simple to start with. It avoids a backend rewrite, works with the current Express server, and keeps one deployment path for the full web app instead of splitting frontend and API across separate services.

### Build and run locally in production mode

```bash
npm run build:web
set NODE_ENV=production
set SERVE_WEB_DIST=1
set ENFORCE_HTTPS=0
set TRUST_PROXY=0
set OAUTH_PUBLIC_BASE_URL=https://your-domain.example
set ALLOWED_WEB_ORIGINS=https://your-domain.example
npm run start:prod
```

### Docker

The repo now includes a production `Dockerfile` and `.dockerignore`.

```bash
docker build -t fastlane .
docker run --env-file .env -p 8080:8080 -v fastlane_data:/app/server/data fastlane
```

### Fly.io

The repo includes [`fly.toml`](./fly.toml) for a single-machine deployment with HTTPS and a mounted data volume:

```bash
fly launch --no-deploy
fly volumes create fastlane_data --size 1 --region iad
fly secrets set FASTLANE_JWT_SECRET=... OAUTH_PUBLIC_BASE_URL=https://your-app.fly.dev GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... FACEBOOK_APP_ID=... FACEBOOK_APP_SECRET=... ALLOWED_WEB_ORIGINS=https://your-app.fly.dev
fly deploy
```

### GitHub Actions web deploy

The workflow in `.github/workflows/deploy-web.yml` will deploy to Fly when `main` changes or when you trigger it manually. It expects this repository secret:

- `FLY_API_TOKEN`

Store the runtime configuration on Fly with `fly secrets set ...` instead of committing production secrets into the repo.

### Render quick start

For the fastest free public URL, the repo now includes [`render.yaml`](./render.yaml) for a Docker-based Render web service.

1. Push this repo to GitHub.
2. In Render, click `New` -> `Blueprint`.
3. Connect the GitHub repo and deploy the Blueprint.
4. Wait for the service `fastlane-fasting-tracker-web` to finish building.
5. Open:

```text
https://fastlane-fasting-tracker-web.onrender.com
https://fastlane-fasting-tracker-web.onrender.com/health
```

Important limits of the free Render path:

- Render says free web services spin down after 15 minutes idle.
- Render also says local filesystem changes are lost on redeploy, restart, or spin-down.
- This app currently stores auth/sync data locally on disk, so the free Render deployment is suitable for public testing, not durable production data.

If you later rename the Render service or attach a custom domain, update these env vars in the Render dashboard and redeploy:

```text
OAUTH_PUBLIC_BASE_URL
ALLOWED_WEB_ORIGINS
```

## iOS and Android deployment

The repo now includes GitHub Actions workflows and EAS build profiles for native deployment:

- `.github/workflows/mobile-preview.yml`
  Runs internal preview builds for Android and iOS using the `preview` EAS profile.
- `.github/workflows/mobile-release.yml`
  Runs a manual production build for Android or iOS and can optionally auto-submit with EAS Submit.
- `eas.json`
  Defines `development`, `preview`, and `production` build profiles.

### Required setup before native releases

1. Create or log in to your Expo account.
2. Run `eas login`.
3. Run your first `eas build` or `eas build:configure` so Expo links the project to EAS.
4. Add the required repository secret for CI:

```text
EXPO_TOKEN
```

### Native build commands

```bash
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

### Store submission notes

- Android requires one manual upload to Google Play at least once before fully automated submissions work.
- iOS App Store submission requires an Apple Developer account and App Store Connect configuration.
- Preview builds are the cheapest path to start testing on devices before store release.

## Google and Facebook login

Fastlane now supports Google and Facebook sign-in through the included Node backend. The app opens the provider login in a browser, the backend completes the OAuth exchange, and the app then receives a normal Fastlane session for sync.

1. Copy `.env.example` to `.env`.
2. Set these variables:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000
OAUTH_PUBLIC_BASE_URL=http://localhost:4000
ALLOWED_WEB_ORIGINS=http://localhost:19006
GOOGLE_OAUTH_CLIENT_ID=your-google-web-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-google-web-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

3. Register these callback URLs with the providers:

```text
Google:   {OAUTH_PUBLIC_BASE_URL}/auth/oauth/google/callback
Facebook: {OAUTH_PUBLIC_BASE_URL}/auth/oauth/facebook/callback
```

4. For a hosted web app, register your production HTTPS origin in both providers and set `ALLOWED_WEB_ORIGINS` to the same HTTPS origin.
5. Keep the Expo app scheme as `fastlane` so the backend can hand control back to the mobile app after login.

### Enabling Google and Facebook after the first Render deploy

Once the Render URL is live, add these environment variables in the Render dashboard:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
FACEBOOK_APP_ID
FACEBOOK_APP_SECRET
```

Then register the live callback URLs with each provider and redeploy the service.

## Security model

- Production startup now refuses to run with the default JWT secret.
- JWTs are signed with issuer and audience claims and verified on every authenticated API request.
- The server enables security headers, HSTS in production, compression, JSON size limits, and custom 404/error responses.
- Auth and sync endpoints are rate-limited in memory for a single-machine deployment.
- The web build is served from the same origin as the API to reduce CORS exposure.
- Checked-in runtime data was removed from version control; `server/data/db.json` is created at runtime instead.

## Notes

- The fasting stages are framed as common milestones, not medical advice.
- For local web development, the default backend URL is `http://localhost:4000`.
- For hosted web deployments, `EXPO_PUBLIC_API_URL` can be omitted and the app will use the current site origin automatically.
- For physical devices, social login needs the backend to be reachable by Google and Facebook. Use a public HTTPS URL or a tunnel, then set `OAUTH_PUBLIC_BASE_URL` to that public backend URL.
- For the simplest physical-device setup, point both `EXPO_PUBLIC_API_URL` and `OAUTH_PUBLIC_BASE_URL` at the same public HTTPS backend URL.
- The current persistence layer is a file-backed JSON store intended for a single-machine deployment. For multi-instance or high-availability production, move persistence to a managed database before scaling out.
- Native release config is included through `app.json`, generated assets in `assets/`, and `eas.json`.
- Apple allows free local on-device testing, but App Store distribution requires the paid Apple Developer Program.
