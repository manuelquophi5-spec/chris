import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
