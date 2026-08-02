"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBrand } from "@/components/BrandProvider";
import { authFetch } from "@/lib/auth-client";
import { AdminHelpCard } from "./AdminHelpCard";

function StatSkeleton() {
  return (
    <div className="ella-stat-cell animate-pulse">
      <div className="mb-2 h-3 w-20 rounded bg-[var(--ella-surface-muted)]" />
      <div className="h-6 w-12 rounded bg-[var(--ella-surface-muted)]" />
    </div>
  );
}

type ActiveClass = {
  id: string;
  title: string;
  courseCode: string;
  checkedIn: number;
  enrolled: number;
};

export function AdminOverview() {
  const { appName } = useBrand();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [pendingSetup, setPendingSetup] = useState<number | null>(null);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [todayMarks, setTodayMarks] = useState<number | null>(null);
  const [activeClasses, setActiveClasses] = useState<ActiveClass[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoadingStats(true);
      const tzOffset = new Date().getTimezoneOffset();
      const [usersRes, pendingRes, locRes, attRes, activeRes] = await Promise.all([
        authFetch("/api/admin/users?limit=1"),
        authFetch("/api/admin/users?passwordMustChange=1&limit=1"),
        authFetch("/api/locations?all=1"),
        authFetch("/api/attendance?limit=100"),
        authFetch(`/api/admin/courses/active-now?timezoneOffset=${tzOffset}`),
      ]);
      const usersData = await usersRes.json();
      const pendingData = await pendingRes.json();
      const locData = await locRes.json();
      const attData = await attRes.json();
      const activeData = await activeRes.json();

      setUserCount(usersData.total ?? 0);
      setPendingSetup(pendingData.total ?? 0);
      setSiteCount(
        (locData.locations ?? []).filter(
          (l: { isActive?: boolean }) => l.isActive !== false,
        ).length,
      );

      const today = new Date();
      const offset = today.getTimezoneOffset();
      const dayKey = new Date(today.getTime() - offset * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const marks = (attData.attendance ?? []).filter(
        (r: { dayKey?: string; markedAt: string }) =>
          (r.dayKey || r.markedAt.slice(0, 10)) === dayKey,
      );
      setTodayMarks(marks.length);
      setActiveClasses(activeData.classes ?? []);
      setLoadingStats(false);
    })();
  }, []);

  const steps = [
    {
      step: 1,
      title: "Set up campuses",
      body: "Add GPS campuses where students check in.",
      href: "/dashboard/admin/sites",
      button: "Campuses",
    },
    {
      step: 2,
      title: "Add students & lecturers",
      body: "Students use their student ID; lecturers use email at Admin sign in.",
      href: "/dashboard/admin/users",
      button: "Students & staff",
    },
    {
      step: 3,
      title: "Create classes",
      body: "Set schedule (days, start/end time) and enroll students.",
      href: "/dashboard/admin/courses",
      button: "Classes",
    },
    {
      step: 4,
      title: "Review attendance",
      body: "See percentages, late arrivals, and missed sessions per class.",
      href: "/dashboard/admin/courses",
      button: "Class reports",
    },
  ];

  const stats = [
    {
      label: "Students & staff",
      value: userCount ?? "—",
      href: "/dashboard/admin/users",
    },
    {
      label: "Need password setup",
      value: pendingSetup ?? "—",
      href: "/dashboard/admin/users",
      warn: (pendingSetup ?? 0) > 0,
    },
    {
      label: "Campuses active",
      value: siteCount ?? "—",
      href: "/dashboard/admin/sites",
    },
    {
      label: "Marks today",
      value: todayMarks ?? "—",
      href: "/dashboard/admin/attendance",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="ella-heading-page">Welcome</h1>
        <p className="ella-text-muted mt-2 max-w-2xl">
          Set up attendance for your school. Follow the checklist below; no technical
          knowledge required.
        </p>
      </div>

      <AdminHelpCard title="What students do on their phones">
        <p>1. Open {appName} in Chrome or Safari (add to home screen if you like).</p>
        <p>2. Sign in with student ID and password.</p>
        <p>3. Select their class and check in during the scheduled window.</p>
        <p className="text-[var(--ella-fg-subtle)]">
          GPS confirms they are on campus at the class site.
        </p>
      </AdminHelpCard>

      {activeClasses.length > 0 && (
        <div className="ella-card-padded border-[var(--ella-accent)]/30 bg-[var(--ella-accent-subtle)]">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--ella-accent)] animate-pulse motion-reduce:animate-none" />
            <h2 className="text-sm font-bold text-[var(--ella-fg)]">
              {activeClasses.length} class{activeClasses.length !== 1 ? "es" : ""} in session now
            </h2>
          </div>
          <ul className="mt-3 space-y-2">
            {activeClasses.map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--ella-fg)]">
                  {c.courseCode ? (
                    <span className="font-mono text-[var(--ella-fg-subtle)]">{c.courseCode} </span>
                  ) : null}
                  {c.title}
                </span>
                <span className="text-[var(--ella-fg-muted)] tabular-nums">
                  {c.checkedIn} / {c.enrolled} checked in
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="ella-stat-row">
        {loadingStats
          ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
          : stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className={`ella-stat-cell transition hover:bg-[var(--ella-surface-muted)] ${
                  stat.warn ? "bg-[var(--ella-warning-subtle)]" : ""
                }`}
              >
                <p className="ella-stat-label">{stat.label}</p>
                <p className="ella-stat-value">{stat.value}</p>
              </Link>
            ))}
      </div>

      <div>
        <h2 className="ella-heading-section text-lg">Setup checklist</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((s) => (
            <li
              key={s.step}
              className="ella-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex min-w-0 flex-1 gap-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ella-accent)] text-sm font-bold text-[var(--ella-accent-fg)]"
                  aria-hidden
                >
                  {s.step}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-[var(--ella-fg)]">{s.title}</h3>
                  <p className="ella-text-muted mt-1">{s.body}</p>
                </div>
              </div>
              <Link
                href={s.href}
                className="ella-btn-primary shrink-0 px-5 py-2.5 text-sm sm:ml-auto"
              >
                {s.button}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
