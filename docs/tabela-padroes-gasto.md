# Tabela de 3 padrões de gasto (dados de exemplo fictícios)

> Dados de exemplo da Plaid Sandbox. Valor positivo = saída de dinheiro (débito); valor negativo = entrada.

## Dados base (transações fictícias)

| Data | Descrição | Categoria | Conta | Valor (USD) |
|---|---|---|---|---:|
| 2026-10-01 | Supermercado X | Alimentação | Conta Corrente | 120.00 |
| 2026-10-03 | Farmácia Y | Saúde | Conta Corrente | 45.50 |
| 2026-10-05 | Uber | Transporte | Cartão Crédito | 18.90 |
| 2026-10-08 | Restaurante Z | Alimentação | Cartão Crédito | 62.00 |
| 2026-10-12 | Aluguel | Moradia | Conta Corrente | 900.00 |
| 2026-10-15 | Cinema | Lazer | Cartão Crédito | 35.00 |
| 2026-10-18 | Gasolina | Transporte | Cartão Crédito | 70.00 |
| 2026-10-22 | Salário | Renda | Conta Corrente | -2500.00 |

## Padrão 1 — Gasto por categoria

| Categoria | Total gasto (USD) | % do gasto total |
|---|---:|---:|
| Moradia | 900.00 | 71.9% |
| Alimentação | 182.00 | 14.5% |
| Transporte | 88.90 | 7.1% |
| Saúde | 45.50 | 3.6% |
| Lazer | 35.00 | 2.8% |
| **Total gasto** | **1251.40** | **100.0%** |

Observação: salário é entrada (valor negativo), por isso não entra no denominador dos gastos. Os percentuais são calculados sobre a soma das despesas (US$ 1.251,40), excluindo a renda.

## Padrão 2 — Gasto por período (semana)

| Período | Total gasto (USD) |
|---|---:|
| Semana 1 (01–07) | 184.40 |
| Semana 2 (08–14) | 962.00 |
| Semana 3 (15–21) | 105.00 |
| Semana 4 (22–31) | 0.00 |
| **Total gasto** | **1251.40** |

A compra de gasolina, em 18/10, pertence à semana 3 (15–21), junto com o cinema (15/10).

## Padrão 3 — Gasto por conta

| Conta | Total gasto (USD) | Total recebido (USD) |
|---|---:|---:|
| Conta Corrente | 1065.50 | 2500.00 |
| Cartão Crédito | 185.90 | 0.00 |
| **Total** | **1251.40** | **2500.00** |

## Como reproduzir no seu assistente

1. Consulte as transações do Item de Sandbox pelo MCP da Plaid.
2. Agrupe por categoria, semana e conta (account_id).
3. Trate valor positivo como saída e valor negativo como entrada.
4. Para cartão, rotule o saldo como "fatura em aberto", não como saldo de conta.

## Observação sobre cartão

O saldo de cartão de crédito representa dívida (valor devido), não dinheiro disponível. Mostre limite e crédito disponível separadamente.
