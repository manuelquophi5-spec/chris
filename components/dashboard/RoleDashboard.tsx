import { UserDashboard } from "./UserDashboard";
import type { TodayAttendanceStatus, UserAttendanceStats } from "@/types";

type Props = {
  initialToday: TodayAttendanceStatus;
  initialStats: UserAttendanceStats | null;
};

export function RoleDashboard({ initialToday, initialStats }: Props) {
  return <UserDashboard initialToday={initialToday} initialStats={initialStats} />;
}
