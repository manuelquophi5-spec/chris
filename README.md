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

Registration always creates `user` accounts. Promote an account in MongoDB:

```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

Or set `ALLOW_BOOTSTRAP_ADMIN=true` in `.env.local` temporarily and pass `"role": "admin"` in the register API body (not exposed in the UI).

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

## PWA

- `app/manifest.ts` enables install-to-home-screen on supported browsers.
- Add branded icons under `public/icons/` (`icon-192.png`, `icon-512.png`). Minimal placeholders are generated on first `npm run postinstall` if missing.

Use **HTTPS** in production (Vercel provides this). Geolocation requires a secure context on mobile.

## Deploy on Vercel

1. Push the repo and import in Vercel.
2. Add `MONGODB_URI` and `JWT_SECRET` in project environment variables.
3. Deploy. Verify with `GET /api/health`.

## Health check

`GET /api/health` — confirms the app is running and whether env vars are configured (no DB call).
