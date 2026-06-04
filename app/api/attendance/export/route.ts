import { connectDB } from "@/lib/db";
import { parseTimezoneOffset } from "@/lib/attendance";
import {
  fetchAttendanceForExport,
  rowsToCsv,
  rowsToXlsxBuffer,
} from "@/lib/attendance-export";
import { jsonError, requireStaff } from "@/lib/api";
import { canLecturerAccessCourse } from "@/lib/courses";

/** Staff export: attendance as .xlsx or .csv */
export async function GET(request: Request) {
  const auth = await requireStaff();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;
  const timezoneOffset = parseTimezoneOffset(
    searchParams.get("timezoneOffset"),
  );
  const courseId = searchParams.get("courseId")?.trim() || undefined;
  const format = (searchParams.get("format")?.trim() ?? "xlsx").toLowerCase();

  await connectDB();

  if (courseId && auth.role === "instructor") {
    const allowed = await canLecturerAccessCourse(
      auth.id,
      courseId,
      false,
    );
    if (!allowed) return jsonError("Forbidden", 403);
  }

  try {
    const rows = await fetchAttendanceForExport({
      from,
      to,
      timezoneOffset,
      courseId,
      lecturerId: auth.role === "instructor" ? auth.id : undefined,
      isAdmin: auth.role === "admin",
    });

    const rangeLabel = from && to ? `${from}_to_${to}` : from ?? "today";
    const baseName = `datalink-attendance-${rangeLabel}`;

    if (format === "csv") {
      const csv = rowsToCsv(rows);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    const buffer = await rowsToXlsxBuffer(rows);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("[attendance/export]", err);
    return jsonError("Could not export attendance", 500);
  }
}
