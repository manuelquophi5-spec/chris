import { AdminOverview } from "@/components/admin/AdminOverview";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  return <AdminOverview />;
}
