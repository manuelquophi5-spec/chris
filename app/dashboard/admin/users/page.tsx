import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminUsersPage() {
  await requireAdminPage();
  return (
    <div>
      <AdminUsersManager />
    </div>
  );
}
