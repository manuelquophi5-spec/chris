"use client";

import { useEffect, useState } from "react";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { DEFAULT_APP_NAME, DEFAULT_LOGO_URL } from "@/lib/brand";
import { toastError, toastSuccess } from "@/lib/toast";
import { adminBtnGhost, adminBtnPrimary, adminInput, adminStack } from "./admin-ui";
import { AdminHelpCard } from "./AdminHelpCard";

type SettingsResponse = { appName: string; logoUrl: string };

export function AdminSettingsManager() {
  const [appName, setAppName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/settings");
      const data = await parseJsonResponse<SettingsResponse & { error?: string }>(res);
      if (res.ok) {
        setAppName(data.appName);
        setLogoUrl(data.logoUrl);
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await authFetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: appName.trim(),
          logoUrl: logoUrl.trim(),
        }),
      });
      const data = await parseJsonResponse<{
        error?: string;
        message?: string;
        settings?: SettingsResponse;
      }>(res);
      if (!res.ok) {
        toastError(data.error ?? "Could not update branding");
        return;
      }
      toastSuccess(data.message ?? "Branding updated");
      if (data.settings) {
        setAppName(data.settings.appName);
        setLogoUrl(data.settings.logoUrl);
      }
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setAppName(DEFAULT_APP_NAME);
    setLogoUrl("");
  }

  const previewSrc = logoUrl.trim() || DEFAULT_LOGO_URL;

  if (loading) {
    return (
      <div className={adminStack}>
        <div className="ella-card-padded animate-pulse">
          <div className="h-5 w-40 rounded bg-[var(--ella-surface-muted)]" />
          <div className="mt-4 h-10 rounded bg-[var(--ella-surface-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <div className={adminStack}>
      <div>
        <h1 className="ella-heading-page">Branding</h1>
        <p className="ella-text-muted mt-2">
          Set the name and logo shown across the app — sign-in pages, the
          student dashboard, the admin sidebar, and the installable app icon.
        </p>
      </div>

      <AdminHelpCard title="Logo requirements">
        <p>
          Paste a link to an image already hosted somewhere (your university
          website, a shared drive with public sharing on, etc). Square images
          work best. Leave it blank to use the default logo.
        </p>
      </AdminHelpCard>

      <form onSubmit={handleSave} className="ella-card-padded">
        <h2 className="ella-heading-section text-lg">App name and logo</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="ella-label font-semibold">App name</span>
            <input
              type="text"
              required
              minLength={2}
              maxLength={60}
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className={`${adminInput} text-base py-3`}
              placeholder={DEFAULT_APP_NAME}
            />
          </label>
          <label className="block">
            <span className="ella-label font-semibold">Logo URL</span>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setImgError(false);
              }}
              className={`${adminInput} text-base py-3`}
              placeholder="https://www.ug.edu.gh/logo.png"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--ella-border)] bg-[var(--ella-surface-muted)]">
            {imgError ? (
              <span className="px-1 text-center text-[10px] text-[var(--ella-fg-subtle)]">
                Couldn&apos;t load image
              </span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={() => setImgError(true)}
                onLoad={() => setImgError(false)}
              />
            )}
          </div>
          <p className="ella-text-muted text-sm">Live preview</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`${adminBtnPrimary} px-6 py-3`}
          >
            {saving ? "Saving…" : "Save branding"}
          </button>
          <button type="button" onClick={resetToDefaults} className={adminBtnGhost}>
            Reset to default
          </button>
        </div>
      </form>
    </div>
  );
}
