import { jsonOk } from "@/lib/api";
import { getSettings } from "@/lib/settings";

/** Public: current app name and logo, so unauthenticated pages (login, PWA manifest) can brand themselves. */
export async function GET() {
  const settings = await getSettings();
  return jsonOk(settings as unknown as Record<string, unknown>);
}
