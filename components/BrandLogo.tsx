import Image from "next/image";
import { APP_SHORT_TITLE, LOGO_SRC } from "@/lib/brand";

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
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src={LOGO_SRC}
        alt={`${APP_SHORT_TITLE} logo`}
        width={size}
        height={size}
        className="h-auto w-auto object-contain"
        style={{ width: size, height: size }}
        priority
      />
      {showName && <p className={nameClassName}>{APP_SHORT_TITLE}</p>}
    </div>
  );
}
