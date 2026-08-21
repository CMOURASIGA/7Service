import 'server-only';

import type {
  AuditLog,
  Client,
  Contract,
  Id,
  Identity,
  InternalPermission,
  InternalRole,
  InternalUser,
  Invitation,
  LicenseOverride,
  Product,
  Subscription,
  UserProductAccess,
} from '@/types/domain';

/**
 * Store mockado em memória, usado enquanto o projeto Supabase real não
 * existe (ver docs/MIGRATIONS.md - "Estado atual").
 *
 * LIMITAÇÃO CONHECIDA: em produção na Vercel (serverless), cada instância
 * de função pode ter sua própria cópia deste módulo, e uma instância pode
 * ser reciclada a qualquer momento. Ou seja, alterações feitas por um
 * usuário podem não ser visíveis em outra requisição. Isso é aceitável
 * para demonstração/validação de fluxo, mas não deve ser confundido com
 * persistência real. `globalThis` é usado para sobreviver a hot-reload em
 * desenvolvimento e manter alguma consistência dentro da mesma instância.
 *
 * Quando o Supabase for provisionado, cada função em `src/services/*`
 * troca a chamada a este store pela chamada real ao Supabase — a
 * assinatura das funções de service não muda.
 */

interface MockStore {
  internalRoles: InternalRole[];
  internalPermissions: InternalPermission[];
  internalRolePermissions: Array<{ roleId: Id; permissionId: Id }>;
  internalUsers: InternalUser[];
  clients: Client[];
  products: Product[];
  contracts: Contract[];
  subscriptions: Subscription[];
  identities: Identity[];
  userProductAccess: UserProductAccess[];
  licenseOverrides: LicenseOverride[];
  invitations: Invitation[];
  auditLogs: AuditLog[];
}

const GLOBAL_KEY = '__7service_mock_store__';

function id(): string {
  return crypto.randomUUID();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function buildSeed(): MockStore {
  const permissionsList: Array<[string, string]> = [
    ['clients.manage', 'Criar, editar, suspender e reativar clientes'],
    ['clients.view', 'Consultar clientes'],
    ['products.manage', 'Administrar catálogo de produtos'],
    ['contracts.manage', 'Administrar contratos e assinaturas'],
    ['licenses.override', 'Autorizar exceção de limite de licença'],
    ['users.manage', 'Criar e administrar usuários finais'],
    ['users.access.manage', 'Conceder, alterar e suspender acesso por produto'],
    ['invitations.manage', 'Reenviar/cancelar convites'],
    ['recovery.initiate', 'Iniciar recuperação de acesso de usuário'],
    ['audit.view', 'Consultar auditoria'],
    ['internal_users.manage', 'Cadastrar e administrar operadores internos e RBAC'],
  ];
  const internalPermissions: InternalPermission[] = permissionsList.map(([code, description]) => ({
    id: id(),
    code,
    description,
  }));
  const permByCode = (code: string) => internalPermissions.find((p) => p.code === code)!.id;

  const roleDefs: Array<[InternalRole['code'], string, string, string[]]> = [
    [
      'SUPER_ADMIN',
      'Super Administrador',
      'Acesso administrativo completo ao 7Service',
      permissionsList.map(([c]) => c),
    ],
    [
      'OPERATIONS_ADMIN',
      'Administrador de Operações',
      'Administra clientes, produtos, contratos e acessos',
      [
        'clients.manage',
        'clients.view',
        'products.manage',
        'contracts.manage',
        'users.manage',
        'users.access.manage',
        'invitations.manage',
        'recovery.initiate',
        'audit.view',
      ],
    ],
    [
      'SUPPORT',
      'Suporte',
      'Consulta usuários/clientes, reenvia convite e inicia recuperação',
      ['clients.view', 'invitations.manage', 'recovery.initiate'],
    ],
    [
      'COMMERCIAL',
      'Comercial',
      'Administra contratos e assinaturas',
      ['clients.view', 'contracts.manage'],
    ],
    [
      'FINANCE',
      'Financeiro',
      'Consulta dados comerciais e licenciamento',
      ['clients.view', 'contracts.manage', 'audit.view'],
    ],
    [
      'AUDITOR',
      'Auditor',
      'Acesso somente leitura à auditoria e aos domínios administrativos',
      ['clients.view', 'audit.view'],
    ],
  ];

  const internalRoles: InternalRole[] = roleDefs.map(([code, name, description]) => ({
    id: id(),
    code,
    name,
    description,
  }));
  const roleByCode = (code: string) => internalRoles.find((r) => r.code === code)!.id;

  const internalRolePermissions = roleDefs.flatMap(([code, , , perms]) =>
    perms.map((permCode) => ({ roleId: roleByCode(code), permissionId: permByCode(permCode) })),
  );

  const superAdminId = id();
  const internalUsers: InternalUser[] = [
    {
      id: superAdminId,
      authUserId: 'mock-auth-super-admin',
      firstName: 'Ana',
      lastName: 'Administradora',
      email: 'ana.admin@consultservices.com.br',
      status: 'ACTIVE',
      roleCodes: ['SUPER_ADMIN'],
      createdAt: daysAgo(120),
      updatedAt: daysAgo(120),
    },
  ];

  const acmeId = id();
  const clients: Client[] = [
    {
      id: acmeId,
      personType: 'PJ',
      document: '12345678000199',
      legalName: 'ACME Soluções Ltda',
      tradeName: 'ACME',
      phone: '(11) 4002-8922',
      email: 'contato@acme.example.com',
      contactName: 'Maria Souza',
      status: 'ACTIVE',
      notes: null,
      relationshipStartDate: dateOnly(daysAgo(200)),
      address: {
        postalCode: '01310-100',
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Sala 12',
        district: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        country: 'BR',
      },
      createdAt: daysAgo(200),
      updatedAt: daysAgo(10),
    },
    {
      id: id(),
      personType: 'PJ',
      document: '98765432000155',
      legalName: 'Beta Comércio S.A.',
      tradeName: 'Beta',
      phone: '(21) 3003-1122',
      email: 'financeiro@beta.example.com',
      contactName: 'Carlos Lima',
      status: 'SUSPENDED',
      notes: 'Inadimplência em revisão comercial.',
      relationshipStartDate: dateOnly(daysAgo(400)),
      address: null,
      createdAt: daysAgo(400),
      updatedAt: daysAgo(3),
    },
  ];

  const commanderId = id();
  const crmFlowId = id();
  const legalId = id();

  const commanderManagerRoleId = id();
  const crmSupervisorRoleId = id();

  const products: Product[] = [
    {
      id: commanderId,
      code: '7COMMANDER',
      name: '7Commander',
      description: 'Gestão de projetos e operações',
      status: 'ACTIVE',
      entryUrl: 'https://7commander.example.com',
      loginUrl: null,
      logoPath: null,
      roles: [
        {
          id: commanderManagerRoleId,
          productId: commanderId,
          code: 'MANAGER',
          name: 'Gestor',
          status: 'ACTIVE',
        },
        { id: id(), productId: commanderId, code: 'ADMIN', name: 'Admin', status: 'ACTIVE' },
        { id: id(), productId: commanderId, code: 'USER', name: 'Usuário', status: 'ACTIVE' },
        {
          id: id(),
          productId: commanderId,
          code: 'VIEWER',
          name: 'Visualizador',
          status: 'ACTIVE',
        },
      ],
      modules: [
        { id: id(), productId: commanderId, code: 'PROJECTS', name: 'Projetos', status: 'ACTIVE' },
        { id: id(), productId: commanderId, code: 'REPORTS', name: 'Relatórios', status: 'ACTIVE' },
      ],
      features: [],
      createdAt: daysAgo(300),
    },
    {
      id: crmFlowId,
      code: 'CRM_FLOW',
      name: 'CRM Flow',
      description: 'Gestão comercial e relacionamento com clientes',
      status: 'ACTIVE',
      entryUrl: 'https://crmflow.example.com',
      loginUrl: null,
      logoPath: null,
      roles: [
        { id: id(), productId: crmFlowId, code: 'ADMIN', name: 'Admin', status: 'ACTIVE' },
        {
          id: crmSupervisorRoleId,
          productId: crmFlowId,
          code: 'SUPERVISOR',
          name: 'Supervisor',
          status: 'ACTIVE',
        },
        { id: id(), productId: crmFlowId, code: 'AGENT', name: 'Atendente', status: 'ACTIVE' },
      ],
      modules: [],
      features: [],
      createdAt: daysAgo(280),
    },
    {
      id: legalId,
      code: '7LEGAL',
      name: '7Legal',
      description: 'Gestão jurídica',
      status: 'ACTIVE',
      entryUrl: 'https://7legal.example.com',
      loginUrl: null,
      logoPath: null,
      roles: [
        { id: id(), productId: legalId, code: 'ADMIN', name: 'Admin', status: 'ACTIVE' },
        { id: id(), productId: legalId, code: 'LAWYER', name: 'Advogado', status: 'ACTIVE' },
      ],
      modules: [],
      features: [],
      createdAt: daysAgo(60),
    },
    {
      id: id(),
      code: '7FINANCE',
      name: '7Finance',
      description: 'Gestão financeira',
      status: 'INACTIVE',
      entryUrl: null,
      loginUrl: null,
      logoPath: null,
      roles: [],
      modules: [],
      features: [],
      createdAt: daysAgo(30),
    },
    {
      id: id(),
      code: '7EVENTOS',
      name: '7Eventos',
      description: 'Gestão de eventos',
      status: 'INACTIVE',
      entryUrl: null,
      loginUrl: null,
      logoPath: null,
      roles: [],
      modules: [],
      features: [],
      createdAt: daysAgo(30),
    },
  ];

  const contractAcmeId = id();
  const contracts: Contract[] = [
    {
      id: contractAcmeId,
      clientId: acmeId,
      reference: 'CTR-0001',
      startDate: dateOnly(daysAgo(200)),
      endDate: null,
      status: 'ACTIVE',
      notes: null,
      documents: [],
      createdAt: daysAgo(200),
    },
  ];

  const subCommanderId = id();
  const subCrmId = id();
  const subscriptions: Subscription[] = [
    {
      id: subCommanderId,
      clientId: acmeId,
      contractId: contractAcmeId,
      productId: commanderId,
      planId: null,
      startDate: dateOnly(daysAgo(200)),
      endDate: dateOnly(daysFromNow(20)),
      graceDays: 5,
      monthlyValue: 1200,
      implementationValue: 3000,
      licenseLimit: 5,
      status: 'ACTIVE',
      createdAt: daysAgo(200),
    },
    {
      id: subCrmId,
      clientId: acmeId,
      contractId: contractAcmeId,
      productId: crmFlowId,
      planId: null,
      startDate: dateOnly(daysAgo(120)),
      endDate: dateOnly(daysAgo(2)),
      graceDays: 5,
      monthlyValue: 800,
      implementationValue: null,
      licenseLimit: 3,
      status: 'ACTIVE',
      createdAt: daysAgo(120),
    },
  ];

  const joaoId = id();
  const identities: Identity[] = [
    {
      id: joaoId,
      clientId: acmeId,
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao.silva@acme.example.com',
      phone: '(11) 98888-1234',
      jobTitle: 'Coordenador',
      status: 'ACTIVE',
      activatedAt: daysAgo(150),
      createdAt: daysAgo(160),
      updatedAt: daysAgo(150),
    },
    {
      id: id(),
      clientId: acmeId,
      firstName: 'Marcia',
      lastName: 'Nogueira',
      email: 'marcia.nogueira@acme.example.com',
      phone: null,
      jobTitle: 'Analista',
      status: 'PENDING_INVITE',
      activatedAt: null,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ];

  const userProductAccess: UserProductAccess[] = [
    {
      id: id(),
      identityId: joaoId,
      subscriptionId: subCommanderId,
      productRoleId: commanderManagerRoleId,
      status: 'ACTIVE',
      validFrom: dateOnly(daysAgo(150)),
      validUntil: null,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: daysAgo(150),
      updatedAt: daysAgo(150),
    },
    {
      id: id(),
      identityId: joaoId,
      subscriptionId: subCrmId,
      productRoleId: crmSupervisorRoleId,
      status: 'ACTIVE',
      validFrom: dateOnly(daysAgo(120)),
      validUntil: null,
      suspendedAt: null,
      suspendedReason: null,
      createdAt: daysAgo(120),
      updatedAt: daysAgo(120),
    },
  ];

  const invitations: Invitation[] = [
    {
      id: id(),
      identityId: identities[1].id,
      status: 'SENT',
      expiresAt: daysFromNow(1),
      sentAt: daysAgo(0),
      acceptedAt: null,
      cancelledAt: null,
      createdAt: daysAgo(0),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: id(),
      occurredAt: daysAgo(200),
      actorLabel: 'Ana Administradora',
      action: 'client.created',
      targetType: 'client',
      targetId: acmeId,
      clientId: acmeId,
      productId: null,
      reason: null,
      correlationId: id(),
    },
    {
      id: id(),
      occurredAt: daysAgo(150),
      actorLabel: 'Ana Administradora',
      action: 'user_access.granted',
      targetType: 'user_product_access',
      targetId: joaoId,
      clientId: acmeId,
      productId: commanderId,
      reason: null,
      correlationId: id(),
    },
  ];

  return {
    internalRoles,
    internalPermissions,
    internalRolePermissions,
    internalUsers,
    clients,
    products,
    contracts,
    subscriptions,
    identities,
    userProductAccess,
    licenseOverrides: [],
    invitations,
    auditLogs,
  };
}

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: MockStore };

export function getMockStore(): MockStore {
  const globalWithStore = globalThis as GlobalWithStore;

  if (!globalWithStore[GLOBAL_KEY]) {
    globalWithStore[GLOBAL_KEY] = buildSeed();
  }

  return globalWithStore[GLOBAL_KEY];
}

export function generateId(): string {
  return id();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIso(): string {
  return dateOnly(nowIso());
}
