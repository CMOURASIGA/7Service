'use client';

import { useState, type ReactNode } from 'react';

/**
 * Confirmação inline para ações destrutivas/de segurança, sem usar
 * `window.confirm`/`alert` (docs/02-design/DESIGN_SYSTEM.md,
 * docs/SPEC_STATUS.md - "sem window.alert() para mensagens operacionais").
 * Expande um painel com o impacto da ação e (opcionalmente) um motivo
 * antes de habilitar a confirmação.
 */
export function ConfirmAction({
  triggerLabel,
  impactMessage,
  action,
  requireReason,
  confirmLabel = 'Confirmar',
  tone = 'default',
}: {
  triggerLabel: string;
  impactMessage: string;
  action: (formData: FormData) => void | Promise<void>;
  requireReason?: boolean;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}) {
  const [open, setOpen] = useState(false);

  const buttonClass =
    tone === 'danger'
      ? 'border-red-200 text-danger hover:bg-red-50'
      : 'border-border text-foreground hover:bg-slate-50';

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium ${buttonClass}`}
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="border-border rounded-md border bg-slate-50 p-3">
      <p className="text-foreground mb-2 text-sm">{impactMessage}</p>
      <form
        action={async (formData) => {
          await action(formData);
          setOpen(false);
        }}
        className="flex flex-col gap-2"
      >
        {requireReason ? (
          <textarea
            name="reason"
            required
            placeholder="Motivo (obrigatório)"
            rows={2}
            className="border-border focus:border-brand-600 focus:ring-brand-100 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          />
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              tone === 'danger' ? 'bg-danger hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border-border rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReadonlyImpactNote({ children }: { children: ReactNode }) {
  return <p className="text-muted text-xs">{children}</p>;
}
