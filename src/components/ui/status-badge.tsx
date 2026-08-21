/**
 * StatusBadge - status sempre acompanhado de texto, nunca apenas cor
 * (docs/02-design/DESIGN_SYSTEM.md).
 */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'brand';

const TONE_CLASSES: Record<StatusTone, string> = {
  success: 'bg-green-50 text-success border-green-200',
  warning: 'bg-amber-50 text-warning border-amber-200',
  danger: 'bg-red-50 text-danger border-red-200',
  neutral: 'bg-slate-50 text-muted border-slate-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
