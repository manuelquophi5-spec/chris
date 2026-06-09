import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ mobile?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  const { mobile } = await searchParams;
  const mobileView = mobile === "1";

  if (!mobileView) {
    if (user.role === "admin") redirect("/dashboard/admin");
    if (user.role === "instructor") redirect("/dashboard/admin/classes");
  }

  return (
    <div className="animate-page-enter">
      <RoleDashboard />
    </div>
  );
}
