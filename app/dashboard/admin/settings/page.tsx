import { AdminSettingsManager } from "@/components/admin/AdminSettingsManager";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  return <AdminSettingsManager />;
}
