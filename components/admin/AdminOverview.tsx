"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { AdminHelpCard } from "./AdminHelpCard";

export function AdminOverview() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [pendingSetup, setPendingSetup] = useState<number | null>(null);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [todayMarks, setTodayMarks] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const [usersRes, locRes, attRes] = await Promise.all([
        authFetch("/api/admin/users"),
        authFetch("/api/locations?all=1"),
        authFetch("/api/attendance?limit=100"),
      ]);
      const usersData = await usersRes.json();
      const locData = await locRes.json();
      const attData = await attRes.json();

      const users = usersData.users ?? [];
      setUserCount(users.length);
      setPendingSetup(
        users.filter((u: { passwordMustChange: boolean }) => u.passwordMustChange)
          .length,
      );
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
    })();
  }, []);

  const steps = [
    {
      step: 1,
      title: "Add your team",
      body: "Enter each person’s first name and employee ID (e.g. E10234).",
      href: "/dashboard/admin/users",
      button: "Go to Team",
    },
    {
      step: 2,
      title: "Tell them to set a password",
      body: "They open the Ella link, tap “Set password”, enter their ID, and choose a password.",
      href: "/dashboard/admin/users",
      button: "See who still needs a password",
    },
    {
      step: 3,
      title: "Set up workplaces",
      body: "Search for your office on the map, set how close people must be to check in (usually 50–150 m).",
      href: "/dashboard/admin/sites",
      button: "Set up workplaces",
    },
    {
      step: 4,
      title: "Check who came in today",
      body: "Download a spreadsheet or see who forgot to check out.",
      href: "/dashboard/admin/attendance",
      button: "Today’s attendance",
    },
  ];

  const cards = [
    {
      label: "People on the team",
      value: userCount ?? "—",
      href: "/dashboard/admin/users",
    },
    {
      label: "Still need a password",
      value: pendingSetup ?? "—",
      href: "/dashboard/admin/users",
      highlight: (pendingSetup ?? 0) > 0,
    },
    {
      label: "Workplaces set up",
      value: siteCount ?? "—",
      href: "/dashboard/admin/sites",
    },
    {
      label: "Check-ins today",
      value: todayMarks ?? "—",
      href: "/dashboard/admin/attendance",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
        <p className="mt-2 max-w-2xl text-base text-slate-600">
          This screen helps you set up Ella for your team. You do not need any
          technical knowledge — follow the steps below.
        </p>
      </div>

      <AdminHelpCard title="What staff do on their phones">
        <p>
          1. Open the Ella link in Chrome or Safari (install to home screen if
          you like).
        </p>
        <p>2. Sign in with their employee ID and password.</p>
        <p>3. Tap Check in when they arrive, Check out when they leave.</p>
        <p className="text-slate-500">
          The phone must be at the workplace — GPS confirms they are on site.
        </p>
      </AdminHelpCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
              card.highlight
                ? "border-amber-300 bg-amber-50/50"
                : "border-slate-200 hover:border-emerald-300"
            }`}
          >
            <p className="text-sm font-medium text-slate-600">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="mt-2 text-sm font-semibold text-emerald-700">Open →</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900">Setup checklist</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {steps.map((s) => (
            <div
              key={s.step}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                {s.step}
              </span>
              <h3 className="mt-3 text-base font-bold text-slate-900">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{s.body}</p>
              <Link
                href={s.href}
                className="mt-4 inline-flex justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {s.button}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
