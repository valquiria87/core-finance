# Evolucao: OAuth no MCP (em vez de token na URL)

## Problema atual
Tokens na URL podem vazar em logs, historico e compartilhamento.

## Evolucao proposta
- Usar fluxo OAuth 2.0 para autorizar o MCP/cliente.
- Armazenar tokens no backend (Etapa 2), com refresh automatico.
- Passar apenas sessao/escopo para o frontend.
- Revogar tokens ao desconectar.

## Beneficios
- Menor risco de vazamento.
- Controle de escopo e expiracao.
- Auditoria de acesso.
