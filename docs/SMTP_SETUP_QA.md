# 7Service - Configuração de e-mail de autenticação (develop)

A entrega de convites e recuperação depende do **Supabase Auth**; nenhum frontend pode contornar HTTP 429. O último diagnóstico do Auth foi `over_email_send_rate_limit`.

## Procedimento administrativo

1. Confirmar o projeto Supabase do 7Service: `mwsqzumudqoqlhwlwquf`.
2. Em Authentication > SMTP Settings, configurar SMTP transacional com remetente/domínio verificado. Inserir credenciais **apenas no painel seguro do Supabase**, nunca no repositório, conversa ou log.
3. Em Authentication > Rate Limits, configurar limite de envio compatível com o provedor após ativar SMTP. Não elevar limites antes de configurar proteção contra abuso.
4. Em Authentication > Email Templates, configurar **Invite user** e **Reset password** para conter a variável `{{ .Token }}`, permitindo código de uso único. Exemplo de texto seguro para convite: "Acesse o portal de ativação do 7Service e informe seu e-mail e o código {{ .Token }}. Não compartilhe o código."
5. Incluir no convite URL pública de ativação `https://7service-git-develop-christians-projects-4954426e.vercel.app/aceitar-convite`; na recuperação, URL pública `https://7service-git-develop-christians-projects-4954426e.vercel.app/redefinir-senha`.
6. Preservar o Site URL do ambiente e a allowlist de Redirect URLs; evitar links de autenticação consumidos automaticamente por scanners.
7. Testar com conta QA existente, **não criar novo usuário Auth**. Solicitar uma recuperação, conferir recebimento de código e confirmar a nova senha pelo endpoint `verifyOtp` do Supabase.
8. Confirmar que a conta QA não recebe acesso ao painel administrativo; na sequência, conferir concessão e revogação no produto QA.

## Evidência exigida

Registrar horário, status do envio no Supabase Auth, sucesso/falha do código OTP, definição de senha, login e bloqueio do painel administrativo. Nunca coletar códigos OTP, senhas, JWT ou links assinados nos relatórios.

Esta configuração externa **não é aplicada por deploy GitHub** e exige conta com privilégio administrativo Supabase. Antes dos pilotos de 7Commander e 7Clinic, formalizar a integração da identidade entre produtos; criar uma identidade no Auth do 7Service não cria login automaticamente no Auth de outro produto.
