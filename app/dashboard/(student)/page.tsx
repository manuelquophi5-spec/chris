import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { buildTodayStatus, getUserAttendanceStats } from "@/lib/attendance";
import type { TodayAttendanceStatus, UserAttendanceStats } from "@/types";
import { getDayKey } from "@/lib/day";

type Props = {
  searchParams: Promise<{ mobile?: string }>;
};

// Client's own loadToday() effect corrects this immediately on mount, so a
// blank-but-valid shape here is safe — it just means one extra client fetch
// instead of a crashed page if the server-side prefetch below fails.
function emptyTodayStatus(): TodayAttendanceStatus {
  return {
    dayKey: getDayKey(new Date(), 0),
    checkIn: null,
    checkOut: null,
    canCheckIn: false,
    canCheckOut: false,
    isComplete: false,
    activeSessions: [],
    useSessionMode: false,
    hasActiveSessions: false,
    activeCourses: [],
    useCourseMode: false,
    hasEnrollments: false,
    studentProgramLabel: null,
    studentLevel: null,
  };
}

export default async function DashboardPage({ searchParams }: Props) {
  const user = await getServerSession();
  if (!user) redirect("/login");

  const { mobile } = await searchParams;
  const mobileView = mobile === "1";

  if (!mobileView) {
    if (user.role === "admin") redirect("/dashboard/admin");
  }

  await connectDB();
  // Server render has no browser timezone yet; UTC is close enough for an
  // instant first paint, and the client corrects to the exact offset on mount.
  // A failure here must not crash the page — the client re-fetches anyway.
  let initialToday: TodayAttendanceStatus = emptyTodayStatus();
  let initialStats: UserAttendanceStats | null = null;
  try {
    [initialToday, initialStats] = await Promise.all([
      buildTodayStatus(user.id, 0),
      getUserAttendanceStats(user.id),
    ]);
  } catch (error) {
    console.error("[dashboard] initial data prefetch failed:", error);
  }

  return (
    <div className="animate-page-enter">
      <RoleDashboard initialToday={initialToday} initialStats={initialStats} />
    </div>
  );
}
