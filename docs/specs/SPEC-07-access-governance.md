# SPEC 07 - Governanca central de acessos por produto

## Objetivo
O 7Service e a fonte de verdade da autorizacao para cada (identidade, cliente, produto, papel).
Cada produto (7Commander, 7Clinic ou outro) mantem seus proprios usuarios locais, memberships, regras e dados operacionais.

## Contrato de autorizacao
Acesso efetivo exige: identidade ACTIVE, cliente ACTIVE, membership ACTIVE, produto ACTIVE, assinatura ACTIVE e vigente, grant ACTIVE, papel valido e vinculo local ativo no tenant correto.
Na falha de consulta central, vinculo inexistente ou permissao local insuficiente, negar acesso sem recorrer a privilegios implicitos.

## Provisionamento
Para cada produto, criar adaptador autenticado servidor a servidor, com operacoes idempotentes:
- findLocalAccount (nunca vincular so pelo email sem revisao);
- bindCentralIdentity (registro auditado da identidade central e usuario local);
- bindCentralClient (empresa central e organizacao local);
- applyProductRole (mapeamento de papel explicito);
- getProvisioningStatus (retorno verificavel do produto);
- suspendAccess (efeito em sessao previamente autenticada);
- restoreAccess (somente quando a concessao central e local permitirem).

## Estados
NOT_REQUESTED, PENDING, PROVISIONED, FAILED, SUSPENDED, REVOKED.
7Service nao pode apresentar PROVISIONED sem confirmacao autenticada do sistema de destino.
A nova tela /acessos inicialmente exibe 'Nao verificado' quando o adaptador nao estiver implementado.

## Piloto interno Consult Services
Usar o cadastro juridico real da empresa, uma assinatura real COMMANDER7, identidades globais para administradores e concessoes explicitas.
Mapear cliente central para organizacao CONSULT SERVICES ja existente no Commander; nao criar organizacao duplicada.
Mapear identidade central aos usuarios locais ja existentes de Christian e Rodrigo, sem alterar login ou revogar acessos ate validar.
Terceiro usuario requer nome e email autorizados, convite confirmado, conta local vinculada e papel de minimo privilegio.

## Evidencias de aceite
1. Usuario com concessao central pode entrar apenas na empresa e produto correspondentes.
2. Uma pessoa pode ter dois produtos e papeis diferentes.
3. Negacao por falta de grant e HTTP 403 nas APIs protegidas.
4. Suspensao central invalida acesso com sessao aberta.
5. Restauracao recupera acesso com a sessao valida, sem conceder permissoes adicionais.
6. Requisicoes ao produto preservam RLS e auditam a decisao.
7. Falha de provisionamento aparece como pendencia visivel.

## Estado de implementacao
Implementado em develop: matriz de concessoes centrais /acessos e links para gerenciar identidades.
Pendentes: adaptadores de destino, verificacao confiavel de provisionamento, orquestracao e testes end-to-end no fluxo de novo usuario.
Esta SPEC nao autoriza criar usuarios ficticios nem promover main sem gates.