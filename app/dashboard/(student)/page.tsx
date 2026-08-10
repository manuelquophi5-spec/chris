import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { buildTodayStatus, getUserAttendanceStats } from "@/lib/attendance";

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

  await connectDB();
  // Server render has no browser timezone yet; UTC is close enough for an
  // instant first paint, and the client corrects to the exact offset on mount.
  const [initialToday, initialStats] = await Promise.all([
    buildTodayStatus(user.id, 0),
    getUserAttendanceStats(user.id),
  ]);

  return (
    <div className="animate-page-enter">
      <RoleDashboard initialToday={initialToday} initialStats={initialStats} />
    </div>
  );
}
