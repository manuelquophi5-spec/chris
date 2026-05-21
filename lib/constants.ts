/** Max GPS uncertainty (meters) to accept a check-in/out. */
export const MAX_GPS_ACCURACY_METERS = 100;

/** Reject if reported speed exceeds this (m/s) — ~108 km/h, likely bad GPS. */
export const MAX_GPS_SPEED_MPS = 30;

export const MIN_PASSWORD_LENGTH = 10;

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 30;

export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_MAX_AUTH = 10;

/** Max base64 photo payload (~150 KB raw). */
export const MAX_PHOTO_CHARS = 200_000;

/** Admin JWT lifetime (shorter than regular users). */
export const ADMIN_JWT_EXPIRES = "24h";
export const USER_JWT_EXPIRES = "7d";
