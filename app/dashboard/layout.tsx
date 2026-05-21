import { ShellRouter } from "@/components/dashboard/ShellRouter";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  return <ShellRouter user={user}>{children}</ShellRouter>;
}
