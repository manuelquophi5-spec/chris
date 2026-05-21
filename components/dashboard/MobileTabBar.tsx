"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
  icon: "home" | "history" | "map";
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
  map: (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
      <path
        d="m9 18-4 2 1-5-4-6 12-2 4 6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
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
    <nav className="mobile-tab-bar fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 bg-white/90 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`mobile-tab-item relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 transition-all duration-300 ${
                active
                  ? "text-emerald-700"
                  : "text-slate-400 active:scale-95"
              }`}
            >
              {active && (
                <span
                  className="absolute inset-x-2 top-1 h-9 rounded-2xl bg-emerald-100/90 animate-tab-pop"
                  aria-hidden
                />
              )}
              <span className="relative z-10">{icons[tab.icon]}</span>
              <span
                className={`relative z-10 text-[11px] font-semibold tracking-wide ${
                  active ? "text-emerald-800" : "text-slate-500"
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
