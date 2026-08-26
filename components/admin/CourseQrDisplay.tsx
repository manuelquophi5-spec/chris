"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";
import { adminBtnGhost } from "./admin-ui";

type QrCode = {
  url: string;
  image: string;
};

async function toQrImage(url: string): Promise<string> {
  return toDataURL(url, { margin: 1, width: 220 });
}

export function CourseQrDisplay({ courseId }: { courseId: string }) {
  const [code, setCode] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCode(null);

    async function load() {
      const res = await authFetch(`/api/admin/courses/${courseId}/qr`);
      const data = await parseJsonResponse<{ error?: string; url?: string }>(
        res,
      );
      if (!res.ok || !data.url) {
        if (!cancelled) {
          toastError(data.error ?? "Could not load QR code");
          setLoading(false);
        }
        return;
      }
      const image = await toQrImage(data.url);
      if (!cancelled) {
        setCode({ url: data.url, image });
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <p className="ella-text-muted text-sm">Loading QR code…</p>
    );
  }

  if (!code) return null;

  return (
    <QrCard
      label="Class QR"
      hint="Project or print this — students scan it to check in, and scan it again to check out."
      image={code.image}
      url={code.url}
    />
  );
}

function QrCard({
  label,
  hint,
  image,
  url,
}: {
  label: string;
  hint: string;
  image: string;
  url: string;
}) {
  return (
    <div className="ella-panel-muted flex flex-col items-center gap-3 p-4 text-center">
      <p className="ella-label font-semibold">{label}</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, next/image can't optimize it */}
      <img src={image} alt={`${label} — scan to check in or out`} width={220} height={220} />
      <p className="ella-text-muted text-xs">{hint}</p>
      <div className="flex gap-2">
        <a
          href={image}
          download={`${label.toLowerCase().replace(/\s+/g, "-")}.png`}
          className={adminBtnGhost}
        >
          Download
        </a>
        <button
          type="button"
          className={adminBtnGhost}
          onClick={() => void navigator.clipboard.writeText(url)}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}
