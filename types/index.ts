export type UserRole = "admin" | "user";

export type SessionUser = {
  id: string;
  studentId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AcademicProgramId =
  | "computer-science"
  | "information-technology"
  | "business-administration";

export type AcademicLevel = 100 | 200 | 300 | 400;

export type AdminUserRow = {
  id: string;
  studentId: string;
  name: string;
  role: UserRole;
  program: string | null;
  level: number | null;
  passwordMustChange: boolean;
  lockedUntil: string | null;
  failedLoginAttempts: number;
  createdAt: string;
};

export type GeoCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export type AttendanceType = "check_in" | "check_out";

export type AttendanceMarkPayload = {
  latitude: number;
  longitude: number;
  locationId?: string;
  type: AttendanceType;
  timezoneOffset?: number;
  sessionId?: string;
  courseId?: string;
  accuracy?: number | null;
};

export type AttendanceRecordSummary = {
  id: string;
  type: AttendanceType;
  markedAt: string;
  locationId: string;
  locationName: string;
  distanceMeters: number;
  sessionId?: string;
  sessionTitle?: string;
  courseId?: string;
  courseTitle?: string;
  isLate?: boolean;
};

export type ActiveSessionSummary = {
  id: string;
  title: string;
  courseCode?: string;
  locationId: string;
  locationName: string;
  startAt: string;
  endAt: string;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
};

export type ScheduleWindow = {
  active: boolean;
  isLate: boolean;
  reason?: string;
  startsInMinutes?: number;
  endsInMinutes?: number;
};

export type ActiveCourseSummary = {
  id: string;
  title: string;
  courseCode: string;
  description: string;
  scheduleLabel: string;
  nextClassHint: string | null;
  locationId: string | null;
  locationName: string | null;
  startTime: string;
  endTime: string;
  scheduleDays: number[];
  window: ScheduleWindow;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isLateNext: boolean;
};

export type TodayAttendanceStatus = {
  dayKey: string;
  checkIn: AttendanceRecordSummary | null;
  checkOut: AttendanceRecordSummary | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isComplete: boolean;
  activeSessions: ActiveSessionSummary[];
  useSessionMode: boolean;
  hasActiveSessions: boolean;
  activeCourses: ActiveCourseSummary[];
  useCourseMode: boolean;
  hasEnrollments: boolean;
  studentProgramLabel: string | null;
  studentLevel: number | null;
};

export type CourseRow = {
  id: string;
  title: string;
  courseCode: string;
  program: string;
  programLabel: string;
  level: number;
  description: string;
  createdByName: string;
  locationId: string | null;
  locationName: string | null;
  scheduleDays: number[];
  startTime: string;
  endTime: string;
  lateAfterMinutes: number;
  isActive: boolean;
  enrolledCount: number;
  isActiveNow: boolean;
  scheduleReason?: string;
};

export type CourseTodayRosterStudent = {
  userId: string;
  name: string;
  studentId: string;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAt: string | null;
  checkOutAt: string | null;
  isLate: boolean;
};

export type CourseTodayRoster = {
  courseId: string;
  title: string;
  courseCode: string;
  isActiveNow: boolean;
  students: CourseTodayRosterStudent[];
};

export type StudentCourseAttendanceRow = {
  userId: string;
  name: string;
  studentId: string;
  attendedSessions: number;
  missedSessions: number;
  lateSessions: number;
  attendancePercent: number;
};

export type CourseStatsSummary = {
  courseId: string;
  title: string;
  programLabel?: string;
  levelLabel?: string;
  createdByName: string;
  enrolledCount: number;
  expectedSessions: number;
  students: StudentCourseAttendanceRow[];
};

export type SiteDistancePreview = {
  id: string;
  name: string;
  distanceMeters: number;
  radiusMeters: number;
  inRange: boolean;
};

export type AttendanceAlert = {
  userId: string;
  studentId: string;
  name: string;
  type: "missing_checkout" | "missing_checkin";
  dayKey: string;
  checkInAt?: string;
};

export type ActiveClassSummary = {
  id: string;
  title: string;
  courseCode: string;
  checkedIn: number;
  enrolled: number;
};

export type UserAttendanceStats = {
  totalCheckIns: number;
  totalLate: number;
  uniqueDays: number;
  streak: number;
  perCourse: Array<{
    id: string;
    title: string;
    courseCode: string;
    checkIns: number;
    lates: number;
    days: number;
    attendanceRate: number;
  }>;
};
