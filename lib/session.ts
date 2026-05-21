import { cookies } from "next/headers";
import { COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import type { SessionUser } from "@/types";

export async function getServerSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAccessToken(token);
}
