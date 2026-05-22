import { AdminCourseManager } from "@/components/admin/AdminCourseManager";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminCoursesPage() {
  await requireAdminPage();
  return <AdminCourseManager />;
}
