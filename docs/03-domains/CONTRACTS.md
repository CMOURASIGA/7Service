# Domínio de Contratos

## Objetivo

Registrar o vínculo comercial formal entre Consult Services e cliente, incluindo documento assinado.

## Dados mínimos

- número/referência do contrato;
- client_id;
- data de início;
- data de término;
- status;
- observações;
- arquivo PDF assinado;
- data de upload;
- usuário interno responsável pelo upload.

## Armazenamento do PDF

O contrato assinado deve ser armazenado em storage privado. O banco guarda apenas metadados e caminho seguro. Download exige autorização de operador interno.

## Estados

DRAFT, ACTIVE, EXPIRED, SUSPENDED, CLOSED.

## Relação com produtos

Um contrato pode possuir uma ou mais assinaturas de produtos. Cada assinatura controla produto, plano, valores, licenças e vigência operacional.

## Retenção

Contratos não são excluídos fisicamente pelo fluxo comum. Substituições e aditivos devem preservar histórico.
