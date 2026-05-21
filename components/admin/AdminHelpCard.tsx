type Props = {
  title?: string;
  children: React.ReactNode;
};

export function AdminHelpCard({ title = "How this works", children }: Props) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 text-sm text-slate-700">
      <p className="font-bold text-slate-900">{title}</p>
      <div className="mt-2 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}
