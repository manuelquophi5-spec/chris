"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { toastError, toastSuccess } from "@/lib/toast";
import { QR_MIN_MINUTES_BEFORE_CHECKOUT } from "@/lib/qr-toggle";
import { adminBtnGhost } from "./admin-ui";

type QrCode = {
  url: string;
  image: string;
};

async function toQrImage(url: string): Promise<string> {
  return toDataURL(url, { margin: 1, width: 260 });
}

export function CourseQrDisplay({ courseId }: { courseId: string }) {
  const [code, setCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCode(null);

    async function load() {
      try {
        const res = await authFetch(`/api/admin/courses/${courseId}/qr`);
        const data = await parseJsonResponse<{ error?: string; qrUrl?: string }>(
          res,
        );
        if (!res.ok || !data.qrUrl) {
          if (!cancelled) toastError(data.error ?? "Could not load the QR code");
          return;
        }
        const image = await toQrImage(data.qrUrl);
        if (!cancelled) setCode({ url: data.qrUrl, image });
      } catch {
        if (!cancelled) toastError("Could not load the QR code");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return <p className="ella-text-muted text-sm">Loading QR code…</p>;
  }

  if (!code) return null;

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess("Link copied");
    } catch {
      toastError("Could not copy — select and copy the link manually.");
    }
  }

  return (
    <div className="ella-panel-muted mx-auto flex max-w-sm flex-col items-center gap-3 p-4 text-center">
      <p className="ella-label font-semibold">Class QR — check in &amp; check out</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, next/image can't optimize it */}
      <img
        src={code.image}
        alt="Class QR code — scan to check in or check out"
        width={260}
        height={260}
      />
      <p className="ella-text-muted text-xs">
        One code for the whole class. A student&apos;s first scan checks them in;
        scanning again (at least {QR_MIN_MINUTES_BEFORE_CHECKOUT} minutes later)
        checks them out. Print or project it in the room.
      </p>
      <div className="flex gap-2">
        <a href={code.image} download="class-qr.png" className={adminBtnGhost}>
          Download
        </a>
        <button
          type="button"
          className={adminBtnGhost}
          onClick={() => void copyLink(code.url)}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
