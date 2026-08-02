import { connectDB } from "@/lib/db";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_URL } from "@/lib/brand";
import { Settings } from "@/models/Settings";

export type BrandSettings = {
  appName: string;
  logoUrl: string;
};

const CACHE_TTL_MS = 30_000;
let cached: { value: BrandSettings; expiresAt: number } | null = null;

/**
 * School-configured app name/logo, server-only. Cached briefly so every page
 * render (root layout, manifest) doesn't hit MongoDB — settings change rarely.
 */
export async function getSettings(): Promise<BrandSettings> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  await connectDB();
  const doc = await Settings.findOne().lean();

  const value: BrandSettings = {
    appName: doc?.appName?.trim() || DEFAULT_APP_NAME,
    logoUrl: doc?.logoUrl?.trim() || DEFAULT_LOGO_URL,
  };

  cached = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

export function invalidateSettingsCache(): void {
  cached = null;
}
