# Tabela de 3 padroes de gasto (dados de exemplo ficticios)

> Dados de exemplo (sandbox). Na Plaid, valor positivo = saida de dinheiro (debito).

## Dados base (transacoes ficticias)

| Data | Descricao | Categoria | Conta | Valor (USD) |
|---|---|---|---|---:|
| 2026-10-01 | Supermercado X | Alimentacao | Conta Corrente | 120.00 |
| 2026-10-03 | Farmacia Y | Saude | Conta Corrente | 45.50 |
| 2026-10-05 | Uber | Transporte | Cartao Credito | 18.90 |
| 2026-10-08 | Restaurante Z | Alimentacao | Cartao Credito | 62.00 |
| 2026-10-12 | Aluguel | Moradia | Conta Corrente | 900.00 |
| 2026-10-15 | Cinema | Lazer | Cartao Credito | 35.00 |
| 2026-10-18 | Gasolina | Transporte | Cartao Credito | 70.00 |
| 2026-10-22 | Salario | Renda | Conta Corrente | -2500.00 |

## Padrao 1 - Gasto por categoria

| Categoria | Total gasto (USD) | % do gasto total |
|---|---:|---:|
| Moradia | 900.00 | 63.9% |
| Alimentacao | 182.00 | 12.9% |
| Transporte | 88.90 | 6.3% |
| Saude | 45.50 | 3.2% |
| Lazer | 35.00 | 2.5% |
| Total gasto | 1251.40 | 100% |

Observacao: "Salario" e renda (valor negativo), por isso nao entra no gasto.

## Padrao 2 - Gasto por periodo (semana)

| Periodo | Total gasto (USD) |
|---|---:|
| Semana 1 (01-07) | 184.40 |
| Semana 2 (08-14) | 962.00 |
| Semana 3 (15-21) | 35.00 |
| Semana 4 (22-31) | 70.00 |

## Padrao 3 - Gasto por conta

| Conta | Total gasto (USD) | Total recebido (USD) |
|---|---:|---:|
| Conta Corrente | 1065.50 | 2500.00 |
| Cartao Credito | 185.90 | 0.00 |

## Como reproduzir no seu assistente

1. Chame a tool de transacoes do MCP da Plaid para o Item de sandbox.
2. Peca a IA para agrupar por `category`, por semana e por `account_id`.
3. Lembre a IA de tratar valor positivo como saida e valor negativo como entrada.
4. Para cartao, rotule o saldo como "fatura em aberto", nao como "saldo".

## Observacao sobre cartao

O saldo de cartao de credito aparece como divida (valor devido), nao como dinheiro disponivel.
Mostre limite e disponivel separadamente para evitar confusao.
