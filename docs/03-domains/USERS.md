# Domínio de Usuários

## Regra principal

Cada usuário pertence a um único cliente. Um mesmo e-mail não deve ser usado para representar o mesmo usuário em dois clientes distintos no modelo operacional do 7Service sem uma decisão futura de arquitetura.

## Identidade

A identidade é central e possui `user_id` imutável. E-mail é atributo de login e comunicação, não chave relacional permanente.

## Dados

- nome;
- sobrenome;
- e-mail;
- telefone opcional;
- cargo/função opcional;
- client_id obrigatório;
- status;
- timestamps relevantes.

## Estados

PENDING_INVITE, ACTIVE, SUSPENDED, BLOCKED, INVITE_EXPIRED, REMOVED.

REMOVED representa remoção lógica da operação, nunca exclusão física dos registros necessários ao histórico.

## Acesso por produto

O usuário pode possuir vários produtos do mesmo cliente. Cada produto possui seu próprio perfil.

Exemplo:

```text
Usuário: João
Cliente: ACME

7Commander -> Gestor
CRM Flow -> Supervisor
7Legal -> Visualizador
```

## Gestão de perfis

A tela do usuário deve possuir uma seção `Acessos aos produtos` com uma linha/card por produto. Cada acesso deve mostrar:

- produto;
- status;
- perfil atual;
- módulos/features quando aplicável;
- data de início;
- data de fim quando houver;
- última alteração;
- ação para editar perfil;
- ação para suspender acesso daquele produto.

Os perfis disponíveis são definidos no catálogo de cada produto. O 7Service não deve usar um conjunto global de Admin/Manager/Basic.

## Suspensão

A suspensão comercial ocorre por produto. O usuário pode continuar ativo em outros sistemas pagos pelo mesmo cliente.

Suspensão global da identidade fica reservada a motivos de segurança, desligamento completo ou decisão administrativa excepcional.

## Tela administrativa interna

O 7Service deve possuir tela para cadastrar operadores internos da Consult Services e atribuir papéis administrativos conforme RBAC. Esses operadores também residem na identidade central, porém são diferenciados dos usuários de clientes por escopo administrativo.
