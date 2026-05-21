import { getServerSession } from "@/lib/session";
import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/dashboard/admin");
  if (user.role === "instructor") redirect("/dashboard/admin/sessions");

  return (
    <div className="animate-page-enter">
      <RoleDashboard />
    </div>
  );
}
