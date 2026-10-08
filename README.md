# TaskFlow

Project management for web and Android, on one shared backend.
React (Vite) web app, Expo React Native Android app, Express REST API, PostgreSQL via Prisma. UI follows the **Stockpile** design system (light theme).

| | URL |
|---|---|
| Web + API (Render, one service) | _add after deploy_ |
| Android APK (EAS) | _add EAS build link after `eas build`_ |
| Database | Render PostgreSQL |

## Repo layout
```
apps/api      Express + Prisma (REST API, tests)
apps/web      React + Vite web app
apps/mobile   Expo Android app
packages/shared  Enums, Zod schemas, API types, Stockpile tokens (used by all three)
docs/         API.md, ER.md
```

## Run locally
Requires Node 20+ and PostgreSQL.

```bash
npm install
createdb taskflow
cp apps/api/.env.example apps/api/.env      # edit DATABASE_URL, DIRECT_URL, JWT_SECRET
npx prisma migrate dev -w apps/api          # or: cd apps/api && npx prisma migrate dev
npm run seed -w apps/api                    # fake data
npm run dev:api                             # http://localhost:4000
npm run dev:web                             # http://localhost:5173 (proxies /api to :4000)
npm run dev:mobile                          # Expo; press "a" for Android emulator or scan QR in Expo Go
npm test                                    # API tests (needs the local database)
```
Or the API + Postgres in Docker: `docker compose up --build` (http://localhost:4000). CI runs tests on every push (`.github/workflows/ci.yml`).
Seed login (test data only): `demo@taskflow.test` / `Password123!`. A second seeded user, `other@taskflow.test`, exists to check data isolation.

## Environment variables
| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | api | Postgres connection  |
| `DIRECT_URL` | api | Direct Postgres URL used by migrations  |
| `JWT_SECRET` | api | Long random string used to sign 24h tokens |
| `WEB_ORIGIN` | api | Extra CORS origin(s) for a separately hosted web app (not needed when the API serves the web) |
| `SERVE_WEB` | api | `true` makes the API serve `apps/web/dist` (set by `render.yaml`) |
| `PORT` | api | Defaults to 4000 (Render sets it) |
| `NODE_ENV` | api | `production` makes the cookie `Secure` |
| `EXPO_PUBLIC_API_URL` | mobile | API base, e.g. `https://taskflow-api.onrender.com/api`. Emulator default is `http://10.0.2.2:4000/api` |

## How auth works
- Passwords hashed with bcrypt; JWT valid 24 hours; auth routes rate limited (30 / 15 min per IP).
- **Web:** token in an httpOnly cookie. The API serves the web app, so `/api` is same-origin and the cookie is first-party.
- **Mobile:** token in Expo SecureStore, sent as `Authorization: Bearer`. A `401` clears it and returns to Login with "Your session expired".
- Every query is scoped to the signed-in user. Someone else's project or task returns `404`.

## Deploy (one service on Render)
The API serves the web build too, so web + backend + database are one Blueprint (`render.yaml`).
1. Push the repo to GitHub, then Render Dashboard -> **New -> Blueprint** -> select the repo -> **Apply**. It creates Postgres, runs migrations, seeds demo data and starts the service.
2. The service URL is both the web app and the API (`/api/health`). Free tier sleeps when idle (first request ~30s).

## Run the mobile app against the deployed backend
1. Set `EXPO_PUBLIC_API_URL=https://<service>.onrender.com/api` (in `apps/mobile/eas.json` for builds, or inline for dev).
2. Live in Expo Go: `cd apps/mobile && EXPO_PUBLIC_API_URL=https://<service>.onrender.com/api npx expo start --tunnel`
3. Android APK (cloud build, no Android Studio): `npm i -g eas-cli && eas login && cd apps/mobile && eas init && eas build -p android --profile preview`. EAS prints the APK download link.

## More
[API reference](docs/API.md) · [ER diagram](docs/ER.md)
