import { AdminGeofenceManager } from "@/components/admin/AdminGeofenceManager";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminSitesPage() {
  await requireAdminPage();
  return <AdminGeofenceManager />;
}
