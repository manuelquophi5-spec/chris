"use client";

import { useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { APP_SHORT_TITLE } from "@/lib/brand";
import { toastError, toastSuccess } from "@/lib/toast";

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toastError("Passwords do not match");
      return;
    }
    if (newPassword.length < 10) {
      toastError("Password must be at least 10 characters with letters and numbers");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toastError("Password must include letters and numbers");
      return;
    }

    setChanging(true);
    try {
      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Could not change password");
        return;
      }
      toastSuccess(data.message ?? "Password changed");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChanging(false);
    }
  }

  async function handleRequestReset() {
    setRequesting(true);
    try {
      const res = await authFetch("/api/auth/request-reset", {
        method: "POST",
      });
      const data = await parseJsonResponse<{ error?: string; message?: string }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Could not request reset");
        return;
      }
      toastSuccess("Reset requested. An administrator will review it.");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="animate-page-enter space-y-6">
      <div className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Your profile</h2>
        <p className="ella-text-muted mt-2 text-sm">
          This information is managed by your administrator. Contact them to update your name, program, or level.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-[var(--ella-fg-subtle)]">App</dt>
            <dd className="font-medium text-[var(--ella-fg)]">{APP_SHORT_TITLE}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--ella-fg-subtle)]">Role</dt>
            <dd className="font-medium text-[var(--ella-fg)]">Student</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={handleChangePassword} className="ella-card-padded space-y-4">
        <div>
          <h2 className="ella-heading-section text-lg">Change password</h2>
          <p className="ella-text-muted mt-1 text-sm">
            Enter your current password and choose a new one.
          </p>
        </div>
        <label className="block">
          <span className="ella-label">Current password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="ella-input mt-1"
          />
        </label>
        <label className="block">
          <span className="ella-label">New password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="ella-input mt-1"
          />
        </label>
        <label className="block">
          <span className="ella-label">Confirm new password</span>
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={10}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="ella-input mt-1"
          />
        </label>
        <button
          type="submit"
          disabled={changing}
          className="ella-btn-primary w-full min-h-[48px]"
        >
          {changing ? "Changing…" : "Change password"}
        </button>
      </form>

      <div className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">Trouble signing in?</h2>
        <p className="ella-text-muted mt-2 text-sm">
          If you forgot your password, request a reset. An administrator will clear your password so you can set a new one.
        </p>
        <button
          type="button"
          onClick={() => void handleRequestReset()}
          disabled={requesting}
          className="ella-btn-secondary mt-4 w-full min-h-[48px]"
        >
          {requesting ? "Requesting…" : "Request password reset"}
        </button>
      </div>
    </div>
  );
}
