# Servidor MCP remoto DIO Bank

Implementação local da Edge Function `dio-bank-mcp`, separada do MCP interno usado pelo chat Next.js.

## O que faz

- Endpoint MCP Streamable HTTP em `/functions/v1/dio-bank-mcp`.
- Ferramenta somente leitura `resumo_mensal`, com argumento `month` no formato `YYYY-MM`.
- Consulta contas e transações da Pluggy Sandbox, percorre a paginação e agrega entradas, saídas, saldo líquido e despesas por categoria.
- Mantém valores separados por moeda; não converte moedas.
- Exige `Authorization: Bearer <MCP_TOKEN>`. O token é validado pela função e não deve ser enviado em URL, query string, logs ou código cliente.

## Segredos da Edge Function

Configurar somente no ambiente de secrets do Supabase (não no `.env.local`, frontend ou Git):

- `MCP_TOKEN`
- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_ITEM_ID`

O projeto deve usar um Item Pluggy Sandbox. A função não usa credenciais Plaid e não lê a tabela Supabase `finance_snapshots`; consulta a API Pluggy diretamente.

## Testes locais

Com Deno 2 instalado:

```bash
deno test --config supabase/functions/dio-bank-mcp/deno.json --allow-env --allow-net supabase/functions/dio-bank-mcp/index_test.ts
deno check --config supabase/functions/dio-bank-mcp/deno.json supabase/functions/dio-bank-mcp/index.ts
```

Para servir localmente, é necessário instalar Docker e Supabase CLI, iniciar o stack local e configurar os secrets locais antes de executar a função.

## Deploy — não executado

O deploy exige confirmação explícita, Project Ref correto e secrets configurados no projeto Supabase:

```bash
supabase functions deploy --no-verify-jwt dio-bank-mcp
```

A opção `--no-verify-jwt` é necessária para que a função valide o token MCP próprio. A proteção efetiva é o cabeçalho Bearer validado pela aplicação. Não desabilitar a validação sem manter `MCP_TOKEN` forte e secreto.

Endpoint após deploy:

```
https://<PROJECT_REF>.supabase.co/functions/v1/dio-bank-mcp
```

## Teste HTTP

Exemplo de inicialização MCP (substitua URL e token no terminal local; não salve valores reais no repositório):

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/dio-bank-mcp" \
  -H "Authorization: Bearer <MCP_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Para chamar a ferramenta, use `method: tools/call`, `params.name: resumo_mensal` e `params.arguments.month: YYYY-MM`.

## Limitações

- A ferramenta é somente leitura e usa dados Sandbox.
- A API Pluggy deve retornar tipos de transação `CREDIT` e `DEBIT`; registros com outro tipo são ignorados para evitar classificação financeira incorreta.
- O endpoint ainda não foi implantado nem testado contra um projeto Supabase remoto.
- A integração MCP interna do chat permanece independente e inalterada.
