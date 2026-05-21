import { SessionManager } from "@/components/admin/SessionManager";
import { requireStaffPage } from "@/lib/admin-guard";

export default async function AdminSessionsPage() {
  await requireStaffPage();
  return <SessionManager />;
}
