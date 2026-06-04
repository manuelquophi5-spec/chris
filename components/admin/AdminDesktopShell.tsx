"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authFetch, redirectAfterAuth } from "@/lib/auth-client";
import { APP_SHORT_TITLE, INSTITUTE_NAME, LOGO_SRC } from "@/lib/brand";
import type { SessionUser } from "@/types";

type NavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  roles?: Array<"admin" | "instructor">;
};

const allNav: NavItem[] = [
  {
    href: "/dashboard/admin",
    label: "Start here",
    match: (p) => p === "/dashboard/admin",
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/classes",
    label: "My classes",
    match: (p) => p.startsWith("/dashboard/admin/classes"),
    roles: ["instructor"],
  },
  {
    href: "/dashboard/admin/courses",
    label: "Classes",
    match: (p) => p.startsWith("/dashboard/admin/courses"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/users",
    label: "Students & staff",
    match: (p) => p.startsWith("/dashboard/admin/users"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/sites",
    label: "Campuses",
    match: (p) => p.startsWith("/dashboard/admin/sites"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/attendance",
    label: "Attendance log",
    match: (p) => p.startsWith("/dashboard/admin/attendance"),
    roles: ["admin", "instructor"],
  },
  {
    href: "/dashboard/admin/sessions",
    label: "One-off sessions",
    match: (p) => p.startsWith("/dashboard/admin/sessions"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/audit",
    label: "Activity history",
    match: (p) => p.startsWith("/dashboard/admin/audit"),
    roles: ["admin"],
  },
];

type Props = {
  user: SessionUser;
  children: React.ReactNode;
};

export function AdminDesktopShell({ user, children }: Props) {
  const pathname = usePathname();
  const nav = allNav.filter(
    (item) => !item.roles || item.roles.includes(user.role as "admin" | "instructor"),
  );

  async function handleLogout() {
    await authFetch("/api/auth/logout", { method: "POST" });
    redirectAfterAuth("/login");
  }

  return (
    <div className="admin-app-bg flex min-h-[100dvh]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[var(--ella-border-strong)] bg-[var(--ella-sidebar)] text-[var(--ella-sidebar-fg)] md:flex">
        <div className="border-b border-[var(--ella-sidebar-raised)] px-5 py-5">
          <div className="flex items-center gap-3">
            <Image
              src={LOGO_SRC}
              alt=""
              width={40}
              height={40}
              className="shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{APP_SHORT_TITLE}</p>
              <p className="text-xs text-[var(--ella-sidebar-muted)]">
                {user.role === "instructor" ? "Instructor" : "Admin"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--ella-sidebar-muted)]">
            {INSTITUTE_NAME}
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-4">
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ella-nav-item ${active ? "ella-nav-item-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--ella-sidebar-raised)] px-5 py-4">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-[var(--ella-sidebar-muted)]">
            {user.studentId}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-lg border border-[var(--ella-sidebar-raised)] px-3 py-2 text-xs font-semibold text-[var(--ella-sidebar-muted)] transition hover:bg-[var(--ella-sidebar-raised)] hover:text-[var(--ella-sidebar-fg)]"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--ella-border)] bg-[var(--ella-surface)]">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
            <div className="min-w-0 md:hidden">
              <p className="text-xs font-semibold text-[var(--ella-accent-muted)]">
                {APP_SHORT_TITLE} · {user.role === "instructor" ? "Instructor" : "Admin"}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <nav className="flex gap-1 overflow-x-auto md:hidden" aria-label="Admin">
                {nav.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-[var(--ella-accent)] text-[var(--ella-accent-fg)]"
                          : "bg-[var(--ella-surface-muted)] text-[var(--ella-fg-muted)]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <Link
                href="/dashboard"
                className="hidden rounded-lg border border-[var(--ella-border)] px-3 py-2 text-xs font-semibold text-[var(--ella-fg-muted)] transition hover:bg-[var(--ella-surface-muted)] sm:inline-block"
              >
                Mobile check-in
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="ella-btn-ghost rounded-lg border border-[var(--ella-border)] md:hidden"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
