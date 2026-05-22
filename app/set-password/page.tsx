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

function SetPasswordForm() {
  const searchParams = useSearchParams();
  const [studentId, setStudentId] = useState(
    () => searchParams.get("id")?.toUpperCase() ?? "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 10) {
      setError("Password must be at least 10 characters with letters and numbers");
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: studentId.trim().toUpperCase(),
          password,
        }),
      });
      const data = await parseJsonResponse<{ error?: string }>(res);

      if (!res.ok) {
        setError(data.error ?? "Could not set password");
        setLoading(false);
        return;
      }

      redirectAfterAuth("/dashboard");
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="ella-alert-success">
        Use the student ID your administrator gave you, then choose a password
        you will use to sign in.
      </p>
      <div>
        <label
          className="ella-label"
          htmlFor="studentId"
        >
          Student ID
        </label>
        <input
          id="studentId"
          type="text"
          required
          autoCapitalize="characters"
          className={`${mobileInputClass} font-mono uppercase`}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value.toUpperCase())}
        />
      </div>
      <div>
        <label
          className="ella-label"
          htmlFor="password"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={mobileInputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label
          className="ella-label"
          htmlFor="confirm"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={mobileInputClass}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && (
        <p
          className="ella-alert-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <button type="submit" disabled={loading} className={mobileButtonClass}>
        {loading ? "Saving…" : "Create password & sign in"}
      </button>
    </form>
  );
}

export default function SetPasswordPage() {
  return (
    <AuthPageShell
      title="Set your password"
      subtitle="First-time setup"
      footer={
        <p className="text-sm text-[var(--ella-fg-muted)]">
          Already have a password?{" "}
          <Link
            href="/login"
            className="ella-link"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <Suspense
        fallback={
          <p className="text-center text-sm text-[var(--ella-fg-muted)]">Loading…</p>
        }
      >
        <SetPasswordForm />
      </Suspense>
    </AuthPageShell>
  );
}
