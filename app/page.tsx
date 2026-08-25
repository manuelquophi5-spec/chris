import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

function dashboardHomeForRole(role: string) {
  if (role === "admin") return "/dashboard/admin";
  return "/dashboard";
}

export default async function HomePage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  redirect(dashboardHomeForRole(user.role));
}
