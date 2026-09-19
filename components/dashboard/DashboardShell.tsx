"use client";

import Image from "next/image";
import { useBrand } from "@/components/BrandProvider";
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
  const { markUrl } = useBrand();

  async function handleLogout() {
    await authFetch("/api/auth/logout", { method: "POST" });
    redirectAfterAuth("/login");
  }

  return (
    <div className="mobile-app-shell flex min-h-[100dvh] flex-col">
      <div className="mobile-app-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-[var(--ella-border)] bg-[var(--ella-surface)] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-lg px-4 pb-3 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5 animate-fade-in">
              <Image
                src={markUrl}
                alt=""
                width={36}
                height={36}
                unoptimized={markUrl.startsWith("http")}
                className="shrink-0 object-contain h-auto w-auto"
                style={{ width: "auto", height: "auto" }}
              />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--ella-fg-muted)]">
                  {getGreeting()}
                </p>
                <h1 className="truncate text-lg font-bold tracking-tight text-[var(--ella-fg)]">
                  {user.name.split(" ")[0]}
                </h1>
                {user.studentId ? (
                  <p className="truncate font-mono text-xs text-[var(--ella-fg-subtle)]">
                    {user.studentId}
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="ella-btn-ghost shrink-0 border border-[var(--ella-border)] bg-[var(--ella-surface)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">
        {children}
      </main>

      <MobileTabBar />
    </div>
  );
}
