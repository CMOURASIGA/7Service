import 'server-only';

import { generateId, getMockStore, nowIso } from '@/lib/mock/store';
import { AppError } from '@/lib/errors';
import type { Id, InternalUser, Invitation } from '@/types/domain';

import { writeAudit } from './audit';

/**
 * Service de convites (Etapa 9). Validade de 24h; reenvio gera novo token
 * (aqui simulado por um novo `id`/`expiresAt`) e invalida o anterior.
 */

const INVITATION_TTL_HOURS = 24;

export function listInvitations(): Invitation[] {
  return [...getMockStore().invitations].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function expiresAtFromNow(): string {
  const date = new Date();
  date.setHours(date.getHours() + INVITATION_TTL_HOURS);
  return date.toISOString();
}

export function resendInvitation(invitationId: Id, actor: InternalUser): Invitation {
  const store = getMockStore();
  const previous = store.invitations.find((inv) => inv.id === invitationId);
  if (!previous) {
    throw new AppError('NOT_FOUND', 'Convite não encontrado');
  }

  previous.status = 'CANCELLED';
  previous.cancelledAt = nowIso();

  const next: Invitation = {
    id: generateId(),
    identityId: previous.identityId,
    status: 'SENT',
    expiresAt: expiresAtFromNow(),
    sentAt: nowIso(),
    acceptedAt: null,
    cancelledAt: null,
    createdAt: nowIso(),
  };
  store.invitations.push(next);

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'invitation.resent',
    targetType: 'invitation',
    targetId: next.id,
  });

  return next;
}

export function cancelInvitation(invitationId: Id, actor: InternalUser): Invitation {
  const invitation = getMockStore().invitations.find((inv) => inv.id === invitationId);
  if (!invitation) {
    throw new AppError('NOT_FOUND', 'Convite não encontrado');
  }

  invitation.status = 'CANCELLED';
  invitation.cancelledAt = nowIso();

  writeAudit({
    actorLabel: `${actor.firstName} ${actor.lastName}`,
    action: 'invitation.cancelled',
    targetType: 'invitation',
    targetId: invitation.id,
  });

  return invitation;
}
