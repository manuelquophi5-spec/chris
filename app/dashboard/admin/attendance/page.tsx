import { AdminAttendanceTools } from "@/components/admin/AdminAttendanceTools";
import { AttendanceHistory } from "@/components/dashboard/AttendanceHistory";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminAttendancePage() {
  await requireAdminPage();
  return (
    <div className="space-y-8">
      <AdminAttendanceTools />
      <AttendanceHistory showUser />
    </div>
  );
}
