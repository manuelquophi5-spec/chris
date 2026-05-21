"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authFetch, redirectAfterAuth } from "@/lib/auth-client";
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
    roles: ["admin", "instructor"],
  },
  {
    href: "/dashboard/admin/users",
    label: "Team",
    match: (p) => p.startsWith("/dashboard/admin/users"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/sites",
    label: "Workplaces",
    match: (p) => p.startsWith("/dashboard/admin/sites"),
    roles: ["admin"],
  },
  {
    href: "/dashboard/admin/attendance",
    label: "Who came in",
    match: (p) => p.startsWith("/dashboard/admin/attendance"),
    roles: ["admin", "instructor"],
  },
  {
    href: "/dashboard/admin/sessions",
    label: "Classes (optional)",
    match: (p) => p.startsWith("/dashboard/admin/sessions"),
    roles: ["admin", "instructor"],
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
    <div className="flex min-h-[100dvh] bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-white md:flex">
        <div className="border-b border-slate-700/80 px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Ella {user.role === "instructor" ? "Instructor" : "Admin"}
          </p>
          <p className="mt-2 text-lg font-bold">Administration</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-700/80 px-6 py-5">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.employeeId}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <div className="min-w-0 md:hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Ella {user.role === "instructor" ? "Instructor" : "Admin"}
              </p>
            </div>
            <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
              <nav className="flex gap-1 overflow-x-auto md:hidden">
                {nav.map((item) => {
                  const active = item.match(pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${
                        active
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <Link
                href="/dashboard"
                className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:inline-block"
              >
                Mobile check-in
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white md:hidden"
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
