"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GeofenceMap } from "./GeofenceMap";

const GeofenceMapDynamic = dynamic(
  () => import("./GeofenceMap").then((m) => m.GeofenceMap),
  {
    ssr: false,
    loading: () => (
      <div className="ella-panel-muted flex h-[min(52vh,420px)] items-center justify-center text-sm text-[var(--ella-fg-subtle)]">
        Loading map…
      </div>
    ),
  },
);

export function GeofenceMapLoader(props: ComponentProps<typeof GeofenceMap>) {
  return <GeofenceMapDynamic {...props} />;
}
