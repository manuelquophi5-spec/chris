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
import { toastError, toastSuccess } from "@/lib/toast";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        toastError(data.error ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      toastSuccess("Signed in as administrator.");
      const from = searchParams.get("from") ?? "/dashboard/admin";
      redirectAfterAuth(from.startsWith("/dashboard") ? from : "/dashboard/admin");
    } catch {
      toastError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="ella-label" htmlFor="email">
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
          required
        />
      </div>
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
        <p className="text-sm text-[var(--ella-fg-muted)]">
          Student check-in?{" "}
          <Link href="/login" className="ella-link">
            Student sign in
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-[var(--ella-fg-muted)]">Loading…</p>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
