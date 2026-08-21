import type { InternalUser } from '@/types/domain';

export function Topbar({ user }: { user: InternalUser }) {
  return (
    <header className="border-border bg-background flex h-14 items-center justify-between border-b px-4">
      <div className="text-muted text-sm">Painel administrativo interno · Consult Services</div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-foreground font-medium">
          {user.firstName} {user.lastName}
        </span>
        <span className="text-muted">· {user.roleCodes.join(', ')}</span>
      </div>
    </header>
  );
}
