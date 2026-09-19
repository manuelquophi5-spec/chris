# UG Attend (`ug_attend`) — University of Ghana

Mobile-first geofenced attendance PWA for the University of Ghana (Legon campus). Students check in via the browser **Geolocation API**; the server verifies they are inside a configured campus geofence using the **Haversine formula**.

See [docs/SCHOOL_SETUP_AND_DASHBOARDS.md](docs/SCHOOL_SETUP_AND_DASHBOARDS.md) for admin setup (campuses → users → classes → enrollments).

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **MongoDB Atlas** + **Mongoose**
- **JWT** (`jose`) + **bcrypt** for auth
- **Vercel** deployment

## Roles

| Role | Capabilities |
|------|----------------|
| `user` | **One check-in + one check-out per day** (GPS + geofence), today status, history by day |
| `admin` | **Geofence admin** (`/dashboard/admin`) — Leaflet map, create/edit sites, radius slider, enable/disable; mark attendance; view all attendance |

## Class QR (one code, check-in and check-out)

Each class has a single QR (admin → Classes → select class). The token carries only the class; the server decides the direction from the student's attendance for the day (`lib/qr-toggle.ts`): first scan checks in, a later scan checks out, and a check-out is accepted only after a short gap (`QR_MIN_MINUTES_BEFORE_CHECKOUT`, 5 min) so a double-scan at the door can't check the student out. Location still comes from the scanning phone's GPS and goes through the same geofence and movement checks as manual check-in. QR codes issued before this change (which carried a `type`) still verify and now act as the combined code.

## Development

```bash
cp .env.example .env.local   # then fill MONGODB_URI and JWT_SECRET
npm run dev
npm test                     # unit tests (node:test) for QR toggle + safe redirects
npm run lint && npx tsc --noEmit && npm run build
```

## Project structure

```
app/
  api/
    auth/          login, register, logout, me
    attendance/    mark (geofence check), list
    locations/     list sites, create (admin)
    health/        deploy probe
  dashboard/       role-based UI
  dashboard/admin/ Leaflet geofence setup (admin only)
components/admin/  map + site manager
  login/
  register/
  manifest.ts      PWA manifest
components/dashboard/
lib/
  db.ts            MongoDB connection (cached)
  auth.ts          JWT + bcrypt
  haversine.ts     distance / geofence check
  session.ts       server session from cookie
models/
  User.ts
  Location.ts
  Attendance.ts
middleware.ts      protect /dashboard
```

## Getting started

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Set `MONGODB_URI` (MongoDB Atlas free tier) and `JWT_SECRET` (32+ characters).

   **Windows + `querySrv ECONNREFUSED`:** Node may fail SRV DNS even when `nslookup` works. In Atlas → **Connect** → **Drivers**, copy the **Standard connection string** (`mongodb://` with three shard hosts and `replicaSet=`) instead of `mongodb+srv://`.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000), register, then use the dashboard.

### First admin user

Admins sign in with **email + password** at [/login/admin](http://localhost:3000/login/admin). Staff still use **employee ID** at `/login`.

Create the first admin from your machine (uses `MONGODB_URI` from `.env.local`):

**Git Bash / macOS / Linux** (one line):

```bash
ADMIN_EMAIL=you@company.com ADMIN_PASSWORD='YourSecurePass1' ADMIN_NAME='Admin' npm run create-admin
```

**PowerShell**:

```powershell
$env:ADMIN_EMAIL="you@company.com"; $env:ADMIN_PASSWORD="YourSecurePass1"; $env:ADMIN_NAME="Admin"; npm run create-admin
```

Or add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` to `.env.local` (must be a real email like `you@company.com`, not `admin`), then run:

```bash
npm run create-admin
```

Password rules: at least 10 characters with letters and numbers. Re-running the command updates the same email’s password.

On Vercel, run `npm run create-admin` locally against your production `MONGODB_URI`, or run the same logic once in MongoDB with a bcrypt hash.

## Daily attendance rules

- **One check-in** and **one check-out** per user per calendar day (local timezone).
- Check-out requires check-in first, at the **same site**.
- `GET /api/attendance/today` — today's status (`canCheckIn`, `canCheckOut`, `isComplete`).

## Core API: mark attendance

`POST /api/attendance/mark` (authenticated)

```json
{
  "latitude": 5.6037,
  "longitude": -0.187,
  "locationId": "<mongodb location id>",
  "type": "check_in",
  "timezoneOffset": 0
}
```

Use `"type": "check_out"` when leaving. Pass `timezoneOffset` from `new Date().getTimezoneOffset()`.

Returns `409` if already checked in/out today; `403` if outside the geofence.

## PWA (install on phone)

- `app/manifest.ts` + `public/sw.js` service worker (required for “Install app” on Android Chrome).
- Icons are generated on `npm install` via `sharp` (`npm run pwa:icons` to regenerate).
- On the site, use the **Install** banner (Android) or **Share → Add to Home Screen** (iPhone).

Use **HTTPS** in production (set `COOKIE_SECURE=true` on Vercel). Geolocation needs a secure context on mobile.

## Push to GitHub

Git is initialized locally on branch `main`. After [GitHub CLI](https://cli.github.com/) login:

```powershell
gh auth login
gh repo create ella --public --source=. --remote=origin --push
```

Or create an empty repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USER/ella.git
git push -u origin main
```

## Deploy on Vercel

1. Push the repo and import in Vercel.
2. In **Vercel → your project → Settings → Environment Variables**, add these for **Production** (and **Preview** if you use preview URLs):

   | Name | Value |
   |------|--------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string (same as local) |
   | `JWT_SECRET` | **At least 32 characters** — not the placeholder from `.env.example` |
   | `COOKIE_SECURE` | `true` |

   Generate a strong `JWT_SECRET` (PowerShell or terminal):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```

   Paste the output as the value. Do **not** use a short password like `mysecret` (under 32 chars will fail login with “JWT secret missing or too short”).

3. **Redeploy** after saving env vars (Deployments → … → Redeploy). New variables are not applied to old deployments until you redeploy.

4. Verify: open `https://YOUR_APP.vercel.app/api/health` — you should see `"jwtConfigured": true` and `"mongodbConfigured": true`.

## Health check

`GET /api/health` — confirms the app is running and whether env vars are configured (no DB call).
