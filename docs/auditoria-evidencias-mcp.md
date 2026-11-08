# Auditoria das evidências MCP e Plaid Sandbox

Esta auditoria separa o que está visível no repositório, o que o guia do instrutor registra como execução histórica e o que ainda precisa de uma captura própria para uma avaliação reproduzível. Não trata uma resposta formatada pelo assistente como substituta automática de um log de chamada à ferramenta ou à API.

## Como ler os estados

- **Com evidência visual:** há uma captura que mostra a resposta ou o resultado relevante.
- **Parcial:** há evidência de conteúdo, mas falta comprovar a conexão, a chamada de ferramenta, o endpoint ou algum detalhe exigido.
- **Não comprovado no repositório:** não foi encontrada captura ou arquivo que permita auditar a etapa. Isso não afirma que a etapa nunca foi executada localmente.

## Matriz P01–P07 e análise de padrões

| Etapa | O que o desafio pede | Evidência encontrada | Estado e lacuna |
|---|---|---|---|
| P01 — Pluggy MCP | Conectar ao servidor remoto e obter uma resposta real da documentação. | `evidencias/pluggy-docs-mcp-endpoints-transactions.png` e capturas complementares de endpoints. | **Parcial.** As capturas mostram pedidos feitos ao Pluggy Docs e respostas com fontes. Não há captura de `/mcp` mostrando o servidor ativo nem registro visível da chamada de ferramenta. |
| P02 — conceitos | Explicar Pluggy, Item, conta e transação, com fontes. | `evidencias/pluggy-docs-mcp-conceito-pluggy-item.png` e `evidencias/pluggy-docs-mcp-conceitos-connector-item-product.png`. | **Com evidência visual.** As respostas exibem explicações e links de documentação. A captura do estado da conexão MCP continua ausente. |
| P03 — endpoints e paginação | Listar endpoints de transações, distinguir versão atual e legada e explicar cursor. | `evidencias/pluggy-docs-mcp-endpoints-transactions.png`, `...-legado-retrieve-categoria.png`, `pluggy-endpoint-transactions-v2-get.png`, `pluggy-endpoint-transactions-v2-parametros.png` e `pluggy-endpoint-transactions-legado-migracao-v2.png`. | **Boa evidência visual.** O material mostra a referência atual `GET /v2/transactions`, a rota legada e parâmetros. Para uma trilha auditável completa, ainda faltaria a captura da chamada da ferramenta. |
| P04 — aprofundamento opcional | Detalhar método, caminho, autenticação, parâmetros e continuação por cursor. | `evidencias/pluggy-docs-mcp-referencia-transaction-autenticacao.png` e capturas da referência v2/legada. | **Evidência visual parcial/forte para referência.** O PDF marca P04 como aprofundamento opcional. |
| P05 — Plaid MCP | Confirmar que o servidor local Plaid está ativo e que suas ferramentas respondem. | Não há captura específica do comando `/mcp` com o servidor Plaid ativo nem da execução de P05 no repositório. | **Não comprovado no repositório.** As capturas de resultado Plaid não substituem o teste explícito do servidor. |
| P06 — criar Item | Usar o MCP Plaid para criar Item Sandbox com produto `transactions` e obter o token. | O guia do instrutor registra que `get_sandbox_access_token` criou um Item e obteve token naquela execução histórica. Ele também registra que a instituição usada não foi confirmada. As capturas Plaid do projeto não mostram o resultado específico da criação do Item. | **Não comprovado para a execução mostrada nas capturas do projeto.** É necessário registrar a resposta sanitizada da criação, sem token, confirmando produto e instituição somente quando realmente verificados. |
| P07 — consultar dados | Chamar `POST /accounts/get` e `POST /transactions/get` no Sandbox, cobrir 90 dias e toda a paginação, mostrar contas, cinco transações e até três observações. | `evidencias/plaid-sandbox-contas-saldos.png`, `evidencias/plaid-sandbox-contas-transacoes-categorias.png` e `evidencias/plaid-sandbox-transacoes-convencao-sinais.png`. | **Resultado visual presente; prova técnica incompleta.** As capturas mostram 14 contas, 48 transações, cinco registros recentes, categorias e a convenção de sinais. Não mostram os pedidos HTTP, os endpoints, os parâmetros `count`/`offset`, `total_transactions` ou o percurso de todas as páginas. |

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

## Evidências adicionais necessárias para fechar a trilha

1. **Uma captura de `/mcp`** em uma conversa nova mostrando Pluggy e Plaid ativos. Não mostre tela de configuração com credenciais.
2. **Uma captura do P06** mostrando que a ferramenta criou o Item Sandbox e obteve token. O token deve estar totalmente oculto; a instituição só deve ser citada se confirmada na resposta ou em consulta verificável.
3. **Uma captura técnica do P07** identificando `POST /accounts/get` e `POST /transactions/get`, datas efetivamente consultadas, `total_transactions`, contagem de páginas e total recuperado. O token e os segredos devem permanecer ocultos.
4. **A resposta de padrões da mesma consulta Plaid**, com três observações rastreáveis a categoria, quantidade de registros e total.
5. **A captura do chat publicado** deve ser da versão Pluggy atual, com moeda BRL e indicação de dados fictícios.

## Capturas que não devem ser misturadas

- `evidencias/app-core-finance-conversa-gastos-categoria.png` é uma captura antiga em US$ e com dados de demonstração anteriores. Não é evidência da versão Pluggy Sandbox atual em BRL.
- `evidencias/pluggy-sandbox-dashboard.png`, `pluggy-sandbox-contas-saldos.png`, `pluggy-sandbox-transacoes.png` e `pluggy-sandbox-chat.png` são as capturas da aplicação Pluggy atual. Elas comprovam o estado visual do app, não a execução dos MCPs Plaid/Pluggy.

## Referências do próprio projeto

- Guia do instrutor: páginas 6–10 (Pluggy MCP), 14–17 (Plaid MCP e Item), 19–22 (P07 e padrões), 25–28 (especificação do app).
- Slides: páginas 7–19.
- Prompts e especificações: `docs/prompt-v0.md`, `docs/prompt-lovable.md`.
- Integração publicada: `lib/pluggy.ts`, `lib/pluggy-adapter.ts`, `app/api/webhooks/pluggy/route.ts`, `app/api/core/route.ts`.
