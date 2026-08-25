import { SessionManager } from "@/components/admin/SessionManager";
import { requireAdminPage } from "@/lib/admin-guard";

export default async function AdminSessionsPage() {
  await requireAdminPage();
  return <SessionManager />;
}
