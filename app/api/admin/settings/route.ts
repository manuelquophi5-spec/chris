import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { jsonError, jsonOk, requireAdmin } from "@/lib/api";
import { invalidateSettingsCache } from "@/lib/settings";
import { Settings } from "@/models/Settings";

function isValidLogoUrl(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof Response) return auth;

  try {
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.appName !== undefined) {
      const appName = String(body.appName).trim();
      if (appName.length < 2 || appName.length > 60) {
        return jsonError("App name must be 2–60 characters");
      }
      updates.appName = appName;
    }

    if (body.logoUrl !== undefined) {
      const logoUrl = String(body.logoUrl).trim();
      if (logoUrl && !isValidLogoUrl(logoUrl)) {
        return jsonError("Logo must be a valid image URL (https://...)");
      }
      if (logoUrl.length > 1000) {
        return jsonError("Logo URL is too long");
      }
      updates.logoUrl = logoUrl;
    }

    if (Object.keys(updates).length === 0) {
      return jsonError("No fields to update");
    }

    updates.updatedBy = auth.id;

    await connectDB();
    const settings = await Settings.findOneAndUpdate({}, updates, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    invalidateSettingsCache();

    await writeAudit(
      auth.id,
      "settings.update",
      "settings",
      settings._id.toString(),
      `appName=${settings.appName || "(default)"} logoUrl=${settings.logoUrl || "(default)"}`,
    );

    return jsonOk({
      settings: {
        appName: settings.appName,
        logoUrl: settings.logoUrl,
      },
      message: "Branding updated",
    });
  } catch (err) {
    console.error("[admin/settings PATCH]", err);
    return jsonError("Could not update settings", 500);
  }
}
