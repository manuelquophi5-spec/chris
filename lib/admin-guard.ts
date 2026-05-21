import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import type { SessionUser } from "@/types";

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export async function requireStaffPage(): Promise<SessionUser> {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.role !== "instructor") {
    redirect("/dashboard");
  }
  return user;
}
