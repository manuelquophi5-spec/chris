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
  // A failure in any one of these must not crash the whole page — fall back
  // to placeholders, same as the old client-fetch pattern did implicitly.
  let userCount = 0;
  let pendingSetup = 0;
  let siteCount = 0;
  let todayMarks = 0;
  let activeClasses: Awaited<ReturnType<typeof getActiveClassesNow>> = [];
  try {
    [userCount, pendingSetup, siteCount, todayMarks, activeClasses] =
      await Promise.all([
        User.countDocuments({ role: { $ne: "admin" } }),
        User.countDocuments({ role: { $ne: "admin" }, passwordMustChange: true }),
        Location.countDocuments({ isActive: { $ne: false } }),
        getTodayMarksCount(0),
        getActiveClassesNow(0),
      ]);
  } catch (error) {
    console.error("[dashboard/admin] stats prefetch failed:", error);
  }

  return (
    <AdminOverview
      initial={{ userCount, pendingSetup, siteCount, todayMarks, activeClasses }}
    />
  );
}
