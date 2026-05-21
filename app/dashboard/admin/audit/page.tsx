import { AdminAuditLog } from "@/components/admin/AdminAuditLog";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminAuditPage() {
  await requireAdminPage();
  return <AdminAuditLog />;
}
