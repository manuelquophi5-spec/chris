/** Max GPS uncertainty (meters) to accept a check-in/out. */
export const MAX_GPS_ACCURACY_METERS = 100;

/** Reject if implied speed between a user's last mark and this one exceeds this (m/s) — ~108 km/h, physically implausible for foot/vehicle campus travel. */
export const MAX_GPS_SPEED_MPS = 30;

export const MIN_PASSWORD_LENGTH = 10;

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 30;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_AUTH = 10;

/** Admin JWT lifetime (shorter than regular users). */
export const ADMIN_JWT_EXPIRES = "24h";
export const USER_JWT_EXPIRES = "7d";
