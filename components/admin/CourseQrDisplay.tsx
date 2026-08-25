"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import { authFetch, parseJsonResponse } from "@/lib/auth-client";
import { toastError } from "@/lib/toast";
import { adminBtnGhost } from "./admin-ui";

type QrCodes = {
  checkInUrl: string;
  checkOutUrl: string;
  checkInImage: string;
  checkOutImage: string;
};

async function toQrImage(url: string): Promise<string> {
  return toDataURL(url, { margin: 1, width: 220 });
}

export function CourseQrDisplay({ courseId }: { courseId: string }) {
  const [codes, setCodes] = useState<QrCodes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCodes(null);

    async function load() {
      const res = await authFetch(`/api/admin/courses/${courseId}/qr`);
      const data = await parseJsonResponse<{
        error?: string;
        checkInUrl?: string;
        checkOutUrl?: string;
      }>(res);
      if (!res.ok || !data.checkInUrl || !data.checkOutUrl) {
        if (!cancelled) {
          toastError(data.error ?? "Could not load QR codes");
          setLoading(false);
        }
        return;
      }
      const [checkInImage, checkOutImage] = await Promise.all([
        toQrImage(data.checkInUrl),
        toQrImage(data.checkOutUrl),
      ]);
      if (!cancelled) {
        setCodes({
          checkInUrl: data.checkInUrl,
          checkOutUrl: data.checkOutUrl,
          checkInImage,
          checkOutImage,
        });
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
      <p className="ella-text-muted text-sm">Loading QR codes…</p>
    );
  }

  if (!codes) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <QrCard
        label="Check-in QR"
        hint="Project or print this for students to scan when class starts."
        image={codes.checkInImage}
        url={codes.checkInUrl}
      />
      <QrCard
        label="Check-out QR"
        hint="Show this near the end of class for students to scan on their way out."
        image={codes.checkOutImage}
        url={codes.checkOutUrl}
      />
    </div>
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
      <img src={image} alt={`${label} — scan to check in`} width={220} height={220} />
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
