'use client';

import { useState } from 'react';

import type { InternalRole, InternalUser } from '@/types/domain';

export function RoleEditor({
  user,
  roles,
  action,
}: {
  user: InternalUser;
  roles: InternalRole[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-brand-700 text-xs font-medium hover:underline"
      >
        Alterar perfis
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await action(formData);
        setOpen(false);
      }}
      className="border-border flex flex-col gap-2 rounded-md border bg-slate-50 p-2"
    >
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <label key={role.id} className="text-foreground flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              name="roleCodes"
              value={role.code}
              defaultChecked={user.roleCodes.includes(role.code)}
            />
            {role.name}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-brand-600 rounded-md px-2 py-1 text-xs font-medium text-white"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border-border rounded-md border px-2 py-1 text-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
