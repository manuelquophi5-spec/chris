type Props = {
  title?: string;
  children: React.ReactNode;
};

export function AdminHelpCard({ title = "How this works", children }: Props) {
  return (
    <div className="ella-info-panel">
      <p className="font-semibold text-[var(--ella-fg)]">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}
