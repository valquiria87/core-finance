# SECURITY.md

## Onde ficam os segredos
- Plaid: `PLAID_CLIENT_ID`, `PLAID_SECRET` (sandbox/prod) em variaveis de ambiente do backend.
- Pluggy: sem chave para MCP de documentacao; chaves de app (se usadas) apenas no backend.
- Webhooks: segredo de validacao (quando aplicavel) em variaveis de ambiente.
- Nunca versionar `.env`, tokens, ou secrets em prints.

## Modelo de ameacas (resumo)
- Exposicao de chaves no frontend/repositorio.
- Webhook spoofing (eventos falsos).
- Replay de eventos.
- Injecao de payload invalido.
- Vazamento em logs.

## Mitigacoes implementadas/planejadas
- Validacao de entrada com zod no endpoint de webhook.
- Idempotencia por `webhook_id`/`request_id`.
- Logs estruturados sem dados sensiveis.
- Secrets apenas no backend (Etapa 2).
- Validacao de assinatura de webhook (a implementar em producao).
- Rate limiting e allowlist de IPs (a implementar).
- Rotacao de segredos e uso de cofre (a implementar).

## Reporte de vulnerabilidades
Abra uma issue privada ou contate a mantenedora. Nao publique segredos.
