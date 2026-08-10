import { AdminOverview } from "@/components/admin/AdminOverview";
import { requireAdminPage } from "@/lib/admin-guard";
import { connectDB } from "@/lib/db";
import { getTodayMarksCount } from "@/lib/attendance";
import { getActiveClassesNow } from "@/lib/courses";
import { Location } from "@/models/Location";
import { User } from "@/models/User";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  await connectDB();

  // Server render has no browser timezone yet; UTC is close enough for an
  // instant first paint, and the client corrects the day boundary on mount.
  const [userCount, pendingSetup, siteCount, todayMarks, activeClasses] =
    await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: { $ne: "admin" }, passwordMustChange: true }),
      Location.countDocuments({ isActive: { $ne: false } }),
      getTodayMarksCount(0),
      getActiveClassesNow(0),
    ]);

  return (
    <AdminOverview
      initial={{ userCount, pendingSetup, siteCount, todayMarks, activeClasses }}
    />
  );
}
