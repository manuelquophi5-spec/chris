"use client";

import { authFetch, redirectAfterAuth } from "@/lib/auth-client";
import type { SessionUser } from "@/types";
import { MobileTabBar } from "./MobileTabBar";

type Props = {
  user: SessionUser;
  children: React.ReactNode;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardShell({ user, children }: Props) {
  async function handleLogout() {
    await authFetch("/api/auth/logout", { method: "POST" });
    redirectAfterAuth("/login");
  }

  return (
    <div className="mobile-app-shell flex min-h-[100dvh] flex-col">
      <div className="mobile-app-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="mx-auto max-w-lg px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 animate-fade-in">
              <p className="text-xs font-medium text-emerald-800/80">
                {getGreeting()}
              </p>
              <h1 className="truncate text-lg font-bold text-slate-900">
                {user.name.split(" ")[0]}
              </h1>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur active:scale-95"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-1">
        {children}
      </main>

      <MobileTabBar />
    </div>
  );
}
