import { connectDB } from "@/lib/db";
import { parseTimezoneOffset } from "@/lib/attendance";
import {
  fetchAttendanceForExport,
  rowsToCsv,
  rowsToXlsxBuffer,
} from "@/lib/attendance-export";
import { jsonError, requireAdmin } from "@/lib/api";

/** Admin export: attendance as .xlsx or .csv */
export async function GET(request: Request) {
  const auth = await requireAdmin();
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

  try {
    const rows = await fetchAttendanceForExport({
      from,
      to,
      timezoneOffset,
      courseId,
    });

    const rangeLabel = from && to ? `${from}_to_${to}` : from ?? "today";
    const baseName = `ug-attendance-${rangeLabel}`;

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
