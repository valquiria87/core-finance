# Tabela de padrões de gasto — exemplo sintético

> **Exemplo didático, não extraído da Plaid Sandbox nem de uma conta bancária real.** As transações abaixo foram criadas manualmente apenas para demonstrar os agrupamentos por categoria, período e conta. Os resultados não representam dados reais do dashboard.

Na convenção de valores usada neste exemplo (compatível com a Plaid), valor positivo representa saída e valor negativo representa entrada. Todos os valores estão em USD.

## Dados-base fictícios

| Data | Descrição | Categoria | Conta | Valor (USD) |
|---|---|---|---|---:|
| 2026-10-01 | Supermercado X | Alimentação | Conta Corrente | 120.00 |
| 2026-10-03 | Farmácia Y | Saúde | Conta Corrente | 45.50 |
| 2026-10-05 | Uber | Transporte | Cartão de Crédito | 18.90 |
| 2026-10-08 | Restaurante Z | Alimentação | Cartão de Crédito | 62.00 |
| 2026-10-12 | Aluguel | Moradia | Conta Corrente | 900.00 |
| 2026-10-15 | Cinema | Lazer | Cartão de Crédito | 35.00 |
| 2026-10-18 | Gasolina | Transporte | Cartão de Crédito | 70.00 |
| 2026-10-22 | Salário | Renda | Conta Corrente | -2500.00 |

## Padrão 1 — gasto por categoria

O total de saídas do exemplo é **US$ 1.251,40**. A participação percentual é calculada dividindo o total da categoria pelo total de saídas.

| Categoria | Total gasto (USD) | % do gasto total |
|---|---:|---:|
| Moradia | 900.00 | 71.9% |
| Alimentação | 182.00 | 14.5% |
| Transporte | 88.90 | 7.1% |
| Saúde | 45.50 | 3.6% |
| Lazer | 35.00 | 2.8% |
| **Total gasto** | **1251.40** | **100.0%*** |

*A soma dos percentuais individuais pode resultar em 99,9% devido ao arredondamento para uma casa decimal.*

O salário é uma entrada (valor negativo) e, portanto, não compõe o total de gastos.

## Padrão 2 — gasto por período

Os valores são agrupados pelos intervalos de dias indicados. Períodos sem transações de saída também são exibidos com zero.

| Período | Total gasto (USD) |
|---|---:|
| Semana 1 (01–07) | 184.40 |
| Semana 2 (08–14) | 962.00 |
| Semana 3 (15–21) | 105.00 |
| Semana 4 (22–31) | 0.00 |
| **Total** | **1251.40** |

## Padrão 3 — gasto por conta

| Conta | Total gasto (USD) | Total recebido (USD) |
|---|---:|---:|
| Conta Corrente | 1065.50 | 2500.00 |
| Cartão de Crédito | 185.90 | 0.00 |
| **Total** | **1251.40** | **2500.00** |

## Como reproduzir no assistente

1. Consulte as transações do Item de sandbox da Plaid.
2. Agrupe as transações por categoria, semana e conta.
3. Considere valores positivos como saídas e valores negativos como entradas.
4. Exclua transferências internas e pagamentos de dívida dos indicadores de consumo, para evitar dupla contagem.
5. Identifique separadamente a fatura de cartão; ela representa dívida, não dinheiro disponível.

## Limitação deste exemplo

Esta tabela demonstra a lógica dos agrupamentos com dados inventados. Para apresentar padrões reais do aplicativo, é necessário executar os mesmos cálculos sobre as transações efetivamente retornadas pela Plaid Sandbox, no período selecionado. Não use estes números como evidência de integração ou de dados reais.
