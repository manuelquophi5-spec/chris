import { AdminDesktopShell } from "@/components/admin/AdminDesktopShell";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return <AdminDesktopShell user={user}>{children}</AdminDesktopShell>;
}
