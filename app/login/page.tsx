"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  AuthPageShell,
  mobileButtonClass,
  mobileInputClass,
} from "@/components/auth/AuthPageShell";
import {
  authFetch,
  parseJsonResponse,
  redirectAfterAuth,
} from "@/lib/auth-client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: studentId.trim().toUpperCase(),
          password,
        }),
      });

      const data = await parseJsonResponse<{
        error?: string;
        requiresPasswordSetup?: boolean;
        employeeId?: string;
      }>(res);

      if (res.status === 200 && data.requiresPasswordSetup) {
        const id = data.employeeId ?? studentId.trim().toUpperCase();
        redirectAfterAuth(`/set-password?id=${encodeURIComponent(id)}`);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Invalid student ID or password");
        setLoading(false);
        return;
      }

      const from = searchParams.get("from") ?? "/dashboard";
      redirectAfterAuth(from);
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="ella-label" htmlFor="studentId">
          Student ID
        </label>
        <input
          id="studentId"
          type="text"
          autoComplete="username"
          autoCapitalize="characters"
          className={`${mobileInputClass} font-mono uppercase`}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value.toUpperCase())}
          required
        />
      </div>
      <div>
        <label className="ella-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={mobileInputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-[var(--ella-fg-subtle)]">
          First time? Leave password empty and submit — or use{" "}
          <Link href="/set-password" className="ella-link">
            Set password
          </Link>
          .
        </p>
      </div>
      {error && (
        <p className="ella-alert-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className={mobileButtonClass}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Attendance check-in"
      footer={
        <div className="space-y-2 text-sm text-[var(--ella-fg-muted)]">
          <p>
            New student?{" "}
            <Link href="/set-password" className="ella-link">
              Set your password
            </Link>
          </p>
          <p>
            Administrator?{" "}
            <Link href="/login/admin" className="ella-link">
              Admin sign in (email)
            </Link>
          </p>
        </div>
      }
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-[var(--ella-fg-muted)]">Loading…</p>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
