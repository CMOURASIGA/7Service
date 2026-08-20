# Fase 01 - Critérios de Aceite

## Objetivo

Definir o mínimo necessário para considerar a fundação do 7Service pronta para iniciar a integração dos produtos.

## Cliente

- cadastrar PF ou PJ;
- exigir CPF ou CNPJ conforme tipo;
- registrar razão social/nome, telefone, e-mail, contato e endereço completo;
- editar cadastro;
- bloquear e reativar sem exclusão física;
- consultar histórico.

## Contrato

- criar contrato vinculado ao cliente;
- vincular produto;
- informar início e fim;
- informar valores;
- informar limite de licenças;
- armazenar PDF assinado em storage privado;
- consultar documento por URL temporária;
- impedir acesso não autorizado ao PDF.

## Produto

- cadastrar produto sem mudança de código da aplicação;
- configurar URL de entrada;
- cadastrar perfis próprios do produto;
- ativar/inativar produto.

## Usuário

- criar usuário vinculado a exatamente um cliente;
- impedir vínculo ativo com múltiplos clientes;
- selecionar um ou mais produtos contratados do cliente;
- selecionar perfil específico para cada produto;
- validar licença antes de conceder acesso;
- enviar convite.

## Convite

- expirar em 24 horas;
- impedir uso de link expirado;
- permitir novo envio após expiração;
- registrar envio, reenvio, aceitação e cancelamento;
- não armazenar token sensível em texto puro.

## Acesso

- permitir múltiplos produtos por usuário;
- cada produto possui role independente;
- permitir suspensão por produto;
- suspensão de um produto não interfere nos demais;
- permitir suspensão global administrativa da identidade em caso excepcional.

## Vigência

- assinatura ativa até `end_date`;
- após fim, entrar em GRACE_PERIOD por 5 dias;
- no 6º dia bloquear acesso ao produto;
- decisão de acesso deve ser validada no backend;
- processo agendado pode atualizar status, mas não é a única defesa.

## Licença

- mostrar contratado, utilizado e disponível;
- ao atingir limite, avisar e exigir override autorizado para exceção;
- toda exceção deve registrar motivo e auditoria;
- usuário sem assinatura válida não pode ser provisionado.

## Administração Interna

- existir SUPER_ADMIN funcional;
- existir estrutura de RBAC para perfis futuros;
- tela administrativa para cadastro de operadores internos;
- operador interno autenticado deve existir na identidade central/Supabase correspondente ao 7Service.

## Auditoria

- alteração crítica registra actor, alvo, data e resultado;
- alteração de acesso registra produto e role;
- auditoria não pode ser apagada pela UI, inclusive por SUPER_ADMIN.

## UX

- sem `window.alert()` para mensagens operacionais;
- loading, erro, vazio e sucesso tratados;
- ações destrutivas exigem confirmação;
- status não depende apenas de cor;
- interface segue identidade Consult Services.

## Gate para integração

A Onda 1 de 7Commander e CRM Flow só começa quando todos os itens críticos acima estiverem validados em ambiente development e não houver falha conhecida de isolamento, licença, autorização ou auditoria.
