import { AttendanceHistory } from "@/components/dashboard/AttendanceHistory";
import { getServerSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const user = await getServerSession();
  if (!user) redirect("/login");

  return (
    <div className="animate-page-enter">
      <AttendanceHistory
        showUser={user.role === "admin" || user.role === "instructor"}
      />
    </div>
  );
}
