# Webhooks (receber avisos e levar ao cliente)

## Objetivo
Receber avisos de atualizacao de dados (novas transacoes, mudanca de status)
e leva-los ao cliente por push, SMS ou WhatsApp.

## Fontes

### Plaid (sandbox)
- Eventos comuns: `TRANSACTIONS` (DEFAULT_UPDATE, SYNC_UPDATES_AVAILABLE),
  `ITEM` (ERROR, PENDING_EXPIRATION, USER_PERMISSION_REVOKED).
- Webhook URL e informada ao criar o Item de sandbox (parametro `webhook`).
- Para testar, use a simulacao de webhook do sandbox.

### Pluggy
- Webhooks sao cadastrados por aplicacao (URL + eventos).
- Eventos incluem atualizacoes de item/sync e pagamentos.
- Use a lista de webhooks e eventos recentes para depurar entregas.

## Fluxo proposto (Etapa 2 - backend)
1. Provedor envia POST para a URL publica do backend.
2. Backend valida a assinatura/origem (JWT no Plaid; segredo no Pluggy).
3. Backend registra o evento (idempotencia por id de evento).
4. Backend atualiza cache/dados e notifica o cliente (push/SMS/WhatsApp).
5. Front-end (chat) consulta os dados atualizados via MCP/backend.

## Seguranca
- Nunca versionar segredos de webhook.
- Validar assinatura antes de processar.
- Responder 2xx rapidamente e processar de forma assincrona quando necessario.
- Registrar apenas metadados, nao dados sensiveis.

## Teste no sandbox (Plaid)
- Criar Item com webhook URL (ex.: tunnel local).
- Simular evento `DEFAULT_UPDATE` (TRANSACTIONS) para validar o fluxo.
- Conferir logs e idempotencia.

## Entrega ao cliente (ideias)
- Push notification no app.
- SMS com resumo ("nova transacao de R$ X").
- WhatsApp com link para ver detalhes no chat.


## Status neste repositorio
- Documentacao e planejamento (Etapa 2).
- Implementacao de backend com webhook adicionada em `backend/`.
- Teste de webhook no sandbox realizado (ver abaixo).

## Teste realizado (sandbox)
- Webhook URL registrada: https://rzghrtuojjxtbakafcmj.supabase.co/functions/v1/dio-chat
- Produtos iniciais: transactions, auth, identity
- Evento simulado: TRANSACTIONS / DEFAULT_UPDATE
- Resultado: webhook_fired = true
- Observacao: o disparo nao cria novas transacoes; valida apenas a notificacao.

