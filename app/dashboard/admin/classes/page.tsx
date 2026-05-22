import { InstructorDashboard } from "@/components/admin/InstructorDashboard";
import { requireStaffPage } from "@/lib/admin-guard";

export default async function InstructorClassesPage() {
  await requireStaffPage();
  return <InstructorDashboard />;
}
