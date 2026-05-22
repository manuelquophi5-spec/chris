"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authFetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await parseJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setError(data.error ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      const from = searchParams.get("from") ?? "/dashboard/admin";
      redirectAfterAuth(from.startsWith("/dashboard") ? from : "/dashboard/admin");
    } catch {
      setError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className={mobileInputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={mobileInputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p
          className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className={mobileButtonClass}>
        {loading ? "Signing in…" : "Sign in as admin"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <AuthPageShell
      title="Admin sign in"
      subtitle="Manage campuses, classes, and attendance"
      footer={
        <p className="text-sm text-slate-600">
          Student check-in?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
          >
            Student sign in
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-slate-500">Loading…</p>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
