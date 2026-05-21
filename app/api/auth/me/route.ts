import { getAuthUser, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return jsonError("Unauthorized", 401);
  return jsonOk({ user });
}
