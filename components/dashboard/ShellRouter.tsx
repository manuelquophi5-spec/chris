"use client";

import { usePathname } from "next/navigation";
import type { SessionUser } from "@/types";
import { AdminDesktopShell } from "@/components/admin/AdminDesktopShell";
import { DashboardShell } from "./DashboardShell";

type Props = {
  user: SessionUser;
  children: React.ReactNode;
};

export function ShellRouter({ user, children }: Props) {
  const pathname = usePathname();
  const isStaffDesktop =
    (user.role === "admin" || user.role === "instructor") &&
    pathname.startsWith("/dashboard/admin");

  if (isStaffDesktop) {
    return <AdminDesktopShell user={user}>{children}</AdminDesktopShell>;
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
