# 7Service - Product Specification

## 1. Definição

7Service é a plataforma administrativa interna da Consult Services responsável pela gestão central de clientes, identidade, usuários, produtos, contratos, licenciamento, acessos, provisionamento e auditoria do ecossistema de software da empresa.

Não é um produto comercial e não deve ser disponibilizado aos clientes como ferramenta administrativa.

## 2. Problema

Cada produto manter usuários, perfis e licenças de forma independente cria duplicidade, inconsistência, retrabalho operacional e dificuldade de auditoria. A Consult Services necessita de uma fonte administrativa central para responder quem é o cliente, o que contratou, quantas licenças possui, quais usuários estão vinculados e quais direitos cada usuário possui em cada produto.

## 3. Objetivos

- cadastrar e administrar clientes;
- cadastrar catálogo de produtos sem dependência de código específico por produto;
- administrar contratos, planos, vigências e limites de licenciamento;
- cadastrar usuários vinculados a clientes;
- conceder acesso por produto e perfil;
- controlar módulos, features e permissões quando aplicável;
- enviar e reenviar convites;
- disponibilizar fluxo seguro de recuperação de acesso;
- suspender usuário globalmente ou apenas em produtos selecionados;
- manter histórico e auditoria;
- servir como fonte administrativa para identidade e autorização central;
- fornecer ao 7HUB a relação dos produtos aos quais o usuário possui direito de acesso.

## 4. Produtos iniciais

7Commander, 7Finance, 7Eventos, CRM Flow e 7Legal. A arquitetura deve aceitar produtos futuros por cadastro.

## 5. Conceitos centrais

### Cliente
Organização contratante da Consult Services.

### Usuário
Pessoa identificada por uma identidade única. Pode possuir diferentes acessos, perfis e permissões em diferentes produtos.

### Produto
Aplicação registrada no catálogo do ecossistema.

### Assinatura
Relação comercial que autoriza um cliente a utilizar determinado produto segundo plano, vigência e limites definidos.

### Entitlement
Direito efetivo de uso de produto, módulo, feature ou capacidade concedido ao cliente ou usuário.

### Acesso
Vínculo entre usuário, cliente e produto, com estado, perfil e permissões aplicáveis.

## 6. Fluxo operacional principal

Cliente -> Contrato/Assinatura -> Produto -> Licença -> Usuário -> Acesso -> Convite -> Ativação -> Uso -> Alteração/Suspensão -> Auditoria.

## 7. Gestão de clientes

Cada cliente deve possuir dados cadastrais, status, contatos, contratos, produtos contratados, limites de licença, usuários e histórico.

Estados mínimos: prospect opcional para evolução, ativo, suspenso, encerrado.

## 8. Gestão de produtos

O catálogo deve permitir nome, código estável, descrição, status, URL de produção, URL de login ou entrada, ícone/logo, perfis disponíveis, módulos/features, configuração de integração e metadados.

Não deve existir lógica fixa como `if product == 7Commander` para funcionalidades comuns do 7Service.

## 9. Gestão de usuários

Dados mínimos: nome, sobrenome, e-mail, telefone opcional, cargo opcional, cliente(s) permitidos conforme regra de negócio, estado da identidade e timestamps relevantes.

CPF não será requisito obrigatório para identidade.

Estados mínimos: PENDING_INVITE, ACTIVE, SUSPENDED, BLOCKED, INVITE_EXPIRED e REMOVED.

## 10. Acessos por produto

Perfil não é global. Um mesmo usuário pode ser Gestor no 7Commander, Visualizador no 7Finance e Administrador no 7Eventos.

O vínculo de acesso deve suportar usuário + cliente + produto + perfil + entitlements + status + vigência opcional.

## 11. Convites e recuperação

Ao provisionar uma identidade, o 7Service deve permitir enviar convite transacional com token seguro e expiração. A operação deve registrar envio, expiração, ativação e reenvios.

Enquanto pendente: reenviar convite, copiar link quando permitido e cancelar convite.

Após ativação: iniciar recuperação de senha/acesso, suspender, editar acessos e consultar auditoria.

Links nunca devem armazenar senha e tokens devem possuir expiração e uso controlado.

## 12. Licenciamento

O sistema deve controlar limite contratado, utilizado e disponível por assinatura/produto. A regra deve ser aplicada no backend antes do provisionamento.

O modelo deve suportar licenciamento por usuário e estar preparado para outras métricas futuras sem reestruturação completa.

## 13. Suspensão

Deve existir suspensão global da identidade e suspensão/revogação por produto. Suspender acesso ao 7Commander não implica obrigatoriamente suspender 7Finance.

Suspensões devem registrar executor, data, escopo e motivo.

## 14. Auditoria

Eventos críticos devem gerar trilha imutável ou protegida contra alteração comum. Exemplos: criação de cliente, alteração contratual, concessão/revogação de acesso, mudança de perfil, convite, suspensão, alteração de limite e mudanças administrativas.

## 15. Dashboard interno

Indicadores iniciais: clientes ativos, usuários ativos, licenças contratadas, licenças utilizadas, convites pendentes, usuários suspensos e distribuição por produto.

## 16. Suporte operacional

Busca global por nome/e-mail deve permitir localizar rapidamente identidade, cliente, produtos, status, convites e histórico. Ações rápidas deverão respeitar permissão do operador.

## 17. 7HUB

O 7HUB será uma aplicação separada, voltada ao usuário final. Após autenticação, deverá apresentar somente os produtos aos quais a identidade possui acesso ativo. Cada produto será representado por card/caixa com identidade visual, descrição e ação de entrada.

A primeira versão pode direcionar para a entrada do produto. A arquitetura deve, porém, ser preparada para SSO, evitando consolidar como requisito definitivo a necessidade de novo login em cada aplicação.

## 18. Fora do escopo inicial

- faturamento completo/ERP;
- cobrança automática;
- marketplace;
- administração do 7Service pelo cliente;
- analytics avançado de uso de cada produto;
- IAM enterprise completo de terceiros.

## 19. Critérios de sucesso

A Consult Services deve conseguir administrar um cliente e seus usuários sem acessar diretamente o banco ou painel administrativo individual de cada produto. O sistema deve impedir concessão incompatível com licença, registrar mudanças críticas e fornecer uma origem única e confiável para os direitos de acesso.
