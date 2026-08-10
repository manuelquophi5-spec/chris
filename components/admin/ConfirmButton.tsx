"use client";

import { useEffect, useState } from "react";
import { adminBtnDanger } from "./admin-ui";

type Props = {
  label: string;
  confirmLabel?: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
};

/**
 * Inline destructive-action confirmation: arms on first click, confirms on
 * second. Standard pattern for irreversible admin actions across the app —
 * no native window.confirm, no modal.
 */
export function ConfirmButton({
  label,
  confirmLabel = "Yes, confirm",
  message,
  onConfirm,
  disabled,
  className,
}: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 6000);
    return () => clearTimeout(id);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        className={className ?? adminBtnDanger}
        disabled={disabled}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span
      className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ella-danger)]/30 bg-[var(--ella-danger-subtle)] px-2.5 py-1.5 text-xs"
      role="alertdialog"
      aria-label={message}
    >
      <span className="font-medium text-[var(--ella-danger)]">{message}</span>
      <button
        type="button"
        className="font-semibold text-[var(--ella-danger)] underline underline-offset-2 disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {busy ? "Working…" : confirmLabel}
      </button>
      <button
        type="button"
        className="text-[var(--ella-fg-subtle)] hover:text-[var(--ella-fg-muted)] disabled:opacity-50"
        disabled={busy}
        onClick={() => setArmed(false)}
      >
        Cancel
      </button>
    </span>
  );
}
