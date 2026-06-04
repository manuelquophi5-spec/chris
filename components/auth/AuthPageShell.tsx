import { BrandLogo } from "@/components/BrandLogo";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthPageShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mobile-app-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size={72} />
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--ella-fg-muted)]">{subtitle}</p>
          )}
        </div>
        <div className="ella-card p-5 sm:p-6">
          <h1 className="text-xl font-bold tracking-tight text-[var(--ella-fg)]">
            {title}
          </h1>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}

export const mobileInputClass = "ella-input mt-1.5";

export const mobileButtonClass = "ella-btn-primary w-full";
