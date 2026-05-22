import { AdminAttendanceTools } from "@/components/admin/AdminAttendanceTools";
import { AttendanceHistory } from "@/components/dashboard/AttendanceHistory";
import { requireStaffPage } from "@/lib/admin-guard";

export default async function AdminAttendancePage() {
  await requireStaffPage();
  return (
    <div className="space-y-8">
      <AdminAttendanceTools />
      <AttendanceHistory showUser />
    </div>
  );
}
