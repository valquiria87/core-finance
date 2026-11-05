# Prompt enviado ao Lovable (Etapa 1) - formato OpenSpec

## 1. Objetivo
Criar um web app em formato de chat, publicado, que responda em portugues sobre
contas, saldos e transacoes de um banco de teste, usando MCP como tomada padrao
entre a IA e as fontes externas.

## 2. Contexto e persona
- Autora: Valquiria Coelho.
- Assistente: Core Finance.
- Tagline: O núcleo inteligente para suas conexões de Open Finance.
- Tom: empatico, claro, sem jargao, com orientacao pratica.
- Cenario: aplicacao conectada por MCP de Open Finance, usando a Pluggy como
  gerador de conexao e interface de front-end.

## 3. Fontes de dados (MCP)
- Pluggy (Streamable HTTP: https://mcp.pluggy.ai/mcp, sem chave):
  conceitos de Open Finance brasileiro (Item, connector, consentimento, recursos).
- Plaid (STDIO: uvx mcp-server-plaid, com PLAID_CLIENT_ID e PLAID_SECRET de sandbox):
  contas, saldos e transacoes ficticias.
- Regra de leitura: na Plaid, valor positivo = saida de dinheiro (debito).
- Regra de rotulo: saldo de cartao de credito deve ser exibido como
  "fatura em aberto / valor devido", nunca como "saldo disponivel".

## 4. Requisitos funcionais
1. Chat em portugues com historico de conversa.
2. Responder saldo por conta.
3. Listar transacoes recentes.
4. Mostrar 3 padroes de gasto: por categoria, por periodo, por conta.
5. Explicar termos simples (ex.: o que e um Item na Pluggy).
6. Aviso visivel e persistente de que os dados sao ficticios (sandbox).

## 5. Requisitos de UX
- Mensagens curtas, claras e empaticas.
- Valores formatados e sinalizados (entrada vs saida).
- Diferenciar conta corrente (saldo) de cartao (divida).
- Em caso de erro/ausencia de dados, explicar o proximo passo ao usuario.

## 6. Requisitos de seguranca (Etapa 1)
- Chaves apenas para prototipo no cliente (Etapa 1).
- Nenhuma chave, token ou senha em codigo versionado ou prints.
- Prever Etapa 2: backend com chaves apenas no servidor.

## 7. Criterios de aceite
- App publicado e acessivel.
- Aviso de dados ficticios visivel.
- Perguntas de exemplo funcionando: "qual e meu saldo?", "quanto gastei este mes?",
  "mostre meus gastos por categoria".
- Tabelas dos 3 padroes de gasto exibidas na conversa.
- README com caminho pergunta -> tool -> endpoint -> resposta.

## 8. Entregaveis
- App web publicado.
- Repositorio GitHub publico (nome em minusculas, sem acento).
- README.md completo.
- Pasta evidencias/ com prints (sem segredos).

## 9. Webhooks (Etapa 2 - planejado)
- Receber avisos de atualizacao de dados (novas transacoes, mudanca de status).
- Validar assinatura/origem e garantir idempotencia.
- Notificar o cliente por push, SMS ou WhatsApp.
- Ver detalhes em `docs/webhooks.md`.
