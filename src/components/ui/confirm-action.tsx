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
  action: (formData: FormData) =>
    | void
    | { error?: string | null; success?: string }
    | Promise<void | { error?: string | null; success?: string }>;
  requireReason?: boolean;
  confirmLabel?: string;
  tone?: 'default' | 'danger';
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string } | null>(null);

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
      {feedback?.error ? <p role="alert" className="mb-2 text-sm text-red-700">{feedback.error}</p> : null}
      {feedback?.success ? <p role="status" className="mb-2 text-sm text-green-800">{feedback.success}</p> : null}
      <form
        action={async (formData) => {
          setFeedback(null);
          try {
            const result = await action(formData);
            if (result && typeof result === 'object' && result.error) {
              setFeedback({ error: result.error });
              return;
            }
            if (result && typeof result === 'object' && result.success) {
              setFeedback({ success: result.success });
            }
            setOpen(false);
          } catch {
            setFeedback({ error: 'Não foi possível concluir a ação. Confira a situação do usuário antes de tentar novamente.' });
          }
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
