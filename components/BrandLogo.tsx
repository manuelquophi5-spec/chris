"use client";

import Image from "next/image";
import { useBrand } from "@/components/BrandProvider";

type Props = {
  size?: number;
  showName?: boolean;
  nameClassName?: string;
  className?: string;
};

export function BrandLogo({
  size = 48,
  showName = true,
  nameClassName = "mt-3 text-lg font-bold tracking-tight text-[var(--ella-fg)]",
  className = "",
}: Props) {
  const { appName, logoUrl } = useBrand();
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src={logoUrl}
        alt={`${appName} logo`}
        width={size}
        height={size}
        unoptimized={logoUrl.startsWith("http")}
        className="h-auto w-auto object-contain"
        style={{ width: size, height: size }}
        priority
      />
      {showName && <p className={nameClassName}>{appName}</p>}
    </div>
  );
}
