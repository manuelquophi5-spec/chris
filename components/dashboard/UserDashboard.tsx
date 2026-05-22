"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { CourseAttendanceCard } from "./CourseAttendanceCard";
import { DailyAttendanceCard } from "./DailyAttendanceCard";
import type { TodayAttendanceStatus } from "@/types";

export function UserDashboard() {
  const [today, setToday] = useState<TodayAttendanceStatus | null>(null);

  const load = useCallback(async () => {
    const tz = new Date().getTimezoneOffset();
    const res = await authFetch(`/api/attendance/today?timezoneOffset=${tz}`);
    const data = await parseJsonResponse<
      TodayAttendanceStatus & { error?: string }
    >(res);
    if (res.ok) setToday(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (today?.useCourseMode || today?.hasEnrollments) {
    return <CourseAttendanceCard onUpdate={load} />;
  }

  return <DailyAttendanceCard onUpdate={load} />;
}
