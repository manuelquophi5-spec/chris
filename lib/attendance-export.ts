import { getDayKey } from "@/lib/day";
import { Attendance } from "@/models/Attendance";
import { Course } from "@/models/Course";
import mongoose from "mongoose";
import ExcelJS from "exceljs";

export type ExportRow = {
  day: string;
  studentId: string;
  name: string;
  type: string;
  time: string;
  campus: string;
  classTitle: string;
  classCode: string;
  session: string;
  late: string;
  distanceM: number | string;
  gpsAccuracyM: number | string;
  inGeofence: string;
};

const HEADERS = [
  "day",
  "student_id",
  "name",
  "type",
  "time",
  "campus",
  "class_title",
  "class_code",
  "session",
  "late",
  "distance_m",
  "gps_accuracy_m",
  "in_geofence",
] as const;

export async function fetchAttendanceForExport(params: {
  from?: string;
  to?: string;
  timezoneOffset: number;
  courseId?: string;
  lecturerId?: string;
  isAdmin: boolean;
}): Promise<ExportRow[]> {
  const { from, to, timezoneOffset, courseId, lecturerId, isAdmin } = params;

  const filter: Record<string, unknown> = {};

  if (from && to) {
    filter.dayKey = { $gte: from, $lte: to };
  } else {
    filter.dayKey = getDayKey(new Date(), timezoneOffset);
  }

  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    filter.courseId = new mongoose.Types.ObjectId(courseId);
  } else if (!isAdmin && lecturerId) {
    const courses = await Course.find({
      lecturerId: new mongoose.Types.ObjectId(lecturerId),
      isActive: true,
    })
      .select("_id")
      .lean();
    const ids = courses.map((c) => c._id);
    if (ids.length === 0) return [];
    filter.courseId = { $in: ids };
  }

  const records = await Attendance.find(filter)
    .sort({ dayKey: -1, markedAt: -1 })
    .limit(10000)
    .populate("userId", "name employeeId")
    .populate("locationId", "name")
    .populate("sessionId", "title courseCode")
    .populate("courseId", "title courseCode")
    .lean();

  return records.map((r) => {
    const u = r.userId as { name?: string; employeeId?: string } | null;
    const loc = r.locationId as { name?: string } | null;
    const sess = r.sessionId as { title?: string; courseCode?: string } | null;
    const course = r.courseId as { title?: string; courseCode?: string } | null;
    const sessionLabel = sess
      ? `${sess.title ?? ""}${sess.courseCode ? ` (${sess.courseCode})` : ""}`
      : "";

    return {
      day: r.dayKey,
      studentId: u?.employeeId ?? "",
      name: u?.name ?? "",
      type: r.type,
      time: r.markedAt.toISOString(),
      campus: loc?.name ?? "",
      classTitle: course?.title ?? "",
      classCode: (course?.courseCode ?? "").trim(),
      session: sessionLabel,
      late: r.isLate ? "yes" : "no",
      distanceM: Math.round(r.distanceMeters),
      gpsAccuracyM:
        r.gpsAccuracy != null ? Math.round(r.gpsAccuracy) : "",
      inGeofence: r.withinGeofence ? "yes" : "no",
    };
  });
}

export function rowsToCsv(rows: ExportRow[]): string {
  const escape = (value: string | number) => {
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = rows.map((r) =>
    [
      r.day,
      r.studentId,
      r.name,
      r.type,
      r.time,
      r.campus,
      r.classTitle,
      r.classCode,
      r.session,
      r.late,
      r.distanceM,
      r.gpsAccuracyM,
      r.inGeofence,
    ]
      .map(escape)
      .join(","),
  );

  return [HEADERS.join(","), ...lines].join("\n");
}

export async function rowsToXlsxBuffer(rows: ExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Attendance");
  sheet.addRow([...HEADERS]);
  for (const r of rows) {
    sheet.addRow([
      r.day,
      r.studentId,
      r.name,
      r.type,
      r.time,
      r.campus,
      r.classTitle,
      r.classCode,
      r.session,
      r.late,
      r.distanceM,
      r.gpsAccuracyM,
      r.inGeofence,
    ]);
  }
  sheet.getRow(1).font = { bold: true };
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
