export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="border-border bg-background rounded-lg border p-4">
      <div className="text-muted text-xs font-medium">{label}</div>
      <div className="text-foreground mt-1 text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-muted mt-1 text-xs">{hint}</div> : null}
    </div>
  );
}
