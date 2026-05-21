type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthPageShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-slate-50 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-lg font-bold tracking-tight text-emerald-800">Ella</p>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center">{footer}</div>}
      </div>
    </div>
  );
}

export const mobileInputClass =
  "mt-1.5 w-full min-h-[48px] rounded-xl border border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

export const mobileButtonClass =
  "w-full min-h-[48px] rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white active:bg-emerald-800 disabled:opacity-50";
