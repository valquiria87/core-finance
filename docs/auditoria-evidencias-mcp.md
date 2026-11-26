# Auditoria das evidências MCP e Plaid Sandbox

Esta auditoria separa o que está visível no repositório, o que o guia do instrutor registra como execução histórica e o que ainda precisa de uma captura própria para uma avaliação reproduzível. Não trata uma resposta formatada pelo assistente como substituta automática de um log de chamada à ferramenta ou à API.

## Como ler os estados

- **Com evidência visual:** há uma captura que mostra a resposta ou o resultado relevante.
- **Parcial:** há evidência de conteúdo, mas falta comprovar a conexão, a chamada de ferramenta, o endpoint ou algum detalhe exigido.
- **Não comprovado no repositório:** não foi encontrada captura ou arquivo que permita auditar a etapa. Isso não afirma que a etapa nunca foi executada localmente.

## Matriz P01–P07 e análise de padrões

| Etapa | O que o desafio pede | Evidência encontrada | Estado e lacuna |
|---|---|---|---|
| P01 — Pluggy MCP | Conectar ao servidor remoto e obter uma resposta real da documentação. | `evidencias/a1-mcp-servidores-ativos.png`, `evidencias/a2-pluggy-item-com-fontes.png` e capturas complementares de endpoints. | **Com evidência visual parcial.** A1 mostra Pluggy ativo no cliente MCP; A2 mostra a consulta de documentação e as fontes. A trilha não registra o log bruto da chamada da ferramenta. |
| P02 — conceitos | Explicar Pluggy, Item, conta e transação, com fontes. | `evidencias/pluggy-docs-mcp-conceito-pluggy-item.png` e `evidencias/pluggy-docs-mcp-conceitos-connector-item-product.png`. | **Com evidência visual.** As respostas exibem explicações e links de documentação. A captura do estado da conexão MCP continua ausente. |
| P03 — endpoints e paginação | Listar endpoints de transações, distinguir versão atual e legada e explicar cursor. | `evidencias/pluggy-docs-mcp-endpoints-transactions.png`, `...-legado-retrieve-categoria.png`, `pluggy-endpoint-transactions-v2-get.png`, `pluggy-endpoint-transactions-v2-parametros.png` e `pluggy-endpoint-transactions-legado-migracao-v2.png`. | **Boa evidência visual.** O material mostra a referência atual `GET /v2/transactions`, a rota legada e parâmetros. Para uma trilha auditável completa, ainda faltaria a captura da chamada da ferramenta. |
| P04 — aprofundamento opcional | Detalhar método, caminho, autenticação, parâmetros e continuação por cursor. | `evidencias/pluggy-docs-mcp-referencia-transaction-autenticacao.png` e capturas da referência v2/legada. | **Evidência visual parcial/forte para referência.** O PDF marca P04 como aprofundamento opcional. |
| P05 — Plaid MCP | Confirmar que o servidor local Plaid está ativo e que suas ferramentas respondem. | `evidencias/a1-mcp-servidores-ativos.png` mostra Pluggy e plaid ativos no painel MCP do Cline. | **Com evidência visual da conexão ativa.** A captura confirma os dois servidores ligados no cliente; não é um log de execução de ferramenta. |
| P06 — criar Item | Usar o MCP Plaid para criar Item Sandbox com produto `transactions` e obter o token. | `evidencias/a3-plaid-item-criado.png` mostra a chamada da ferramenta `get_sandbox_access_token` com `initial_products: transactions` e a resposta de sucesso, sem exibir token ou credenciais. | **Com evidência visual.** O resultado confirma Item Sandbox criado e token obtido para o produto `transactions`. A instituição não é identificada na captura e não deve ser presumida. |
| P07 — consultar dados | Chamar `POST /accounts/get` e `POST /transactions/get` no Sandbox, cobrir 90 dias e toda a paginação, mostrar contas, cinco transações e até três observações. | `evidencias/plaid-p07-report.json` e `scripts/plaid-p07-report.mjs`. | **Executado e validado.** O script chama `POST /accounts/get` e `POST /transactions/get` no Plaid Sandbox, cobre 90 dias (2026-08-11 a 2026-11-09) e percorre toda a paginação. Resultado: 3 contas, 34 transações recuperadas em 1 página de 500, cinco transações recentes com `account_name` preenchido e padrões de gastos (top categorias, por período e por conta). Relatório sanitizado sem credenciais, account_ids ou tokens. |

### Divergência entre o guia e as capturas Plaid do projeto

O guia do instrutor registra o ensaio de 25/09/2026, com 48 transações no período de **28/06/2026 a 25/09/2026** e cinco transações recentes datadas de 20 a 24/09.

As capturas Plaid armazenadas no repositório mostram 48 transações no período de **07/08/2026 a 26/10/2026**. A captura lista, entre as cinco mais recentes, registros de 20 a 26/10.

Portanto, os dois conjuntos não devem ser descritos como se fossem a mesma consulta. Para a entrega, use as datas efetivamente visíveis nas capturas do projeto e mantenha o resultado do guia identificado como ensaio do instrutor.

### Três padrões de gasto

O guia pede que as observações sejam fundamentadas em quantidade de registros, categoria e total, sem classificar toda transferência como consumo.

- A captura Plaid atual mostra agrupamentos por categoria e quantidades, mas não comprova, sozinha, as três observações completas com respectivos totais e explicações.
- `docs/tabela-padroes-gasto.md` é uma tabela **ilustrativa** de oito transações fictícias; não é o resultado da consulta de 48 transações.
- O Core atual calcula três visões — por categoria, por semana e por conta — usando o snapshot Pluggy persistido. Essas visões pertencem à aplicação Pluggy e não devem ser apresentadas como análise calculada sobre as 48 transações da captura Plaid.

## O que a aplicação publicada realmente executa

A aplicação publicada tem uma integração de dados própria com a **Pluggy Sandbox API**:

1. `POST /api/webhooks/pluggy` valida a notificação.
2. O servidor consulta contas e transações pela API Pluggy.
3. `lib/pluggy-adapter.ts` normaliza os registros.
4. O snapshot é salvo em `finance_snapshots` no Supabase.
5. `GET /api/sandbox`, `GET /api/insights` e `POST /api/core` leem esse snapshot.

O chat atual usa regras determinísticas em `lib/core-engine.ts`. Ele não chama LLM nem executa ferramentas MCP em tempo de execução. Os MCPs são práticas do ambiente de desenvolvimento; a integração Pluggy do app publicado é uma camada separada.

O projeto não contém, nesta branch, um servidor MCP Plaid configurado/versionado nem chamadas de runtime para `/accounts/get` ou `/transactions/get`. As credenciais do MCP devem permanecer na configuração local do cliente MCP; não devem ser adicionadas ao `.env.example` do app Pluggy nem ao Git.

### Mudança em relação ao escopo inicial

O brief salvo em `docs/prompt-v0.md` e `docs/prompt-lovable.md` descreve Pluggy Docs MCP e Plaid Sandbox MCP como fontes de aprendizado/dados da experiência inicial. O guia do instrutor prevê uma etapa de backend com a API Plaid Sandbox. A implementação atual escolheu Pluggy Sandbox API para a integração efetiva do dashboard e do chat.

Essa escolha é uma evolução arquitetural do projeto, mas **não comprova a implementação Plaid da etapa P07 dentro do app**. Não é necessário migrar o app para Plaid apenas para demonstrar a prática MCP, desde que a separação esteja clara na entrega.

## Evidências novas e próximo fechamento

As capturas locais `a1` a `a4` agora documentam a conexão dos servidores, a consulta Pluggy, a criação do Item Plaid e a listagem das contas/saldos. Os arquivos `a1`–`a4` foram selecionados para inclusão no repositório; não contêm credenciais visíveis.

O script `scripts/plaid-p07-report.mjs` foi executado com sucesso no Plaid Sandbox, chamando `POST /accounts/get` e `POST /transactions/get`, cobrindo 90 dias (2026-08-11 a 2026-11-09) e percorrendo toda a paginação. Resultado: 3 contas, 34 transações recuperadas em 1 página, cinco transações recentes com `account_name` preenchido e padrões de gastos (top categorias, por período e por conta). Relatório sanitizado salvo em `evidencias/plaid-p07-report.json` (sem credenciais, account_ids ou tokens).

Também falta manter a captura do chat publicado na versão Pluggy atual, em BRL e com aviso de dados fictícios.

## Capturas que não devem ser misturadas

- `evidencias/app-core-finance-conversa-gastos-categoria.png` é uma captura antiga em US$ e com dados de demonstração anteriores. Não é evidência da versão Pluggy Sandbox atual em BRL.
- `evidencias/pluggy-sandbox-dashboard.png`, `pluggy-sandbox-contas-saldos.png`, `pluggy-sandbox-transacoes.png` e `pluggy-sandbox-chat.png` são as capturas da aplicação Pluggy atual. Elas comprovam o estado visual do app, não a execução dos MCPs Plaid/Pluggy.

## Referências do próprio projeto

- Guia do instrutor: páginas 6–10 (Pluggy MCP), 14–17 (Plaid MCP e Item), 19–22 (P07 e padrões), 25–28 (especificação do app).
- Slides: páginas 7–19.
- Prompts e especificações: `docs/prompt-v0.md`, `docs/prompt-lovable.md`.
- Integração publicada: `lib/pluggy.ts`, `lib/pluggy-adapter.ts`, `app/api/webhooks/pluggy/route.ts`, `app/api/core/route.ts`.
