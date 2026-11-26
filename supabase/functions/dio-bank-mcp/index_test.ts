import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.14";
import { summarizeTransactions } from "./index.ts";

Deno.test("resumo mensal separa entradas, saídas e categorias", () => {
  const result = summarizeTransactions(
    [
      { accountId: "a1", date: "2026-11-03", amount: 1200, type: "CREDIT", currencyCode: "BRL" },
      { accountId: "a1", date: "2026-11-05", amount: 100, type: "DEBIT", currencyCode: "BRL", category: "Alimentação" },
      { accountId: "a1", date: "2026-10-31", amount: 50, type: "DEBIT", currencyCode: "BRL", category: "Transporte" },
      { accountId: "a1", date: "2026-11-09", amount: 30, type: "DEBIT", currencyCode: "BRL", category: "Transporte" },
    ],
    [{ id: "a1", currencyCode: "BRL" }],
    "2026-11",
  );

  assertEquals(result.transactions, 3);
  assertEquals(result.byCurrency.BRL.income, 1200);
  assertEquals(result.byCurrency.BRL.expenses, 130);
  assertEquals(result.byCurrency.BRL.net, 1070);
  assertEquals(result.expensesByCategory, {
  BRL: { Alimentação: 100, Transporte: 30 },
});
});

Deno.test("resumo mensal não soma moedas diferentes", () => {
  const result = summarizeTransactions(
    [
      { accountId: "br", date: "2026-11-01", amount: 100, type: "DEBIT", currencyCode: "BRL" },
      { accountId: "us", date: "2026-11-02", amount: 20, type: "DEBIT", currencyCode: "USD" },
    ],
    [],
    "2026-11",
  );

  assertEquals(result.byCurrency.BRL.expenses, 100);
  assertEquals(result.byCurrency.USD.expenses, 20);
});

Deno.test("rejeita mês fora do formato YYYY-MM", () => {
  assertThrows(
    () => summarizeTransactions([], [], "novembro/2026"),
    Error,
    "Mês inválido",
  );
});
Deno.test("despesas por categoria permanecem separadas por moeda", () => {
  const result = summarizeTransactions(
    [
      {
        accountId: "br",
        date: "2026-11-01",
        amount: 100,
        type: "DEBIT",
        currencyCode: "BRL",
        category: "Alimentação",
      },
      {
        accountId: "us",
        date: "2026-11-02",
        amount: 20,
        type: "DEBIT",
        currencyCode: "USD",
        category: "Alimentação",
      },
    ],
    [],
    "2026-11",
  );

  assertEquals(result.expensesByCategory.BRL["Alimentação"], 100);
  assertEquals(result.expensesByCategory.USD["Alimentação"], 20);
});