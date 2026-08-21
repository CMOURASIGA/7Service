/**
 * Tipos de domínio do 7Service.
 *
 * Espelham 1:1 as tabelas de `supabase/migrations` (ver `docs/MIGRATIONS.md`).
 * Usados tanto pela camada de mock (`src/lib/mock`) quanto — quando o
 * Supabase for provisionado — pela implementação real dos services, para
 * que a troca não exija alterar UI nem assinatura de função.
 */

export type Id = string;
export type IsoDateTime = string;
export type IsoDate = string;

// ---------------------------------------------------------------------------
// RBAC interno (Etapa 1)
// ---------------------------------------------------------------------------

export type InternalRoleCode =
  'SUPER_ADMIN' | 'OPERATIONS_ADMIN' | 'SUPPORT' | 'COMMERCIAL' | 'FINANCE' | 'AUDITOR';

export interface InternalRole {
  id: Id;
  code: InternalRoleCode;
  name: string;
  description: string | null;
}

export interface InternalPermission {
  id: Id;
  code: string;
  description: string | null;
}

export type InternalUserStatus = 'ACTIVE' | 'BLOCKED';

export interface InternalUser {
  id: Id;
  authUserId: Id;
  firstName: string;
  lastName: string;
  email: string;
  status: InternalUserStatus;
  roleCodes: InternalRoleCode[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Clientes (Etapa 3)
// ---------------------------------------------------------------------------

export type PersonType = 'PF' | 'PJ';
export type ClientStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';

export interface ClientAddress {
  postalCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string;
}

export interface Client {
  id: Id;
  personType: PersonType;
  document: string;
  legalName: string;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  contactName: string | null;
  status: ClientStatus;
  notes: string | null;
  relationshipStartDate: IsoDate;
  address: ClientAddress | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Produtos (Etapa 4)
// ---------------------------------------------------------------------------

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface ProductRole {
  id: Id;
  productId: Id;
  code: string;
  name: string;
  status: ProductStatus;
}

export interface ProductModule {
  id: Id;
  productId: Id;
  code: string;
  name: string;
  status: ProductStatus;
}

export interface ProductFeature {
  id: Id;
  productId: Id;
  moduleId: Id | null;
  code: string;
  name: string;
  status: ProductStatus;
}

export interface Product {
  id: Id;
  code: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  entryUrl: string | null;
  loginUrl: string | null;
  logoPath: string | null;
  roles: ProductRole[];
  modules: ProductModule[];
  features: ProductFeature[];
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Contratos e Assinaturas (Etapa 5/6)
// ---------------------------------------------------------------------------

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CLOSED';

export interface ContractDocument {
  id: Id;
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  signedDocument: boolean;
  uploadedAt: IsoDateTime;
}

export interface Contract {
  id: Id;
  clientId: Id;
  reference: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
  status: ContractStatus;
  notes: string | null;
  documents: ContractDocument[];
  createdAt: IsoDateTime;
}

export type SubscriptionStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
export type SubscriptionEffectiveStatus =
  'ACTIVE' | 'GRACE_PERIOD' | 'BLOCKED' | 'SUSPENDED' | 'CANCELLED' | 'DRAFT';

export interface Subscription {
  id: Id;
  clientId: Id;
  contractId: Id;
  productId: Id;
  planId: Id | null;
  startDate: IsoDate;
  endDate: IsoDate | null;
  graceDays: number;
  monthlyValue: number | null;
  implementationValue: number | null;
  licenseLimit: number;
  status: SubscriptionStatus;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Identidades / usuários finais (Etapa 7)
// ---------------------------------------------------------------------------

export type IdentityStatus =
  'PENDING_INVITE' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'INVITE_EXPIRED' | 'REMOVED';

export interface Identity {
  id: Id;
  clientId: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: IdentityStatus;
  activatedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Acesso por produto / Entitlements (Etapa 8)
// ---------------------------------------------------------------------------

export type AccessStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export interface UserProductAccess {
  id: Id;
  identityId: Id;
  subscriptionId: Id;
  productRoleId: Id;
  status: AccessStatus;
  validFrom: IsoDate;
  validUntil: IsoDate | null;
  suspendedAt: IsoDateTime | null;
  suspendedReason: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface LicenseOverride {
  id: Id;
  subscriptionId: Id;
  grantedByInternalUserId: Id;
  reason: string;
  extraLicenses: number;
  createdAt: IsoDateTime;
}

export interface LicenseUsage {
  licenseLimit: number;
  extraLicenses: number;
  used: number;
  available: number;
}

// ---------------------------------------------------------------------------
// Convites (Etapa 9)
// ---------------------------------------------------------------------------

export type InvitationStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';

export interface Invitation {
  id: Id;
  identityId: Id;
  status: InvitationStatus;
  expiresAt: IsoDateTime;
  sentAt: IsoDateTime | null;
  acceptedAt: IsoDateTime | null;
  cancelledAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Auditoria (Etapa 12)
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: Id;
  occurredAt: IsoDateTime;
  actorLabel: string;
  action: string;
  targetType: string;
  targetId: Id | null;
  clientId: Id | null;
  productId: Id | null;
  reason: string | null;
  correlationId: Id;
}
