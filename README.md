# Ella — Geofenced Attendance PWA

Mobile-first Progressive Web App for attendance management. Users check in via the browser **Geolocation API**; the server verifies they are inside a configured geofence using the **Haversine formula**.

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

```bash
# PowerShell — set vars for this command only
$env:ADMIN_EMAIL="you@company.com"; $env:ADMIN_PASSWORD="YourSecurePass1"; $env:ADMIN_NAME="Admin"; npm run create-admin
```

Or add `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` to `.env.local`, then run `npm run create-admin`.

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
