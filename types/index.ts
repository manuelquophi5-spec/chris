export type UserRole = "admin" | "instructor" | "user";

export type SessionUser = {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: UserRole;
};

export type AdminUserRow = {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
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
  photoData?: string | null;
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
  description: string;
  lecturerId: string;
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
  activeCourses: ActiveCourseSummary[];
  useCourseMode: boolean;
  hasEnrollments: boolean;
};

export type CourseRow = {
  id: string;
  title: string;
  description: string;
  lecturerId: string;
  lecturerName: string;
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

export type StudentCourseAttendanceRow = {
  userId: string;
  name: string;
  employeeId: string;
  attendedSessions: number;
  missedSessions: number;
  lateSessions: number;
  attendancePercent: number;
};

export type CourseStatsSummary = {
  courseId: string;
  title: string;
  lecturerName: string;
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
  employeeId: string;
  name: string;
  type: "missing_checkout" | "missing_checkin";
  dayKey: string;
  checkInAt?: string;
};
