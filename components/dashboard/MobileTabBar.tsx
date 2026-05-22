"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: "home" | "history";
  match: (path: string) => boolean;
};

const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function MobileTabBar() {
  const pathname = usePathname();

  const tabs: Tab[] = [
    {
      href: "/dashboard",
      label: "Home",
      icon: "home",
      match: (p) => p === "/dashboard",
    },
    {
      href: "/dashboard/history",
      label: "History",
      icon: "history",
      match: (p) => p.startsWith("/dashboard/history"),
    },
  ];

  return (
    <nav
      className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-30 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 transition-colors duration-150 ${
                active
                  ? "text-[var(--ella-accent)]"
                  : "text-[var(--ella-fg-subtle)] active:scale-95"
              }`}
            >
              {active && (
                <span
                  className="mobile-tab-item-active-bg absolute inset-x-3 top-1.5 h-9 rounded-lg animate-tab-pop"
                  aria-hidden
                />
              )}
              <span className="relative z-10">{icons[tab.icon]}</span>
              <span
                className={`relative z-10 text-[11px] font-semibold ${
                  active ? "text-[var(--ella-accent-hover)]" : "text-[var(--ella-fg-muted)]"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
