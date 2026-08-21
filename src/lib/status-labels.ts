import type {
  AccessStatus,
  ClientStatus,
  IdentityStatus,
  InvitationStatus,
  SubscriptionEffectiveStatus,
} from '@/types/domain';

import type { StatusTone } from '@/components/ui/status-badge';

export const CLIENT_STATUS_LABEL: Record<ClientStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: 'Ativo', tone: 'success' },
  SUSPENDED: { label: 'Suspenso', tone: 'warning' },
  CLOSED: { label: 'Encerrado', tone: 'neutral' },
};

export const IDENTITY_STATUS_LABEL: Record<IdentityStatus, { label: string; tone: StatusTone }> = {
  PENDING_INVITE: { label: 'Convite pendente', tone: 'warning' },
  ACTIVE: { label: 'Ativo', tone: 'success' },
  SUSPENDED: { label: 'Suspenso', tone: 'warning' },
  BLOCKED: { label: 'Bloqueado', tone: 'danger' },
  INVITE_EXPIRED: { label: 'Convite expirado', tone: 'danger' },
  REMOVED: { label: 'Removido', tone: 'neutral' },
};

export const ACCESS_STATUS_LABEL: Record<AccessStatus, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  ACTIVE: { label: 'Ativo', tone: 'success' },
  SUSPENDED: { label: 'Suspenso', tone: 'warning' },
  REVOKED: { label: 'Revogado', tone: 'danger' },
  EXPIRED: { label: 'Expirado', tone: 'neutral' },
};

export const INVITATION_STATUS_LABEL: Record<
  InvitationStatus,
  { label: string; tone: StatusTone }
> = {
  PENDING: { label: 'Pendente', tone: 'neutral' },
  SENT: { label: 'Enviado', tone: 'brand' },
  ACCEPTED: { label: 'Aceito', tone: 'success' },
  EXPIRED: { label: 'Expirado', tone: 'danger' },
  CANCELLED: { label: 'Cancelado', tone: 'neutral' },
  FAILED: { label: 'Falhou', tone: 'danger' },
};

export const SUBSCRIPTION_EFFECTIVE_STATUS_LABEL: Record<
  SubscriptionEffectiveStatus,
  { label: string; tone: StatusTone }
> = {
  ACTIVE: { label: 'Ativa', tone: 'success' },
  GRACE_PERIOD: { label: 'Em carência', tone: 'warning' },
  BLOCKED: { label: 'Bloqueada', tone: 'danger' },
  SUSPENDED: { label: 'Suspensa', tone: 'warning' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
  DRAFT: { label: 'Rascunho', tone: 'neutral' },
};
