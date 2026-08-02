"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import {
  AuthPageShell,
  mobileInputClass,
} from "@/components/auth/AuthPageShell";
import { useBrand } from "@/components/BrandProvider";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  authFetch,
  parseJsonResponse,
  redirectAfterAuth,
} from "@/lib/auth-client";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { appName } = useBrand();
  const { standalone, ios, installing, canPromptInstall, promptInstall } =
    usePwaInstall();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId.trim().toUpperCase(),
          password,
        }),
      });

      const data = await parseJsonResponse<{
        error?: string;
        requiresPasswordSetup?: boolean;
        studentId?: string;
      }>(res);

      if (res.status === 200 && data.requiresPasswordSetup) {
        const id = data.studentId ?? studentId.trim().toUpperCase();
        toastInfo("Set your password to finish signing in.");
        redirectAfterAuth(`/set-password?id=${encodeURIComponent(id)}`);
        return;
      }

      if (!res.ok) {
        toastError(data.error ?? "Invalid student ID or password");
        setLoading(false);
        return;
      }

      toastSuccess("Signed in. Welcome back.");
      const from = searchParams.get("from") ?? "/dashboard";
      redirectAfterAuth(from);
    } catch {
      toastError("Network error. Check your connection and try again.");
      setLoading(false);
    }
  }

  async function handleInstall() {
    if (standalone) {
      toastInfo(`${appName} is already installed.`);
      return;
    }

    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toastSuccess(`${appName} installed. Open it from your home screen.`);
      return;
    }
    if (outcome === "dismissed") return;

    toastInfo(
      ios
        ? "On iPhone: open in Safari, tap Share, then Add to Home Screen."
        : "Use your browser menu (⋮) → Install app, or the install icon in the address bar.",
    );
  }

  function handleSkip() {
    toastInfo("Set up your password first, then return here to sign in.");
    router.push("/set-password");
  }

  function handleForgotPassword() {
    toastInfo(
      "Open Set password with your Student ID. If you already have a password, ask your administrator to reset it.",
    );
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
        <div className="flex items-center justify-between gap-2">
          <label className="ella-label" htmlFor="password">
            Password
          </label>
          <Link
            href="/set-password"
            onClick={handleForgotPassword}
            className="ella-link text-xs font-semibold"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={mobileInputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="mt-1.5 text-xs text-[var(--ella-fg-subtle)]">
          First time? Leave password empty and submit.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="ella-btn-primary min-h-[48px] w-full"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={installing || standalone}
          className="ella-btn-secondary min-h-[48px] w-full disabled:opacity-50"
        >
          {standalone
            ? "Installed"
            : installing
              ? "Installing…"
              : canPromptInstall
                ? "Install app"
                : "Install app"}
        </button>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        className="ella-btn-ghost w-full min-h-[44px] text-sm"
      >
        Skip
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
