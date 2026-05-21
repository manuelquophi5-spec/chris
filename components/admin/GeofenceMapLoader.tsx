"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GeofenceMap } from "./GeofenceMap";

const GeofenceMapDynamic = dynamic(
  () => import("./GeofenceMap").then((m) => m.GeofenceMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(52vh,420px)] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500">
        Loading map…
      </div>
    ),
  },
);

export function GeofenceMapLoader(props: ComponentProps<typeof GeofenceMap>) {
  return <GeofenceMapDynamic {...props} />;
}
