# Domínio de Licenças e Assinaturas

## Regra comercial

O cliente contrata mensalidade por sistema. Cada produto possui sua própria assinatura, vigência, quantidade de licenças, valor e status.

## Dados por assinatura de produto

- client_id;
- contract_id;
- product_id;
- plano;
- data de início;
- data de fim;
- quantidade de licenças;
- módulos contratados;
- features liberadas;
- status;
- valor mensal;
- valor de implantação opcional;
- observações comerciais.

## Excesso de licenças

Ao atingir o limite, o sistema deve alertar e bloquear a concessão normal, mas um operador com permissão elevada pode autorizar exceção explícita. A exceção exige motivo e auditoria.

## Carência após fim da vigência

Após `data_fim`, existe período de carência de 5 dias corridos. Durante a carência, o acesso permanece ativo e o 7Service exibe alerta operacional.

No término da carência, os acessos vinculados àquela assinatura devem ser bloqueados/suspensos por produto.

Exemplo:

```text
Data fim: 31/08/2026
Carência: 01/09 a 05/09
Bloqueio: a partir de 06/09/2026
```

A implementação deve evitar depender apenas de job agendado: cada produto também deve validar o estado efetivo da assinatura no momento da autorização, para que atraso de processamento não mantenha acesso indevido.

## Reativação

Renovação ou regularização da assinatura pode reativar os acessos daquele produto conforme política administrativa, preservando perfis e histórico anteriores.

## Independência entre produtos

Inadimplência ou encerramento do 7Commander não suspende automaticamente CRM Flow, 7Legal ou qualquer outro produto com assinatura ativa.
