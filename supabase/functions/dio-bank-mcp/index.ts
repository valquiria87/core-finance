/// <reference lib="deno.ns" />
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

type PluggyAccount = { id: string; currencyCode?: string };
type PluggyTransaction = {
  accountId: string; date: string; amount: number; type: string;
  currencyCode?: string;
  category?: string | { description?: string; name?: string };
};
type MonthlyTotals = {
  month: string;
  transactions: number;
  byCurrency: Record<string, { income: number; expenses: number; net: number; count: number }>;
  expensesByCategory: Record<string, Record<string, number>>;
};

export function summarizeTransactions(
  transactions: PluggyTransaction[], accounts: PluggyAccount[], month: string,
): MonthlyTotals {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mês inválido. Use YYYY-MM.");
  const currencies = new Map(accounts.map((account) => [account.id, account.currencyCode]));
  const result: MonthlyTotals = { month, transactions: 0, byCurrency: {}, expensesByCategory: {} };

  for (const transaction of transactions) {
    if (!transaction.date?.startsWith(month) || !Number.isFinite(transaction.amount)) continue;
    const type = String(transaction.type ?? "").toUpperCase();
    if (type !== "CREDIT" && type !== "DEBIT") continue;
    const currency = transaction.currencyCode || currencies.get(transaction.accountId) || "UNKNOWN";
    const bucket = result.byCurrency[currency] ??= { income: 0, expenses: 0, net: 0, count: 0 };
    const amount = Math.abs(transaction.amount);
    bucket.count += 1;
    result.transactions += 1;
    if (type === "CREDIT") {
      bucket.income += amount;
      bucket.net += amount;
    } else {
      bucket.expenses += amount;
      bucket.net -= amount;
      const value = transaction.category;
      const category = typeof value === "string" ? value : value?.description || value?.name || "Sem categoria";
      const categories = result.expensesByCategory[currency] ??= {};
categories[category] = (categories[category] || 0) + amount;
    }
  }
  return result;
}

function safeTokenMatch(provided: string, expected: string): boolean {
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected);
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

async function getPluggyApiKey(): Promise<string> {
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Credenciais Pluggy não configuradas.");
  const response = await fetch("https://api.pluggy.ai/auth", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!response.ok) throw new Error(`Falha na autenticação Pluggy (HTTP ${response.status}).`);
  const payload = await response.json();
  if (typeof payload.apiKey !== "string" || !payload.apiKey) throw new Error("API Key Pluggy inválida.");
  return payload.apiKey;
}

async function loadPluggyMonthlyData(month: string): Promise<MonthlyTotals> {
  const itemId = Deno.env.get("PLUGGY_ITEM_ID");
  if (!itemId) throw new Error("PLUGGY_ITEM_ID não configurado.");
  const headers = { "X-API-KEY": await getPluggyApiKey() };
  const accountsUrl = new URL("https://api.pluggy.ai/accounts");
  accountsUrl.searchParams.set("itemId", itemId);
  const accountsResponse = await fetch(accountsUrl, { headers });
  if (!accountsResponse.ok) throw new Error(`Falha ao consultar contas Pluggy (HTTP ${accountsResponse.status}).`);
  const accountsPayload = await accountsResponse.json();
  if (!Array.isArray(accountsPayload.results)) throw new Error("Resposta de contas Pluggy inválida.");
  const accounts = accountsPayload.results as PluggyAccount[];
  const transactions: PluggyTransaction[] = [];

  for (const account of accounts) {
    let url = new URL("https://api.pluggy.ai/v2/transactions");
    url.searchParams.set("accountId", account.id);
    let pages = 0;
    while (true) {
      if (++pages > 100) throw new Error("Limite de paginação Pluggy excedido.");
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Falha ao consultar transações Pluggy (HTTP ${response.status}).`);
      const payload = await response.json();
      if (!Array.isArray(payload.results)) throw new Error("Resposta de transações Pluggy inválida.");
      transactions.push(...payload.results as PluggyTransaction[]);
      if (payload.next == null) break;
      if (typeof payload.next !== "string" || !payload.next.startsWith("?")) {
        throw new Error("Cursor de paginação Pluggy inválido.");
      }
      url = new URL(payload.next, "https://api.pluggy.ai/v2/transactions");
    }
  }
  return summarizeTransactions(transactions, accounts, month);
}

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "dio-bank-mcp", version: "1.0.0" });
  server.registerTool("resumo_mensal", {
    title: "Resumo financeiro mensal",
    description: "Entradas, saídas, saldo líquido e despesas por categoria da Pluggy Sandbox.",
    inputSchema: { month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM") },
  }, async ({ month }: { month: string }) => {
    try {
      const summary = await loadPluggyMonthlyData(month);
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao gerar resumo mensal.";
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  });
  return server;
}

if (import.meta.main) {
  Deno.serve(async (request: Request) => {
    const expected = Deno.env.get("MCP_TOKEN") || "";
    const authorization = request.headers.get("authorization") || "";
    const provided = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (!expected || !provided || !safeTokenMatch(provided, expected)) {
      return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (request.method !== "POST") {
      return new Response("Use POST with MCP Streamable HTTP.", {
        status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" },
      });
    }
    try {
      const server = createMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});
      await server.connect(transport);
      return await transport.handleRequest(request);
    } catch (error) {
      console.error("dio-bank-mcp request failed", error);
      return new Response("MCP request failed.", { status: 500, headers: { "Cache-Control": "no-store" } });
    }
  });
}
