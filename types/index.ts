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
  locationId: string;
  type: AttendanceType;
  timezoneOffset?: number;
  sessionId?: string;
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

export type TodayAttendanceStatus = {
  dayKey: string;
  checkIn: AttendanceRecordSummary | null;
  checkOut: AttendanceRecordSummary | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  isComplete: boolean;
  activeSessions: ActiveSessionSummary[];
  useSessionMode: boolean;
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
